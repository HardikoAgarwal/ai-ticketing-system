import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AlertOctagon, CalendarDays, ChevronLeft, ChevronRight, Clock, Inbox, Loader2, Search, SlidersHorizontal, Sparkles, UserX, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { CategoryBadge, PriorityBadge, SlaBadge, StatusBadge } from '@/components/badges'
import { PageHeader, RelativeTime } from '@/components/common'
import { MetaSelect, type MetaOption } from '@/components/MetaSelect'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CATEGORIES, CATEGORY_META, PRIORITIES, PRIORITY_META, SLA_META, STATUSES, STATUS_META } from '@/lib/constants'
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

const FILTER_KEYS = ['status', 'category', 'priority', 'sla', 'range', 'q'] as const

const SLA_FILTER_OPTIONS: MetaOption[] = [
  { value: 'overdue', label: 'Overdue', tone: SLA_META.overdue },
  { value: 'at_risk', label: 'Due soon', tone: SLA_META.at_risk },
]

function KpiCard({ label, value, icon: Icon, tone, onClick, active }: {
  label: string
  value: number | undefined
  icon: typeof Inbox
  tone: { tile: string; ring: string; bar: string }
  onClick: () => void
  active: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-4 overflow-hidden rounded-2xl border bg-card p-4 text-left shadow-xs transition-all hover:-translate-y-px hover:shadow-md',
        active && cn('ring-2', tone.ring),
      )}
    >
      <span className={cn('absolute inset-x-0 top-0 h-1', tone.bar)} />
      <div className={cn('flex size-11 items-center justify-center rounded-xl', tone.tile)}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-2xl leading-none font-semibold tracking-tight">{value ?? '–'}</p>
        <p className="mt-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      </div>
    </button>
  )
}

const PRIORITY_EDGE: Record<string, string> = {
  CRITICAL: 'shadow-[inset_4px_0_0_0_var(--color-red-500)]',
  HIGH: 'shadow-[inset_4px_0_0_0_var(--color-orange-500)]',
  MEDIUM: 'shadow-[inset_4px_0_0_0_var(--color-amber-400)]',
  LOW: 'shadow-[inset_4px_0_0_0_var(--color-slate-300)]',
}

