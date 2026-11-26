import { format, parseISO } from 'date-fns'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { Analytics } from '@/lib/types'

import { ChartPanel, Legend } from './chart-kit'
import { AXIS, CHART, TOOLTIP } from './chart-tokens'

export function VolumeChart({ data, days, className }: { data: Analytics; days: number; className?: string }) {
  const trend = data.totals.resolved - data.totals.created
  return (
    <ChartPanel
      className={className}
      title="Volume"
      description={trend >= 0 ? `Resolved ${data.totals.resolved} against ${data.totals.created} opened: the backlog is shrinking or steady.` : `Opened ${data.totals.created} against ${data.totals.resolved} resolved: the backlog is growing.`}
      summary={`Line chart of tickets opened and resolved per day over the last ${days} days. ${data.totals.created} opened, ${data.totals.resolved} resolved.`}
      table={{ columns: ['Date', 'Opened', 'Resolved'], rows: data.volume.map((v) => [v.date, v.created, v.resolved]) }}
      empty={!data.totals.created}
    >
      <ResponsiveContainer width="100%" height={232}>
        <AreaChart data={data.volume} margin={{ top: 8, right: 8 }}>
          <defs>
            <linearGradient id="g-opened" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.opened} stopOpacity={0.28} />
              <stop offset="100%" stopColor={CHART.opened} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="g-resolved" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.resolved} stopOpacity={0.28} />
              <stop offset="100%" stopColor={CHART.resolved} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), 'd MMM')} {...AXIS} minTickGap={28} />
          <YAxis allowDecimals={false} {...AXIS} width={28} />
          <Tooltip {...TOOLTIP} labelFormatter={(d) => format(parseISO(String(d)), 'd MMM yyyy')} />
          <Area type="monotone" dataKey="created" name="Opened" stroke={CHART.opened} strokeWidth={2} fill="url(#g-opened)" />
          <Area type="monotone" dataKey="resolved" name="Resolved" stroke={CHART.resolved} strokeWidth={2} fill="url(#g-resolved)" />
        </AreaChart>
      </ResponsiveContainer>
      <Legend items={[{ label: 'Opened', color: CHART.opened }, { label: 'Resolved', color: CHART.resolved }]} />
    </ChartPanel>

  )
}

export function PriorityChart({ data }: { data: Analytics }) {
  return (
    <ChartPanel
      title="By priority"
      description="Share of incoming tickets by urgency."
      summary={`Donut chart of tickets by priority: ${data.by_priority.map((p) => `${p.label} ${p.count}`).join(', ')}.`}
      table={{ columns: ['Priority', 'Tickets'], rows: data.by_priority.map((p) => [p.label, p.count]) }}
      empty={!data.totals.created}
    >
      <ResponsiveContainer width="100%" height={188}>
        <PieChart>
          <Pie data={data.by_priority.filter((p) => p.count)} dataKey="count" nameKey="label" innerRadius={52} outerRadius={80} paddingAngle={2} stroke="var(--surface)" strokeWidth={2}>
            {data.by_priority.filter((p) => p.count).map((p) => (
              <Cell key={p.key} fill={CHART.priority[p.key]} />
            ))}
          </Pie>
          <Tooltip {...TOOLTIP} />
        </PieChart>
      </ResponsiveContainer>
      <Legend items={data.by_priority.map((p) => ({ label: p.label, color: CHART.priority[p.key], value: p.count }))} />
    </ChartPanel>
  )
}

export function CategoryChart({ data }: { data: Analytics }) {
  return (
    <ChartPanel
      title="By category"
      description="What customers ask about most. Useful for deciding which help articles to write."
      summary={`Bar chart of tickets by category: ${data.by_category.map((c) => `${c.label} ${c.count}`).join(', ')}.`}
      table={{ columns: ['Category', 'Tickets'], rows: data.by_category.map((c) => [c.label, c.count]) }}
      empty={!data.totals.created}
    >
      <ResponsiveContainer width="100%" height={Math.max(200, data.by_category.length * 34)}>
        <BarChart data={data.by_category} layout="vertical" margin={{ left: 4, right: 12 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART.grid} />
          <XAxis type="number" allowDecimals={false} {...AXIS} />
          <YAxis type="category" dataKey="label" {...AXIS} width={124} />
          <Tooltip {...TOOLTIP} />
          <Bar dataKey="count" name="Tickets" radius={[0, 6, 6, 0]} barSize={18}>
            {data.by_category.map((c, i) => (
              <Cell key={c.key} fill={CHART.series[i % CHART.series.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartPanel>

  )
}

export function SentimentChart({ data }: { data: Analytics }) {
  return (
    <ChartPanel
      title="Customer sentiment"
      description="AI-read tone of incoming tickets. A rising red share is an early warning."
      summary={`Bar chart of ticket sentiment: ${data.by_sentiment.map((s) => `${s.label} ${s.count}`).join(', ')}.`}
      table={{ columns: ['Sentiment', 'Tickets'], rows: data.by_sentiment.map((s) => [s.label, s.count]) }}
      empty={!data.by_sentiment.some((s) => s.count)}
    >
      <ResponsiveContainer width="100%" height={232}>
        <BarChart data={data.by_sentiment} margin={{ top: 8, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis allowDecimals={false} {...AXIS} width={28} />
          <Tooltip {...TOOLTIP} />
          <Bar dataKey="count" name="Tickets" radius={[6, 6, 0, 0]} maxBarSize={72}>
            {data.by_sentiment.map((s) => (
              <Cell key={s.key} fill={CHART.sentiment[s.key]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartPanel>
  )
}
