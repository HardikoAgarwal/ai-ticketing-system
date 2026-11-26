import { format, parseISO } from 'date-fns'
import type { ReactNode } from 'react'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { Analytics } from '@/lib/types'

import { BarRows, StackBar } from './bars'
import { ChartPanel } from './chart-kit'
import { AXIS, CATEGORY_HUES, CHART, PRIORITY_HUE, SENTIMENT_HUE, SOLID, TOOLTIP, type Hue } from './chart-tokens'

type LabelProps = { x?: number | string; y?: number | string; index?: number }

/** Daily points are noisy on long ranges, so 30 days is shown in 2-day steps and 90 days in weeks. */
function bucketed(volume: Analytics['volume'], days: number) {
  const size = days <= 14 ? 1 : days <= 45 ? 2 : 7
  if (size === 1) return { rows: volume, size }
  const rows: Analytics['volume'] = []
  // fill from the newest day backwards so the last point is always a full step, not a half-finished one
  for (let end = volume.length; end > 0; end -= size) {
    const chunk = volume.slice(Math.max(0, end - size), end)
    rows.unshift({ date: chunk[0].date, created: chunk.reduce((n, v) => n + v.created, 0), resolved: chunk.reduce((n, v) => n + v.resolved, 0) })
  }
  return { rows, size }
}

/** Ticket volume over time. Each line is named at its right-hand end with its period total, so there is no separate legend. */
export function VolumeChart({ data, days, className }: { data: Analytics; days: number; className?: string }) {
  const { rows, size } = bucketed(data.volume, days)
  const last = rows.length - 1
  const end = rows[last]
  const openedAbove = !end || end.created >= end.resolved
  const endLabel = (name: string, color: string, above: boolean) =>
    function EndLabel({ x, y, index }: LabelProps) {
      if (index !== last) return null
      return (
        <text x={Number(x) + 10} y={Number(y) + (above ? -6 : 14)} fill={color} fontSize={13} fontWeight={600}>
          {name} {name === 'Opened' ? data.totals.created : data.totals.resolved}
        </text>
      )
    }
  const trend = data.totals.resolved - data.totals.created
  return (
    <ChartPanel
      className={className}
      title="Ticket volume"
      description={`${trend >= 0 ? `Resolved ${data.totals.resolved} against ${data.totals.created} opened: the backlog is shrinking or steady.` : `Opened ${data.totals.created} against ${data.totals.resolved} resolved: the backlog is growing.`} ${size === 1 ? 'Per day.' : size === 2 ? 'Every 2 days.' : 'Per week.'}`}
      summary={`Area chart of tickets opened and resolved per day over the last ${days} days. ${data.totals.created} opened, ${data.totals.resolved} resolved.`}
      table={{ columns: ['Date', 'Opened', 'Resolved'], rows: rows.map((v) => [v.date, v.created, v.resolved]) }}
      empty={!data.totals.created && !data.totals.resolved}
    >
      <ResponsiveContainer width="100%" height={340}>
        <AreaChart data={rows} margin={{ top: 16, right: 94, left: 0, bottom: 0 }}>
          <defs>
            {[
              ['opened', CHART.opened],
              ['resolved', CHART.resolved],
            ].map(([id, c]) => (
              <linearGradient key={id} id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity={0.3} />
                <stop offset="100%" stopColor={c} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), 'd MMM')} {...AXIS} minTickGap={32} tickMargin={8} />
          <YAxis allowDecimals={false} {...AXIS} width={32} />
          <Tooltip {...TOOLTIP} labelFormatter={(d) => format(parseISO(String(d)), 'EEE, d MMM yyyy')} />
          <Area isAnimationActive={false} type="monotone" dataKey="created" name="Opened" stroke={CHART.opened} strokeWidth={2.5} fill="url(#g-opened)" dot={false} activeDot={{ r: 5 }} label={endLabel('Opened', CHART.opened, openedAbove) as never} />
          <Area isAnimationActive={false} type="monotone" dataKey="resolved" name="Resolved" stroke={CHART.resolved} strokeWidth={2.5} fill="url(#g-resolved)" dot={false} activeDot={{ r: 5 }} label={endLabel('Resolved', CHART.resolved, !openedAbove) as never} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartPanel>
  )
}

interface Slice {
  key: string
  label: string
  value: number
  hue: Hue
}

const RAD = Math.PI / 180