function TicketTableRow({ ticket, selected, onOpen }: { ticket: AdminTicket; selected: boolean; onOpen: () => void }) {
  const overdue = ticket.sla_state === 'overdue'
  return (
    <tr
      onClick={onOpen}
      className={cn(
        'cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/50',
        PRIORITY_EDGE[ticket.priority],
        selected && 'bg-primary/[0.05]',
        overdue && 'bg-red-50/40',
      )}
    >
      <td className="max-w-0 py-3.5 pr-4 pl-5 align-top">
        <div className="flex min-w-0 items-center gap-2">
          <PriorityBadge priority={ticket.priority} source={ticket.priority_source} size="sm" />
          {ticket.has_unread && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="New author activity" />}
          <p className={cn('min-w-0 truncate text-sm', ticket.has_unread ? 'font-semibold' : 'font-medium')}>{ticket.subject}</p>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          <span className="font-mono">{ticket.reference}</span> · {ticket.author.name} · {ticket.book ? ticket.book.title : 'General'}
        </p>
      </td>
      <td className="py-3.5 pr-4 align-top">
        {ticket.ai_status === 'PENDING' && ticket.category_source !== 'ADMIN' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-600/20 ring-inset">
            <Loader2 className="size-3 animate-spin" /> Classifying
          </span>
        ) : (
          <div className="flex flex-col items-start gap-1">
            <CategoryBadge category={ticket.category} source={ticket.category_source} short size="sm" />
            {ticket.ai_status === 'FAILED' && ticket.category_source === 'FALLBACK' && (
              <span className="text-[11px] font-medium text-amber-700">Needs triage</span>
            )}
          </div>
        )}
      </td>
      <td className="py-3.5 pr-4 align-top">
        <StatusBadge status={ticket.status} size="sm" />
      </td>
      <td className="py-3.5 pr-4 align-top">
        <SlaBadge state={ticket.sla_state} dueAt={ticket.sla_due_at} size="sm" />
      </td>
      <td className="py-3.5 pr-4 align-top text-xs whitespace-nowrap text-muted-foreground">
        <RelativeTime value={ticket.created_at} />
      </td>
      <td className="py-3.5 pr-4 align-top">
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

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Open tickets" value={stats.data ? stats.data.open + stats.data.in_progress : undefined} icon={Inbox} tone={{ tile: 'bg-sky-100 text-sky-700', ring: 'ring-sky-300', bar: 'bg-sky-500' }} onClick={() => applyKpi({})} active={view === 'attention' && !activeFilters.length} />
        <KpiCard label="Unassigned" value={stats.data?.unassigned} icon={UserX} tone={{ tile: 'bg-violet-100 text-violet-700', ring: 'ring-violet-300', bar: 'bg-violet-500' }} onClick={() => applyKpi({ view: 'unassigned' })} active={view === 'unassigned'} />
        <KpiCard label="Overdue first reply" value={stats.data?.overdue} icon={Clock} tone={{ tile: 'bg-red-100 text-red-700', ring: 'ring-red-300', bar: 'bg-red-500' }} onClick={() => applyKpi({ sla: 'overdue' })} active={params.get('sla') === 'overdue'} />
        <KpiCard label="Critical open" value={stats.data?.critical} icon={AlertOctagon} tone={{ tile: 'bg-orange-100 text-orange-700', ring: 'ring-orange-300', bar: 'bg-orange-500' }} onClick={() => applyKpi({ priority: 'CRITICAL' })} active={params.get('priority') === 'CRITICAL'} />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
          <Tabs value={view} onValueChange={(v) => applyKpi(v === 'attention' ? {} : { view: v })}>
            <TabsList>
              {Object.entries(VIEWS).map(([key, v]) => (
                <TabsTrigger key={key} value={key}>
                  {v.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative lg:ml-auto lg:w-80">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subject, author, book, TKT-0001"
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 border-b bg-muted/20 px-4 py-3">
          <span className="mr-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <SlidersHorizontal className="size-3.5" /> Filter
          </span>
          <MetaSelect size="sm" value={params.get('status')} onChange={(v) => setParam('status', v)} placeholder="Status" anyLabel="Any status" options={STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label, tone: STATUS_META[s] }))} />
          <MetaSelect size="sm" value={params.get('priority')} onChange={(v) => setParam('priority', v)} placeholder="Priority" anyLabel="Any priority" options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label, tone: PRIORITY_META[p] }))} />
          <MetaSelect size="sm" value={params.get('category')} onChange={(v) => setParam('category', v)} placeholder="Category" anyLabel="Any category" className="min-w-44" options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_META[c].label, tone: CATEGORY_META[c] }))} />
          <MetaSelect size="sm" value={params.get('sla')} onChange={(v) => setParam('sla', v)} placeholder="SLA" anyLabel="Any SLA" options={SLA_FILTER_OPTIONS} />
          <MetaSelect size="sm" value={params.get('range')} onChange={(v) => setParam('range', v)} placeholder="Created" anyLabel="Any time" options={Object.entries(DATE_RANGES).map(([value, r]) => ({ value, label: r.label, icon: CalendarDays }))} />
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
            <table className="w-full min-w-[900px] table-fixed text-left">
              <colgroup>
                <col />
                <col className="w-44" />
                <col className="w-32" />
                <col className="w-36" />
                <col className="w-32" />
                <col className="w-28" />
              </colgroup>
              <thead>
                <tr className="border-b bg-muted/30 text-[11px] tracking-wide text-muted-foreground uppercase">
                  <th className="py-2.5 pr-4 pl-5 font-semibold">Ticket</th>
                  <th className="py-2.5 pr-4 font-semibold">Category</th>
                  <th className="py-2.5 pr-4 font-semibold">Status</th>
                  <th className="py-2.5 pr-4 font-semibold">First reply SLA</th>
                  <th className="py-2.5 pr-4 font-semibold">Age</th>
                  <th className="py-2.5 pr-4 font-semibold">Owner</th>
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
