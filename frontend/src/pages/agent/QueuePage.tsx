import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AlertOctagon, ChevronLeft, ChevronRight, Clock, Inbox, Loader2, Search, Sparkles, UserRound, UserX } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { PageHeader } from '@/components/common'
import { ActiveFilterChips, FilterDialog, QuickViews, SearchBox, SortSelect, SORT_OPTIONS, type FilterSpec } from '@/components/dashboard/QueueFilters'
import { TicketCard, TicketCardSkeleton } from '@/components/dashboard/TicketCard'
import { EmptyState, ErrorState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { categoryTone, PRIORITIES, PRIORITY_META, SLA_META, STATUSES, STATUS_META } from '@/lib/constants'
import type { TicketQuery } from '@/lib/endpoints'
import { cn } from '@/lib/utils'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

const VIEWS = {
  attention: { label: 'Needs attention', query: { status: 'OPEN,IN_PROGRESS' } },
  mine: { label: 'Mine', query: { status: 'OPEN,IN_PROGRESS', assigned: 'me' } },
  unassigned: { label: 'Unassigned', query: { status: 'OPEN,IN_PROGRESS', assigned: 'unassigned' } },
  all: { label: 'All', query: { ordering: '-created_at' } },
} as const
type ViewKey = keyof typeof VIEWS

const FILTER_KEYS = ['status', 'category', 'priority', 'assigned', 'sla', 'q'] as const
const PAGE_SIZE = 25

function KpiCard({ label, value, icon: Icon, tile, ring, onClick, active }: {
  label: string
  value: number | undefined
  icon: typeof Inbox
  tile: string
  ring: string
  onClick: () => void
  active: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'group flex items-center gap-3.5 rounded-lg border border-border bg-card p-4 text-left shadow-xs transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none sm:gap-4',
        active && cn('ring-2', ring),
      )}
    >
      <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-md ring-1 ring-inset ring-black/5', tile)}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-2xl leading-none font-semibold tracking-tight tabular-nums">{value ?? '–'}</p>
        <p className="mt-1.5 text-[13px] font-medium text-muted-foreground">{label}</p>
      </div>
    </button>
  )
}

