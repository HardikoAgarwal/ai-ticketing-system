import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { CheckCheck, Clock, Inbox, ShieldAlert, Star, Timer } from 'lucide-react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { useWorkspace } from '@/auth/workspace'
import { ErrorState, SegmentedControl, Skeleton, Stat } from '@/components/ds'
import { useRegisterCommands, type Command } from '@/components/shell/commands'
import { PageTitle } from '@/features/shared/PageTitle'
import { formatDuration } from '@/lib/format'

import { AiInsights } from './AiInsights'
import { ChartPanel, Legend } from './chart-kit'
import { AXIS, CHART, TOOLTIP } from './chart-tokens'

const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`)
const RANGES = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
]

export function AnalyticsPage() {
  const { slug, api } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const days = [7, 30, 90].includes(Number(params.get('days'))) ? Number(params.get('days')) : 30
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['analytics', slug, days], queryFn: () => api.analytics(days) })
  const setDays = (v: string) => setParams({ days: v }, { replace: true })

  const commands = useMemo<Command[]>(() => RANGES.map((r) => ({ id: `analytics.${r.value}`, title: `Analytics: last ${r.label}`, group: 'Analytics', icon: Clock, keywords: ['range', 'period'], perform: () => setParams({ days: r.value }, { replace: true }) })), [setParams])
  useRegisterCommands(commands)

  const trend = data ? data.totals.resolved - data.totals.created : 0

  return (
    <div className="flex flex-col gap-5 pb-4">
      <PageTitle
        title="Analytics"
        description="How fast we respond, where requests come from, and how well the AI is helping."
        actions={<SegmentedControl value={String(days)} onChange={setDays} options={RANGES} ariaLabel="Date range" />}
      />

      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <div role="status" aria-label="Loading analytics" className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-panel" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-panel" />
          <span className="sr-only">Loading…</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <Stat icon={Inbox} tone="violet" label="Tickets created" value={data.totals.created} hint={`${data.totals.open_now} open now`} />
            <Stat icon={Timer} tone="blue" label="Avg first response" value={formatDuration(data.avg_first_response_minutes)} hint="Submission to first reply" />
            <Stat icon={CheckCheck} tone="green" label="Avg resolution" value={formatDuration(data.avg_resolution_minutes)} hint="Submission to resolved" />
            <Stat icon={ShieldAlert} tone={data.sla.breach_rate && data.sla.breach_rate > 0.2 ? 'red' : 'amber'} label="SLA breach rate" value={pct(data.sla.breach_rate)} hint={`${data.sla.met} met · ${data.sla.breached} late · ${data.sla.overdue} overdue`} />
            <Stat icon={Star} tone="peach" label="CSAT" value={data.csat.average ? `${data.csat.average.toFixed(1)} / 5` : '—'} hint={`${data.csat.responses} ${data.csat.responses === 1 ? 'response' : 'responses'}`} />
            <Stat icon={Clock} tone="violet" label="AI override rate" value={pct(data.ai_overrides.category_override_rate)} hint={`Category changed on ${data.ai_overrides.category_overridden} of ${data.ai_overrides.classified}`} />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <ChartPanel
              className="lg:col-span-2"
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
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
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
          </div>

          <AiInsights data={data} />
        </>
      )}
    </div>
  )
}
