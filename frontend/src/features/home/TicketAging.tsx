import { Hourglass } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { Paginated, StaffTicket } from '@/lib/types'

import { ChartPanel, Figure, PendingChart } from './chart-kit'
import { CHART, fill, TOOLTIP } from './chart-tokens'
import { ageOf, MAX_DAY, zoneOf } from './useHomeData'

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/**
 * How long open tickets have been waiting, as a bar chart with one column per day of waiting (0, 1, 2 ... 14+).
 * Columns go from green (arrived today) through amber and orange to red (a week or more), so mass on the right means a stale queue.
 * The headline figures are the median wait and the single oldest ticket.
 */
export function TicketAging({ data, loading, error, onRetry, className }: { data?: Paginated<StaffTicket>; loading: boolean; error?: unknown; onRetry: () => void; className?: string }) {
  if (loading || error) return <PendingChart error={error} onRetry={onRetry} className={className} />
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
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-2)', fontSize: 12 }} tickMargin={8} interval={0} height={36} />
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