export function QueuePage() {
  const { slug, api } = useWorkspace()
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const refetchInterval = useFallbackInterval()
  const view: ViewKey = (params.get('view') as ViewKey) in VIEWS ? (params.get('view') as ViewKey) : 'attention'
  const page = Number(params.get('page') ?? 1)
  const sort = params.get('sort') ?? 'default'
  const [search, setSearch] = useState(params.get('q') ?? '')
  const [selected, setSelected] = useState(0)
  const [kbActive, setKbActive] = useState(false)
  const base = `/w/${slug}/agent`
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([])

  const categories = useQuery({ queryKey: ['categories', slug], queryFn: api.categories, staleTime: 60_000 })
  const members = useQuery({ queryKey: ['members', slug, 'staff'], queryFn: () => api.members(true), staleTime: 60_000 })

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
    for (const key of ['status', 'category', 'priority', 'assigned', 'sla', 'q'] as const) {
      const v = params.get(key)
      if (v) q[key] = v
    }
    const ordering = SORT_OPTIONS.find((o) => o.value === sort)?.ordering
    if (ordering) q.ordering = ordering
    return q
  }, [params, view, page, sort])

  const stats = useQuery({ queryKey: ['stats', slug], queryFn: api.tickets.stats, refetchInterval })
  const list = useQuery({
    queryKey: ['tickets', slug, 'staff', query],
    queryFn: () => api.tickets.listStaff(query),
    placeholderData: keepPreviousData,
    refetchInterval,
  })
  const tickets = list.data?.results ?? []
  const activeFilters = FILTER_KEYS.filter((k) => params.get(k) && k !== 'q')

  const specs: FilterSpec[] = useMemo(() => {
    const out: FilterSpec[] = [
      { key: 'status', label: 'Status', multi: true, options: STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label, tone: STATUS_META[s] })) },
      { key: 'priority', label: 'Priority', multi: true, options: PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label, tone: PRIORITY_META[p] })) },
      { key: 'category', label: 'Category', multi: true, options: (categories.data ?? []).map((c) => ({ value: c.key, label: c.name, tone: categoryTone(c.key, c.name) })) },
      { key: 'sla', label: 'Response SLA', options: [{ value: 'overdue', label: 'Overdue', tone: SLA_META.overdue }, { value: 'at_risk', label: 'Due soon', tone: SLA_META.at_risk }] },
    ]
    if (view === 'attention' || view === 'all') {
      out.push({
        key: 'assigned',
        label: 'Owner',
        icon: UserRound,
        options: [
          { value: 'me', label: 'Assigned to me', icon: UserRound },
          { value: 'unassigned', label: 'Unassigned', icon: UserX },
          ...(members.data ?? []).filter((m) => m.id !== user?.id).map((m) => ({ value: String(m.id), label: m.full_name, icon: UserRound })),
        ],
      })
    }
    return out
  }, [categories.data, members.data, user?.id, view])

  useEffect(() => {
    setSelected(0)
  }, [query])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'j') {
        setKbActive(true)
        setSelected((s) => Math.min(s + 1, tickets.length - 1))
      }
      if (e.key === 'k') {
        setKbActive(true)
        setSelected((s) => Math.max(s - 1, 0))
      }
      if (e.key === 'Enter' && kbActive && tickets[selected] && target.tagName !== 'A' && target.tagName !== 'BUTTON') navigate(`${base}/tickets/${tickets[selected].id}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tickets, selected, navigate, base])

  useEffect(() => {
    if (kbActive) cardRefs.current[selected]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selected, kbActive])

  const applyKpi = (next: Record<string, string>) => {
    setSearch('')
    setParams(new URLSearchParams(next), { replace: true })
  }
  const clearAll = () => {
    setSearch('')
    setParams(view === 'attention' ? new URLSearchParams() : new URLSearchParams({ view }), { replace: true })
  }
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.count / PAGE_SIZE)) : 1
  const from = list.data && list.data.count ? (page - 1) * PAGE_SIZE + 1 : 0
  const to = list.data ? Math.min(list.data.count, page * PAGE_SIZE) : 0
  const values = Object.fromEntries(specs.map((s) => [s.key, params.get(s.key)]))
  const activeCount = specs.filter((s) => params.get(s.key)).length
  const hasAny = activeFilters.length > 0 || !!params.get('q') || sort !== 'default'

  const quickViews = [
    { key: 'attention', label: VIEWS.attention.label, count: stats.data ? stats.data.open + stats.data.in_progress : undefined },
    { key: 'mine', label: VIEWS.mine.label, count: stats.data?.mine },
    { key: 'unassigned', label: VIEWS.unassigned.label, count: stats.data?.unassigned },
    { key: 'all', label: VIEWS.all.label },
  ]

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader title="Ticket queue" description="Most urgent first, then oldest. Press J / K to move through cards and Enter to open." />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KpiCard label="Open tickets" value={stats.data ? stats.data.open + stats.data.in_progress : undefined} icon={Inbox} tile="bg-sky-100 text-sky-700" ring="ring-sky-300" onClick={() => applyKpi({})} active={view === 'attention' && !activeFilters.length} />
        <KpiCard label="Unassigned" value={stats.data?.unassigned} icon={UserX} tile="bg-violet-100 text-violet-700" ring="ring-violet-300" onClick={() => applyKpi({ view: 'unassigned' })} active={view === 'unassigned'} />
        <KpiCard label="Overdue first reply" value={stats.data?.overdue} icon={Clock} tile="bg-red-100 text-red-700" ring="ring-red-300" onClick={() => applyKpi({ sla: 'overdue' })} active={params.get('sla') === 'overdue'} />
        <KpiCard label="Critical open" value={stats.data?.critical} icon={AlertOctagon} tile="bg-orange-100 text-orange-700" ring="ring-orange-300" onClick={() => applyKpi({ priority: 'CRITICAL' })} active={params.get('priority') === 'CRITICAL'} />
      </div>

      <section aria-label="Find and filter tickets" className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <QuickViews views={quickViews} value={view} onChange={(v) => applyKpi(v === 'attention' ? {} : { view: v })} />
          <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:flex-nowrap">
            <SearchBox value={search} onChange={setSearch} />
            <FilterDialog
              specs={specs}
              values={values}
              activeCount={activeCount}
              onApply={(next) => {
                const p = new URLSearchParams(params)
                p.delete('page')
                for (const s of specs) {
                  if (next[s.key]) p.set(s.key, next[s.key]!)
                  else p.delete(s.key)
                }
                setParams(p, { replace: true })
              }}
            />
            <SortSelect value={sort} onChange={(v) => setParam('sort', v === 'default' ? null : v)} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <ActiveFilterChips specs={specs} values={values} onChange={setParam} onClear={clearAll} />
          <p className="ml-auto flex items-center gap-2 text-[13px] text-muted-foreground" aria-live="polite">
            {list.isFetching && !list.isLoading && <Loader2 className="size-3.5 animate-spin" />}
            {list.data ? (list.data.count ? (
              <>
                <span className="font-medium text-foreground tabular-nums">{from}–{to}</span> of <span className="font-medium text-foreground tabular-nums">{list.data.count}</span> tickets
              </>
            ) : '0 tickets') : 'Loading tickets…'}
          </p>
        </div>
      </section>

      {list.isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <TicketCardSkeleton key={i} />
          ))}
        </div>
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={activeFilters.length || params.get('q') ? Search : Sparkles}
          title={activeFilters.length || params.get('q') ? 'No tickets match these filters' : view === 'mine' ? 'Nothing assigned to you' : 'Queue is clear'}
          description={activeFilters.length || params.get('q') ? 'Try removing a filter or searching for something else.' : 'New tickets will appear here instantly.'}
          action={hasAny ? <Button variant="outline" size="sm" onClick={clearAll}>Clear all filters</Button> : undefined}
        />
      ) : (
        <ul className="space-y-2.5">
          {tickets.map((t, i) => (
            <li key={t.id}>
              <TicketCard
                ref={(el) => {
                  cardRefs.current[i] = el
                }}
                ticket={t}
                to={`${base}/tickets/${t.id}`}
                selected={kbActive && i === selected}
                meId={user?.id}
              />
            </li>
          ))}
        </ul>
      )}

      {list.data && list.data.count > PAGE_SIZE && (
        <div className="mt-5 flex items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-sm text-muted-foreground shadow-xs">
          <span>
            Page {page} of {totalPages}
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
  )
}
