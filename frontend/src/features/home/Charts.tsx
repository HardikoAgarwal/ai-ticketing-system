import { format, parseISO } from 'date-fns'
import { Flag, LayoutGrid, Smile, TrendingUp } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Treemap, XAxis, YAxis } from 'recharts'

import type { Analytics } from '@/lib/types'

import { StackBar } from './bars'
import { ChartPanel, Figure } from './chart-kit'
import { AXIS, CATEGORY_HUES, CHART, fill, on, PRIORITY_HUE, SENTIMENT_HUE, TOOLTIP, type Hue } from './chart-tokens'

/** Daily points are noisy on long ranges, so 30 days is shown in 2-day steps and 90 days in weeks. Steps are counted back from today so the last one is complete. */
function bucketed(volume: Analytics['volume'], days: number) {
  const size = days <= 14 ? 1 : days <= 45 ? 2 : 7
  if (size === 1) return { rows: volume, size }
  const rows: Analytics['volume'] = []
  for (let end = volume.length; end > 0; end -= size) {
    const chunk = volume.slice(Math.max(0, end - size), end)
    rows.unshift({ date: chunk[0].date, created: chunk.reduce((n, v) => n + v.created, 0), resolved: chunk.reduce((n, v) => n + v.resolved, 0) })
  }
  return { rows, size }
}

/** Opened vs resolved over time, edge to edge. The two totals sit in the card header, colour-keyed to the lines. */
export function VolumeChart({ data, days, className }: { data: Analytics; days: number; className?: string }) {
  const { rows, size } = bucketed(data.volume, days)
  const net = data.totals.created - data.totals.resolved
  const step = size === 1 ? 'per day' : size === 2 ? 'every 2 days' : 'per week'
  return (
    <ChartPanel
      icon={TrendingUp}
      className={className}
      title="Ticket volume"
      description={`Tickets opened and resolved ${step}. When the green line stays above the grey one, the backlog is shrinking.`}
      figure={
        <div className="flex gap-6">
          <Figure value={data.totals.created} label="Opened" color={CHART.opened} />
          <Figure value={data.totals.resolved} label="Resolved" color={CHART.resolved} />
          <Figure value={`${net > 0 ? '+' : ''}${net}`} label="Backlog change" tone={net > 0 ? 'bad' : net < 0 ? 'good' : undefined} />
        </div>
      }
      summary={`Area chart of tickets opened and resolved over the last ${days} days. ${data.totals.created} opened, ${data.totals.resolved} resolved.`}
      empty={!data.totals.created && !data.totals.resolved}
    >
      <ResponsiveContainer width="100%" height={340}>
        <AreaChart data={rows} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
          <defs>
            {[
              ['opened', CHART.opened],
              ['resolved', CHART.resolved],
            ].map(([id, c]) => (
              <linearGradient key={id} id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity={0.32} />
                <stop offset="100%" stopColor={c} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), 'd MMM')} {...AXIS} minTickGap={40} tickMargin={10} />
          <YAxis allowDecimals={false} {...AXIS} width={44} />
          <Tooltip {...TOOLTIP} labelFormatter={(d) => format(parseISO(String(d)), 'EEE, d MMM yyyy')} />
          <Area isAnimationActive={false} type="monotone" dataKey="created" name="Opened" stroke={CHART.opened} strokeWidth={2.5} fill="url(#g-opened)" dot={false} activeDot={{ r: 5 }} />
          <Area isAnimationActive={false} type="monotone" dataKey="resolved" name="Resolved" stroke={CHART.resolved} strokeWidth={2.5} fill="url(#g-resolved)" dot={false} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartPanel>
  )
}

/** The mood of incoming tickets as one tall bar with the name and share written inside each segment. */
export function SentimentChart({ data, className }: { data: Analytics; className?: string }) {
  const items = data.by_sentiment.map((s) => ({ key: s.key, label: s.label, value: s.count, hue: SENTIMENT_HUE[s.key] ?? ('slate' as Hue) }))
  const total = items.reduce((n, i) => n + i.value, 0)
  const top = [...items].sort((a, b) => b.value - a.value)[0]
  const negative = items.find((i) => i.key === 'NEGATIVE')?.value ?? 0
  return (
    <ChartPanel
      icon={Smile}
      className={className}
      title="Customer sentiment"
      description="The tone the AI read in new tickets. A growing red share is an early warning."
      figure={total ? <Figure value={`${Math.round((negative / total) * 100)}%`} label="negative" tone={negative / total > 0.3 ? 'bad' : undefined} /> : undefined}
      summary={`Bar of ticket sentiment: ${items.map((s) => `${s.label} ${s.value}`).join(', ')}${top ? `. Mostly ${top.label.toLowerCase()}` : ''}.`}
      empty={!total}
    >
      <StackBar items={items} height={132} />
    </ChartPanel>
  )
}

