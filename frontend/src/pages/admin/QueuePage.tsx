import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AlertOctagon, ChevronLeft, ChevronRight, Clock, Inbox, Loader2, Search, Sparkles, UserX, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { CategoryBadge, PriorityBadge, SlaBadge, StatusBadge } from '@/components/badges'
import { PageHeader, RelativeTime } from '@/components/common'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CATEGORIES, CATEGORY_META, PRIORITIES, PRIORITY_META, STATUSES, STATUS_META } from '@/lib/constants'
import { ticketsApi, type TicketQuery } from '@/lib/endpoints'
import { initials } from '@/lib/format'
import type { AdminTicket } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

const VIEWS = {
  attention: { label: 'Needs attention', query: { status: 'OPEN,IN_PROGRESS' } },
  mine: { label: 'Assigned to me', query: { status: 'OPEN,IN_PROGRESS', assigned: 'me' } },
  unassigned: { label: 'Unassigned', query: { status: 'OPEN,IN_PROGRESS', assigned: 'unassigned' } },
  all: { label: 'All tickets', query: { ordering: '-created_at' } },
} as const
type ViewKey = keyof typeof VIEWS

const DATE_RANGES: Record<string, { label: string; days: number }> = {
  '1': { label: 'Last 24 hours', days: 1 },
  '7': { label: 'Last 7 days', days: 7 },
  '30': { label: 'Last 30 days', days: 30 },
}

const ANY = 'any'
const FILTER_KEYS = ['status', 'category', 'priority', 'sla', 'range', 'q'] as const

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string | null
  onChange: (v: string | null) => void
  placeholder: string
  options: { value: string; label: string }[]
}) {
  return (
    <Select value={value ?? ANY} onValueChange={(v) => onChange(v === ANY ? null : v)}>
      <SelectTrigger size="sm" className={cn('w-auto min-w-32', value && 'border-primary/50 bg-accent/40')}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{placeholder}: any</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function KpiCard({ label, value, icon: Icon, tone, onClick, active }: {
  label: string
  value: number | undefined
  icon: typeof Inbox
  tone: string
  onClick: () => void
  active: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-card p-3.5 text-left transition-colors hover:border-primary/40',
        active && 'border-primary ring-1 ring-primary/30',
      )}
    >
      <div className={cn('flex size-9 items-center justify-center rounded-lg', tone)}>
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-xl font-semibold leading-none">{value ?? '–'}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </button>
  )
}

function TicketTableRow({ ticket, selected, onOpen }: { ticket: AdminTicket; selected: boolean; onOpen: () => void }) {
  const overdue = ticket.sla_state === 'overdue'
  return (
    <tr
      onClick={onOpen}
      className={cn(
        'cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/50',
        selected && 'bg-accent/40',
        overdue && 'shadow-[inset_3px_0_0_0_var(--color-red-500)]',
      )}
    >
      <td className="py-3 pr-2 pl-4 align-top">
        <PriorityBadge priority={ticket.priority} source={ticket.priority_source} />
      </td>
      <td className="max-w-0 py-3 pr-4 align-top">
        <div className="flex items-center gap-1.5">
          {ticket.has_unread && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="New author activity" />}
          <p className={cn('truncate text-sm', ticket.has_unread ? 'font-semibold' : 'font-medium')}>{ticket.subject}</p>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {ticket.reference} · {ticket.author.name} · {ticket.book ? ticket.book.title : 'General'}
        </p>
      </td>
      <td className="py-3 pr-4 align-top">
        {ticket.ai_status === 'PENDING' && ticket.category_source !== 'ADMIN' ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs text-violet-700">
            <Loader2 className="size-3 animate-spin" /> Classifying
          </span>
        ) : (
          <div className="flex flex-col items-start gap-1">
            <CategoryBadge category={ticket.category} source={ticket.category_source} short />
            {ticket.ai_status === 'FAILED' && ticket.category_source === 'FALLBACK' && (
              <span className="text-[11px] text-amber-700">Needs triage</span>
            )}
          </div>
        )}
      </td>
      <td className="py-3 pr-4 align-top">
        <StatusBadge status={ticket.status} />
      </td>
      <td className="py-3 pr-4 align-top">
        <SlaBadge state={ticket.sla_state} dueAt={ticket.sla_due_at} />
      </td>
      <td className="py-3 pr-4 align-top text-xs text-muted-foreground">
        <RelativeTime value={ticket.created_at} />
      </td>
      <td className="py-3 pr-4 align-top">
        {ticket.assigned_to ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="size-7">
                <AvatarFallback className="bg-accent text-[10px] font-medium text-accent-foreground">
                  {initials(ticket.assigned_to.full_name)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>{ticket.assigned_to.full_name}</TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-xs text-muted-foreground">Unassigned</span>
        )}
      </td>
    </tr>
  )
}

