import { Link } from 'react-router-dom'
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { Avatar, ErrorState, Skeleton } from '@/components/ds'
import type { Paginated, StaffTicket } from '@/lib/types'

import { ChartPanel, Figure } from './chart-kit'
import { AXIS, fill, TOOLTIP, type Hue } from './chart-tokens'
import { AGING_BUCKETS, agingOf, type WorkloadRow } from './useHomeData'

const AGING_HUE: Record<string, Hue> = { green: 'mint', blue: 'sky', amber: 'butter', red: 'rose' }

function Pending({ error, onRetry }: { error?: unknown; onRetry: () => void }) {
  return error ? <ErrorState error={error} onRetry={onRetry} /> : <Skeleton className="h-64" />
}

/** How long open tickets have been waiting, as columns. A tall column on the right is the thing to act on. */
export function TicketAging({ data, loading, error, onRetry, className }: { data?: Paginated<StaffTicket>; loading: boolean; error?: unknown; onRetry: () => void; className?: string }) {
  const tickets = data?.results ?? []
  const aging = agingOf(tickets)
  const rows = AGING_BUCKETS.map((b) => ({ key: b.key, label: b.label, value: aging[b.key], hue: AGING_HUE[b.tone] }))
  if (loading || error) {
    return (
      <div className={className}>
        <Pending error={error} onRetry={onRetry} />
      </div>
    )
  }
  const stale = aging.d7p
  return (
    <ChartPanel
      className={className}
      title="How long tickets have waited"
      description="Age of every open ticket, from the day it arrived."
      figure={<Figure value={stale} label="over 7 days" color={fill('rose')} />}
      summary={`Open ticket age: ${rows.map((r) => `${r.value} ${r.label}`).join(', ')}.`}
      empty={!tickets.length}
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={rows} margin={{ top: 28, right: 4, left: 4, bottom: 0 }}>
          <XAxis dataKey="label" {...AXIS} tickMargin={10} interval={0} />
          <YAxis hide domain={[0, 'dataMax']} />
          <Tooltip {...TOOLTIP} />
          <Bar dataKey="value" name="Open tickets" radius={[12, 12, 4, 4]} maxBarSize={88} isAnimationActive={false} minPointSize={6}>
            {rows.map((r) => (
              <Cell key={r.key} fill={fill(r.hue)} />
            ))}
            <LabelList dataKey="value" position="top" offset={8} style={{ fill: 'var(--ink)', fontSize: 18, fontWeight: 700 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartPanel>
  )
}

/** Open tickets per person, as a ranked list with a solid bar each. "Unassigned" is always first so a pile-up with no owner stands out. */
export function Workload({ rows, loading, error, onRetry, inbox, className }: { rows: WorkloadRow[]; loading: boolean; error?: unknown; onRetry: () => void; inbox: (qs: string) => string; className?: string }) {
  if (loading || error) {
    return (
      <div className={className}>
        <Pending error={error} onRetry={onRetry} />
      </div>
    )
  }
  const max = Math.max(1, ...rows.map((r) => r.count))
  const total = rows.reduce((n, r) => n + r.count, 0)
  return (
    <ChartPanel
      className={className}
      title="Workload by owner"
      description="Open tickets per person right now."
      figure={<Figure value={total} label="open" />}
      summary={`Open tickets by owner: ${rows.map((r) => `${r.name} ${r.count}`).join(', ')}.`}
    >
      <ul className="space-y-4">
        {rows.map((r) => {
          const unassigned = r.id === null
          return (
            <li key={r.id ?? 'none'}>
              <Link
                to={inbox(`view=${unassigned ? 'unassigned' : 'all'}&status=OPEN,IN_PROGRESS${unassigned ? '' : `&assigned=${r.id}`}`)}
                className="group flex items-center gap-3 rounded-control focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-4 focus-visible:ring-offset-surface focus-visible:outline-none"
              >
                {unassigned ? (
                  <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-control border border-dashed border-line-strong text-xs text-ink-3">
                    ?
                  </span>
                ) : (
                  <Avatar name={r.name} size="md" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className={unassigned ? 'font-medium text-ink-2 italic' : 'truncate font-semibold text-ink group-hover:underline'}>{r.name}</span>
                    <span className="flex items-baseline gap-2">
                      {r.overdue > 0 && <span className="text-xs font-semibold text-rose-ink">{r.overdue} overdue</span>}
                      <span className="text-base font-semibold text-ink tabular-nums">{r.count}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-sunken">
                    <div className="h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${(r.count / max) * 100}%`, background: fill(unassigned ? 'butter' : 'mint') }} />
                  </div>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </ChartPanel>
  )
}