/** Donut with each slice named next to itself (name, count, share) and the total in the middle. No legend. */
function Donut({ slices, center, centerLabel }: { slices: Slice[]; center: ReactNode; centerLabel: string }) {
  const live = slices.filter((s) => s.value > 0)
  const total = live.reduce((n, s) => n + s.value, 0)
  const label = ({ cx, cy, midAngle, outerRadius, payload }: { cx: number; cy: number; midAngle: number; outerRadius: number; payload: Slice }) => {
    const r = outerRadius + 16
    const x = cx + r * Math.cos(-midAngle * RAD)
    const y = cy + r * Math.sin(-midAngle * RAD)
    const right = x > cx
    return (
      <text x={x} y={y} textAnchor={right ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
        <tspan x={x} dy="-0.5em" fill="var(--ink)" fontWeight={600}>
          {payload.label}
        </tspan>
        <tspan x={x} dy="1.25em" fill="var(--ink-2)">
          {payload.value} · {Math.round((payload.value / total) * 100)}%
        </tspan>
      </text>
    )
  }
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={320}>
        <PieChart margin={{ top: 12, right: 60, bottom: 12, left: 60 }}>
          <Pie
            data={live}
            dataKey="value"
            nameKey="label"
            innerRadius="52%"
            outerRadius="74%"
            paddingAngle={live.length > 1 ? 3 : 0}
            cornerRadius={6}
            stroke="var(--surface)"
            strokeWidth={2}
            isAnimationActive={false}
            label={label as never}
            labelLine={{ stroke: 'var(--line-strong)' }}
          >
            {live.map((s) => (
              <Cell key={s.key} fill={SOLID[s.hue]} />
            ))}
          </Pie>
          <Tooltip {...TOOLTIP} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
        <span className="text-4xl leading-10 font-semibold tracking-tight text-ink tabular-nums">{center}</span>
        <span className="text-xs font-medium text-ink-2">{centerLabel}</span>
      </div>
    </div>
  )
}

export function PriorityChart({ data, className }: { data: Analytics; className?: string }) {
  const total = data.by_priority.reduce((n, p) => n + p.count, 0)
  return (
    <ChartPanel
      className={className}
      title="By priority"
      description="How urgent incoming tickets are."
      summary={`Donut chart of tickets by priority: ${data.by_priority.map((p) => `${p.label} ${p.count}`).join(', ')}.`}
      table={{ columns: ['Priority', 'Tickets'], rows: data.by_priority.map((p) => [p.label, p.count]) }}
      empty={!total}
    >
      <Donut slices={data.by_priority.map((p) => ({ key: p.key, label: p.label, value: p.count, hue: PRIORITY_HUE[p.key] ?? 'slate' }))} center={total} centerLabel="tickets" />
    </ChartPanel>
  )
}

/** Replies that met their target vs missed it, with the share that met it in the middle. */
export function SlaChart({ data, className }: { data: Analytics; className?: string }) {
  const { met, breached, overdue } = data.sla
  const judged = met + breached + overdue
  return (
    <ChartPanel
      className={className}
      title="Response targets"
      description="Replies sent in time vs late, plus tickets still waiting past the target."
      summary={`Donut chart of response targets: ${met} met, ${breached} missed, ${overdue} overdue now.`}
      table={{ columns: ['Outcome', 'Tickets'], rows: [['Met', met], ['Missed', breached], ['Overdue now', overdue]] }}
      empty={!judged}
    >
      <Donut
        slices={[
          { key: 'met', label: 'Met', value: met, hue: 'mint' },
          { key: 'breached', label: 'Missed', value: breached, hue: 'rose' },
          { key: 'overdue', label: 'Overdue', value: overdue, hue: 'butter' },
        ]}
        center={judged ? `${Math.round((met / judged) * 100)}%` : '—'}
        centerLabel="met on time"
      />
    </ChartPanel>
  )
}

export function CategoryChart({ data, className }: { data: Analytics; className?: string }) {
  const rows = [...data.by_category].sort((a, b) => b.count - a.count)
  return (
    <ChartPanel
      className={className}
      title="By category"
      description="What customers ask about most. A good guide for which help articles to write."
      summary={`Bar chart of tickets by category: ${rows.map((c) => `${c.label} ${c.count}`).join(', ')}.`}
      table={{ columns: ['Category', 'Tickets'], rows: rows.map((c) => [c.label, c.count]) }}
      empty={!rows.some((c) => c.count)}
    >
      <BarRows rowHeight={48} items={rows.map((c, i) => ({ key: c.key, label: c.label, value: c.count, hue: CATEGORY_HUES[i % CATEGORY_HUES.length] }))} />
    </ChartPanel>
  )
}

export function SentimentChart({ data, className }: { data: Analytics; className?: string }) {
  const items = data.by_sentiment.map((s) => ({ key: s.key, label: s.label, value: s.count, hue: SENTIMENT_HUE[s.key] ?? ('slate' as Hue) }))
  return (
    <ChartPanel
      className={className}
      title="Customer sentiment"
      description="The tone the AI read in incoming tickets. A growing red share is an early warning."
      summary={`Stacked bar of ticket sentiment: ${data.by_sentiment.map((s) => `${s.label} ${s.count}`).join(', ')}.`}
      table={{ columns: ['Sentiment', 'Tickets'], rows: data.by_sentiment.map((s) => [s.label, s.count]) }}
      empty={!data.by_sentiment.some((s) => s.count)}
    >
      <StackBar items={items} height={112} />
    </ChartPanel>
  )
}
