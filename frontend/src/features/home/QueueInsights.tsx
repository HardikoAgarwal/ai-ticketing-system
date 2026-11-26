import { Hourglass, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { Avatar, ErrorState, Skeleton } from '@/components/ds'
import type { Paginated, StaffTicket } from '@/lib/types'

import { ChartPanel, Figure } from './chart-kit'
import { CHART, fill, TOOLTIP } from './chart-tokens'
import { ageOf, MAX_DAY, zoneOf, type WorkloadRow } from './useHomeData'

function Pending({ error, onRetry, className }: { error?: unknown; onRetry: () => void; className?: string }) {
  return <div className={className}>{error ? <ErrorState error={error} onRetry={onRetry} /> : <Skeleton className="h-72 rounded-panel" />}</div>
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/**
 * How long open tickets have been waiting, as a histogram: one column per day of waiting (0, 1, 2 ... 14+).
 * Columns go from green (arrived today) through amber and orange to red (a week or more), so mass on the right means a stale queue.
 * The headline figures are the median wait and the single oldest ticket.
 */
export function TicketAging({ data, loading, error, onRetry, className }: { data?: Paginated<StaffTicket>; loading: boolean; error?: unknown; onRetry: () => void; className?: string }) {
  if (loading || error) return <Pending error={error} onRetry={onRetry} className={className} />
  const tickets = data?.results ?? []
  const { rows, median, oldest, stale } = ageOf(tickets)
  const sampled = data && data.count > data.results.length
  return (
    <ChartPanel
      icon={Hourglass}
      className={className}
      title="How long tickets have waited"
      description={sampled ? `Open tickets by days waiting. The ${data.results.length} most urgent of ${data.count}.` : 'Open tickets by days waiting. Tall red columns mean stale tickets.'}
      figure={
        median === null ? undefined : (
          <div className="flex gap-6">
            <Figure value={plural(median, 'day')} label="Median wait" />
            <Figure value={plural(oldest?.days ?? 0, 'day')} label={`Oldest ${oldest?.reference ?? ''}`} tone={stale ? 'bad' : undefined} />
          </div>
        )
      }
      summary={`Open tickets by days waiting: ${rows.filter((r) => r.count).map((r) => `${r.count} at ${r.label} days`).join(', ')}.`}
      empty={!tickets.length}
    >
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={rows} margin={{ top: 28, right: 4, left: -20, bottom: 0 }} barCategoryGap="14%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-2)', fontSize: 12 }} tickMargin={8} interval={0} label={{ value: 'Days waiting', position: 'insideBottom', offset: -18, fill: 'var(--ink-3)', fontSize: 12 }} height={56} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-3)', fontSize: 12 }} width={44} />
          <Tooltip {...TOOLTIP} formatter={(v) => [v, 'Open tickets']} labelFormatter={(l) => `${l} ${l === '1' ? 'day' : 'days'} waiting`} />
          <Bar dataKey="count" radius={[8, 8, 3, 3]} isAnimationActive={false}>
            {rows.map((r) => (
              <Cell key={r.day} fill={fill(zoneOf(r.day))} fillOpacity={r.count ? 1 : 0.18} />
            ))}
            <LabelList dataKey="count" position="top" offset={6} formatter={(v: unknown) => (Number(v) ? String(v) : '')} style={{ fill: 'var(--ink)', fontSize: 14, fontWeight: 700 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-xs text-ink-2">Days since the ticket arrived (the last column is {MAX_DAY} or more)</p>
    </ChartPanel>
  )
}

const MAX_DOTS = 36

/**
 * Open tickets per person as one tile each, with one dot per ticket: red for overdue (first), dark for on time.
 * You can count them, and a tile with red dots is visibly behind. "Unassigned" always comes first (dashed): tickets nobody owns are the ones that slip.
 */
export function Workload({ rows, loading, error, onRetry, inbox, className }: { rows: WorkloadRow[]; loading: boolean; error?: unknown; onRetry: () => void; inbox: (qs: string) => string; className?: string }) {
  if (loading || error) return <Pending error={error} onRetry={onRetry} className={className} />
  const total = rows.reduce((n, r) => n + r.count, 0)
  const overdue = rows.reduce((n, r) => n + r.overdue, 0)
  return (
    <ChartPanel
      icon={Users}
      className={className}
      title="Workload by owner"
      description="One dot per open ticket. Red dots are overdue. Select a tile to open that list."
      figure={
        <div className="flex gap-6">
          <Figure value={total} label="Open" />
          <Figure value={overdue} label="Overdue" tone={overdue ? 'bad' : undefined} />
        </div>
      }
      summary={`Open tickets by owner: ${rows.map((r) => `${r.name} ${r.count}${r.overdue ? `, ${r.overdue} overdue` : ''}`).join('; ')}.`}
    >
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-3">
        {rows.map((r) => {
          const unassigned = r.id === null
          const onTime = r.count - r.overdue
          const dots = [...Array.from({ length: r.overdue }, () => 'late'), ...Array.from({ length: onTime }, () => 'ok')]
          return (
            <li key={r.id ?? 'none'}>
              <Link
                to={inbox(`view=${unassigned ? 'unassigned' : 'all'}&status=OPEN,IN_PROGRESS${unassigned ? '' : `&assigned=${r.id}`}`)}
                className={`group flex h-full flex-col rounded-panel border p-4 transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none ${unassigned ? 'border-dashed border-line-strong' : 'border-line'}`}
              >
                <span className="flex items-center gap-3">
                  {unassigned ? (
                    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-control border border-dashed border-line-strong text-sm text-ink-3">
                      ?
                    </span>
                  ) : (
                    <Avatar name={r.name} size="lg" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-semibold text-ink group-hover:underline ${unassigned ? 'italic' : ''}`}>{r.name}</span>
                    <span className="block text-xs text-ink-2" style={r.overdue ? { color: fill('rose') } : undefined}>
                      {r.overdue ? `${r.overdue} overdue` : r.count ? 'All on time' : unassigned ? 'Everything has an owner' : 'Nothing open'}
                    </span>
                  </span>
                  <span className="text-3xl leading-8 font-semibold tracking-tight text-ink tabular-nums">{r.count}</span>
                </span>
                <span className="mt-4 flex min-h-3.5 flex-wrap gap-1.5" aria-hidden>
                  {dots.slice(0, MAX_DOTS).map((kind, i) => (
                    <span key={i} className="size-3.5 rounded-full" style={{ background: kind === 'late' ? fill('rose') : 'var(--ink)' }} />
                  ))}
                  {dots.length > MAX_DOTS && <span className="text-xs font-semibold text-ink-2">+{dots.length - MAX_DOTS}</span>}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </ChartPanel>
  )
}
