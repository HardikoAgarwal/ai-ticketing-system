import { Hourglass, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { Avatar, ErrorState, Skeleton } from '@/components/ds'
import type { Paginated, StaffTicket } from '@/lib/types'

import { ChartPanel, Figure } from './chart-kit'
import { CHART, fill, TOOLTIP } from './chart-tokens'
import { AGING_BUCKETS, agingOf, oldestOf, type WorkloadRow } from './useHomeData'

function Pending({ error, onRetry, className }: { error?: unknown; onRetry: () => void; className?: string }) {
  return <div className={className}>{error ? <ErrorState error={error} onRetry={onRetry} /> : <Skeleton className="h-72 rounded-panel" />}</div>
}

function AgeTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const hint = AGING_BUCKETS.find((b) => b.label === payload?.value)?.hint
  return (
    <g transform={`translate(${x},${y})`}>
      <text y={20} textAnchor="middle" fill="var(--ink)" fontSize={13} fontWeight={600}>
        {payload?.value}
      </text>
      <text y={38} textAnchor="middle" fill="var(--ink-3)" fontSize={12} className="max-sm:hidden">
        {hint}
      </text>
    </g>
  )
}

/**
 * Open tickets by how long they have waited, as four columns that go from calm green to urgent red.
 * The card headline is the single longest-waiting ticket, which is usually the first thing to look at.
 */
export function TicketAging({ data, loading, error, onRetry, className }: { data?: Paginated<StaffTicket>; loading: boolean; error?: unknown; onRetry: () => void; className?: string }) {
  if (loading || error) return <Pending error={error} onRetry={onRetry} className={className} />
  const tickets = data?.results ?? []
  const aging = agingOf(tickets)
  const rows = AGING_BUCKETS.map((b) => ({ key: b.key, label: b.label, value: aging[b.key], hue: b.hue }))
  const oldest = oldestOf(tickets)
  const sampled = data && data.count > data.results.length
  return (
    <ChartPanel
      icon={Hourglass}
      className={className}
      title="How long tickets have waited"
      description={`Open tickets by age.${sampled ? ` Based on the ${data.results.length} most urgent of ${data.count}.` : ' Tall columns on the right mean stale tickets.'}`}
      figure={oldest ? <Figure value={`${oldest.days} ${oldest.days === 1 ? 'day' : 'days'}`} label={`Oldest: ${oldest.reference}`} tone={oldest.days >= 7 ? 'bad' : undefined} /> : undefined}
      summary={`Open ticket age: ${rows.map((r) => `${r.value} ${r.label}`).join(', ')}.`}
      empty={!tickets.length}
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={rows} margin={{ top: 28, right: 8, left: -24, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AgeTick as never} interval={0} height={52} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-3)', fontSize: 12 }} width={44} />
          <Tooltip {...TOOLTIP} />
          <Bar dataKey="value" name="Open tickets" radius={[12, 12, 4, 4]} maxBarSize={110} isAnimationActive={false} minPointSize={4}>
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

/**
 * Open tickets per person as one bar each. The bar is dark for tickets still on time and red for overdue ones, so a red tail
 * shows who is behind. "Unassigned" is always first: tickets nobody owns are the ones most likely to slip.
 */
export function Workload({ rows, loading, error, onRetry, inbox, className }: { rows: WorkloadRow[]; loading: boolean; error?: unknown; onRetry: () => void; inbox: (qs: string) => string; className?: string }) {
  if (loading || error) return <Pending error={error} onRetry={onRetry} className={className} />
  const max = Math.max(1, ...rows.map((r) => r.count))
  const total = rows.reduce((n, r) => n + r.count, 0)
  const overdue = rows.reduce((n, r) => n + r.overdue, 0)
  return (
    <ChartPanel
      icon={Users}
      className={className}
      title="Workload by owner"
      description="Open tickets per person. Dark is on time, red is overdue. Select a row to open that list."
      figure={
        <div className="flex gap-6">
          <Figure value={total} label="Open" />
          <Figure value={overdue} label="Overdue" tone={overdue ? 'bad' : undefined} />
        </div>
      }
      summary={`Open tickets by owner: ${rows.map((r) => `${r.name} ${r.count}${r.overdue ? `, ${r.overdue} overdue` : ''}`).join('; ')}.`}
    >
      <ul className="divide-y divide-line">
        {rows.map((r) => {
          const unassigned = r.id === null
          return (
            <li key={r.id ?? 'none'}>
              <Link
                to={inbox(`view=${unassigned ? 'unassigned' : 'all'}&status=OPEN,IN_PROGRESS${unassigned ? '' : `&assigned=${r.id}`}`)}
                className="group -mx-2 flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-control px-2 py-3 transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none"
              >
                <span className="flex min-w-0 flex-1 items-center gap-3 sm:w-52 sm:flex-none">
                  {unassigned ? (
                    <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-control border border-dashed border-line-strong text-xs text-ink-3">
                      ?
                    </span>
                  ) : (
                    <Avatar name={r.name} size="md" />
                  )}
                  <span className={unassigned ? 'truncate text-sm font-medium text-ink-2 italic' : 'truncate text-sm font-semibold text-ink group-hover:underline'}>{r.name}</span>
                </span>
                <span className="order-last flex h-7 basis-full sm:order-none sm:basis-0 sm:flex-1" aria-hidden>
                  <span className="flex h-full overflow-hidden rounded-chip bg-sunken" style={{ width: '100%' }}>
                    <span className="flex h-full overflow-hidden rounded-chip transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${(r.count / max) * 100}%` }}>
                      <span className="h-full bg-ink" style={{ width: `${((r.count - r.overdue) / Math.max(r.count, 1)) * 100}%` }} />
                      <span className="h-full" style={{ width: `${(r.overdue / Math.max(r.count, 1)) * 100}%`, background: fill('rose') }} />
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-baseline justify-end gap-2 tabular-nums sm:w-28">
                  <span className="text-lg font-semibold text-ink">{r.count}</span>
                  {r.overdue > 0 ? <span className="text-xs font-semibold" style={{ color: fill('rose') }}>{r.overdue} overdue</span> : <span className="text-xs text-ink-3">open</span>}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </ChartPanel>
  )
}