export function QueuePage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const refetchInterval = useFallbackInterval()
  const view: ViewKey = (params.get('view') as ViewKey) in VIEWS ? (params.get('view') as ViewKey) : 'attention'
  const page = Number(params.get('page') ?? 1)
  const [search, setSearch] = useState(params.get('q') ?? '')
  const [selected, setSelected] = useState(0)

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get('q') ?? '') !== search) setParam('q', search.trim() || null)
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const query: TicketQuery = useMemo(() => {
    const q: TicketQuery = { ...VIEWS[view].query, page }
    for (const key of ['status', 'category', 'priority', 'sla', 'q'] as const) {
      const v = params.get(key)
      if (v) q[key] = v
    }
    const range = params.get('range')
    if (range && DATE_RANGES[range]) {
      q.created_after = new Date(Date.now() - DATE_RANGES[range].days * 86400_000).toISOString()
    }
    return q
  }, [params, view, page])

  const stats = useQuery({ queryKey: ['stats'], queryFn: ticketsApi.stats, refetchInterval })
  const list = useQuery({
    queryKey: ['tickets', 'admin', query],
    queryFn: () => ticketsApi.listAdmin(query),
    placeholderData: keepPreviousData,
    refetchInterval,
  })
  const tickets = list.data?.results ?? []
  const activeFilters = FILTER_KEYS.filter((k) => params.get(k))

  useEffect(() => setSelected(0), [query])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return
      if (e.key === 'j') setSelected((s) => Math.min(s + 1, tickets.length - 1))
      if (e.key === 'k') setSelected((s) => Math.max(s - 1, 0))
      if (e.key === 'Enter' && tickets[selected]) navigate(`/admin/tickets/${tickets[selected].id}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tickets, selected, navigate])

  const applyKpi = (next: Record<string, string>) => {
    const p = new URLSearchParams(next)
    setSearch('')
    setParams(p, { replace: true })
  }

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.count / 25)) : 1

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Ticket queue"
        description="Most urgent first, then oldest. Press J / K to move, Enter to open."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Open tickets" value={stats.data ? stats.data.open + stats.data.in_progress : undefined} icon={Inbox} tone="bg-sky-50 text-sky-700" onClick={() => applyKpi({})} active={view === 'attention' && !activeFilters.length} />
        <KpiCard label="Unassigned" value={stats.data?.unassigned} icon={UserX} tone="bg-zinc-100 text-zinc-700" onClick={() => applyKpi({ view: 'unassigned' })} active={view === 'unassigned'} />
        <KpiCard label="Overdue first reply" value={stats.data?.overdue} icon={Clock} tone="bg-red-50 text-red-700" onClick={() => applyKpi({ sla: 'overdue' })} active={params.get('sla') === 'overdue'} />
        <KpiCard label="Critical open" value={stats.data?.critical} icon={AlertOctagon} tone="bg-orange-50 text-orange-700" onClick={() => applyKpi({ priority: 'CRITICAL' })} active={params.get('priority') === 'CRITICAL'} />
      </div>

      <div className="rounded-xl border bg-card">
        <div className="flex flex-col gap-3 border-b p-3 lg:flex-row lg:items-center">
          <Tabs value={view} onValueChange={(v) => applyKpi(v === 'attention' ? {} : { view: v })}>
            <TabsList>
              {Object.entries(VIEWS).map(([key, v]) => (
                <TabsTrigger key={key} value={key}>
                  {v.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative lg:ml-auto lg:w-72">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subject, author, book, TKT-0001"
              className="h-8 pl-8"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5">
          <FilterSelect value={params.get('status')} onChange={(v) => setParam('status', v)} placeholder="Status" options={STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label }))} />
          <FilterSelect value={params.get('priority')} onChange={(v) => setParam('priority', v)} placeholder="Priority" options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label }))} />
          <FilterSelect value={params.get('category')} onChange={(v) => setParam('category', v)} placeholder="Category" options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_META[c].label }))} />
          <FilterSelect value={params.get('sla')} onChange={(v) => setParam('sla', v)} placeholder="SLA" options={[{ value: 'overdue', label: 'Overdue' }, { value: 'at_risk', label: 'Due soon' }]} />
          <FilterSelect value={params.get('range')} onChange={(v) => setParam('range', v)} placeholder="Created" options={Object.entries(DATE_RANGES).map(([value, r]) => ({ value, label: r.label }))} />
          {activeFilters.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => applyKpi(view === 'attention' ? {} : { view })}>
              <X /> Clear filters
            </Button>
          )}
          {list.isFetching && !list.isLoading && <Loader2 className="ml-auto size-4 animate-spin text-muted-foreground" />}
        </div>

        {list.isLoading ? (
          <div className="p-3">
            <ListSkeleton rows={6} />
          </div>
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} className="m-3" />
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={activeFilters.length ? Search : Sparkles}
            title={activeFilters.length ? 'No tickets match these filters' : view === 'mine' ? 'Nothing assigned to you' : 'Queue is clear'}
            description={activeFilters.length ? 'Try removing a filter or searching for something else.' : 'New tickets will appear here instantly.'}
            className="m-3 border-0"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] table-fixed text-left">
              <colgroup>
                <col className="w-28" />
                <col />
                <col className="w-36" />
                <col className="w-28" />
                <col className="w-32" />
                <col className="w-24" />
                <col className="w-24" />
              </colgroup>
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="py-2 pr-2 pl-4 font-medium">Priority</th>
                  <th className="py-2 pr-4 font-medium">Ticket</th>
                  <th className="py-2 pr-4 font-medium">Category</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">First reply SLA</th>
                  <th className="py-2 pr-4 font-medium">Age</th>
                  <th className="py-2 pr-4 font-medium">Owner</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t, i) => (
                  <TicketTableRow key={t.id} ticket={t} selected={i === selected} onOpen={() => navigate(`/admin/tickets/${t.id}`)} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {list.data && list.data.count > 25 && (
          <div className="flex items-center justify-between border-t px-4 py-2.5 text-sm text-muted-foreground">
            <span>
              {list.data.count} tickets · page {page} of {totalPages}
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon-sm" disabled={!list.data.previous} onClick={() => setParam('page', String(page - 1))} aria-label="Previous page">
                <ChevronLeft />
              </Button>
              <Button variant="outline" size="icon-sm" disabled={!list.data.next} onClick={() => setParam('page', String(page + 1))} aria-label="Next page">
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