const RAD = Math.PI / 180

/** Priority as a thick ring that fills the card; each slice carries its own name and count inside it. */
export function PriorityChart({ data, className }: { data: Analytics; className?: string }) {
  const total = data.by_priority.reduce((n, p) => n + p.count, 0)
  const slices = data.by_priority.filter((p) => p.count > 0).map((p) => ({ ...p, hue: PRIORITY_HUE[p.key] ?? ('slate' as Hue) }))
  const label = ({ cx, cy, midAngle, innerRadius, outerRadius, payload }: { cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; payload: (typeof slices)[number] }) => {
    const share = payload.count / total
    if (share < 0.05) return null
    const r = (innerRadius + outerRadius) / 2
    const x = cx + r * Math.cos(-midAngle * RAD)
    const y = cy + r * Math.sin(-midAngle * RAD)
    return (
      <text x={x} y={y} textAnchor="middle" fill={on(payload.hue)} pointerEvents="none">
        {share >= 0.08 && (
          <tspan x={x} dy="-0.45em" fontSize={share >= 0.12 ? 13 : 11} fontWeight={600}>
            {payload.label}
          </tspan>
        )}
        <tspan x={x} dy={share >= 0.08 ? '1.35em' : '0.35em'} fontSize={share >= 0.12 ? 18 : 14} fontWeight={700}>
          {payload.count}
        </tspan>
      </text>
    )
  }
  return (
    <ChartPanel
      icon={Flag}
      className={className}
      title="By priority"
      description="How urgent new tickets are."
      summary={`Ring chart of tickets by priority: ${data.by_priority.map((p) => `${p.label} ${p.count}`).join(', ')}.`}
      empty={!total}
    >
      <div className="relative h-[320px] w-full sm:h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie data={slices} dataKey="count" nameKey="label" innerRadius="40%" outerRadius="100%" paddingAngle={2} cornerRadius={8} stroke="var(--surface)" strokeWidth={2} isAnimationActive={false} label={label as never} labelLine={false}>
              {slices.map((s) => (
                <Cell key={s.key} fill={fill(s.hue)} />
              ))}
            </Pie>
            <Tooltip {...TOOLTIP} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
          <span className="text-4xl leading-10 font-semibold tracking-tight text-ink tabular-nums">{total}</span>
          <span className="text-xs font-medium text-ink-2">tickets</span>
        </div>
      </div>
    </ChartPanel>
  )
}

interface TileProps {
  x: number
  y: number
  width: number
  height: number
  name: string
  value: number
  index: number
  depth: number
  total: number
}

/** One treemap rectangle: a solid colour per category, the name top-left, the count and share bottom-left, all inside the tile. */
function Tile({ x, y, width, height, name, value, index, depth, total }: TileProps) {
  if (depth !== 1 || width < 6 || height < 6) return null
  const hue = CATEGORY_HUES[index % CATEGORY_HUES.length]
  const room = width > 84 && height > 56
  const chars = Math.max(4, Math.floor((width - 28) / 7.4))
  const color = on(hue)
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={14} fill={fill(hue)} stroke="var(--surface)" strokeWidth={4} />
      {room && (
        <>
          <text x={x + 16} y={y + 30} fill={color} fontSize={14} fontWeight={600}>
            {name.length > chars ? `${name.slice(0, chars - 1)}…` : name}
          </text>
          <text x={x + 16} y={y + height - 18} fill={color} fontSize={Math.min(40, Math.max(24, height / 4))} fontWeight={700}>
            {value}
            <tspan dx={8} fontSize={13} fontWeight={500} fillOpacity={0.8}>
              {Math.round((value / total) * 100)}%
            </tspan>
          </text>
        </>
      )}
    </g>
  )
}

/** What customers ask about, as a treemap: bigger tile, more tickets. Names and counts live inside the tiles. */
export function CategoryChart({ data, className }: { data: Analytics; className?: string }) {
  const rows = [...data.by_category].filter((c) => c.count > 0).sort((a, b) => b.count - a.count)
  const total = rows.reduce((n, c) => n + c.count, 0)
  return (
    <ChartPanel
      icon={LayoutGrid}
      className={className}
      title="By category"
      description="What customers ask about most. Bigger tile, more tickets."
      figure={rows[0] ? <Figure value={`${Math.round((rows[0].count / total) * 100)}%`} label={rows[0].label} /> : undefined}
      summary={`Treemap of tickets by category: ${rows.map((c) => `${c.label} ${c.count}`).join(', ')}.`}
      empty={!rows.length}
    >
      <ResponsiveContainer width="100%" height={420}>
        <Treemap data={rows.map((c) => ({ name: c.label, value: c.count }))} dataKey="value" isAnimationActive={false} content={<Tile {...({ total } as TileProps)} />} />
      </ResponsiveContainer>
    </ChartPanel>
  )
}
