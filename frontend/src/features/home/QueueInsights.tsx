import { Hourglass, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Avatar, EmptyState, ErrorState, Panel, PanelHeader, ProgressBar, Skeleton } from '@/components/ds'
import type { Paginated, StaffTicket } from '@/lib/types'
import { cn } from '@/lib/utils'

import { AGING_BUCKETS, agingOf, type WorkloadRow } from './useHomeData'

const SEG = { green: 'bg-mint-ink', blue: 'bg-sky-ink', amber: 'bg-butter-ink', red: 'bg-rose-ink' } as const
const DOT = { green: 'text-mint-ink', blue: 'text-sky-ink', amber: 'text-butter-ink', red: 'text-rose-ink' } as const

/** How long open tickets have been waiting. A long tail on the right is the thing to act on. */
export function TicketAging({ data, loading, error, onRetry }: { data?: Paginated<StaffTicket>; loading: boolean; error?: unknown; onRetry: () => void }) {
  const tickets = data?.results ?? []
  const aging = agingOf(tickets)
  const total = tickets.length
  const sampled = data && data.count > data.results.length
  return (
    <Panel aria-labelledby="home-aging">
      <PanelHeader title={<span id="home-aging">How long tickets have waited</span>} description="Age of every open ticket, from the day it arrived." icon={Hourglass} />
      <div className="p-5">
        {error ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : loading ? (
          <Skeleton className="h-40" />
        ) : !total ? (
          <EmptyState icon={Hourglass} title="No open tickets" description="Nothing is waiting." className="border-0" />
        ) : (
          <>
            <div role="img" aria-label={`Open ticket age: ${AGING_BUCKETS.map((b) => `${aging[b.key]} ${b.label}`).join(', ')}`} className="flex h-3 overflow-hidden rounded-full bg-sunken">
              {AGING_BUCKETS.map((b) => (aging[b.key] ? <div key={b.key} className={cn('h-full first:rounded-l-full last:rounded-r-full', SEG[b.tone])} style={{ width: `${(aging[b.key] / total) * 100}%` }} /> : null))}
            </div>
            <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4">
              {AGING_BUCKETS.map((b) => (
                <li key={b.key}>
                  <div className="flex items-center gap-2 text-[13px] text-ink-2">
                    <span className={cn('size-2 rounded-full bg-current', DOT[b.tone])} aria-hidden />
                    {b.label}
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <span className="text-2xl leading-8 font-semibold text-ink tabular-nums">{aging[b.key]}</span>
                    <span className="text-xs text-ink-3">{b.hint}</span>
                  </div>
                </li>
              ))}
            </ul>
            {sampled && <p className="mt-4 text-xs text-ink-3">Based on the {data.results.length} most urgent of {data.count} open tickets.</p>}
          </>
        )}
      </div>
    </Panel>
  )
}

/** Open tickets per person. "Unassigned" is always first so a pile-up with no owner stands out. */
export function Workload({ rows, loading, error, onRetry, inbox }: { rows: WorkloadRow[]; loading: boolean; error?: unknown; onRetry: () => void; inbox: (qs: string) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <Panel aria-labelledby="home-workload">
      <PanelHeader title={<span id="home-workload">Workload by owner</span>} description="Open tickets per person right now." icon={Users} />
      <div className="p-5">
        {error ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : loading ? (
          <Skeleton className="h-40" />
        ) : (
          <ul className="space-y-3.5">
            {rows.map((r) => (
              <li key={r.id ?? 'none'}>
                <Link
                  to={inbox(`view=${r.id === null ? 'unassigned' : 'all'}&status=OPEN,IN_PROGRESS${r.id === null ? '' : `&assigned=${r.id}`}`)}
                  className="group block rounded-control focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none"
                >
                  <div className="flex items-center gap-2.5">
                    {r.id === null ? <span className="flex size-6 items-center justify-center rounded-md border border-dashed border-line-strong text-[10px] text-ink-3" aria-hidden>?</span> : <Avatar name={r.name} size="sm" />}
                    <span className={cn('min-w-0 flex-1 truncate text-sm', r.id === null ? 'font-medium text-ink-2 italic' : 'font-medium text-ink group-hover:underline')}>{r.name}</span>
                    {r.overdue > 0 && <span className="text-xs font-medium text-rose-ink">{r.overdue} overdue</span>}
                    <span className="w-7 text-right text-sm font-semibold text-ink tabular-nums">{r.count}</span>
                  </div>
                  <ProgressBar value={r.count} max={max} tone={r.id === null && r.count ? 'amber' : 'violet'} size="sm" label={`${r.name}: ${r.count} open`} className="mt-1.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  )
}
