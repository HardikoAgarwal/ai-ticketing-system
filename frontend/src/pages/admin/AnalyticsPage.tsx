import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { PageHeader, Stat } from '@/components/common'
import { ErrorState } from '@/components/states'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSearchParams } from 'react-router-dom'
import { CATEGORY_META } from '@/lib/constants'
import { adminApi } from '@/lib/endpoints'
import { formatDuration, formatNumber } from '@/lib/format'

const PRIORITY_COLORS: Record<string, string> = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#fbbf24', LOW: '#94a3b8' }
const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`)

function ChartCard({ title, caption, children, empty }: { title: string; caption: string; children: ReactNode; empty?: boolean }) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mb-3 text-xs text-muted-foreground">{caption}</p>
      {empty ? <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">No data in this period yet</div> : children}
    </section>
  )
}

export function AnalyticsPage() {
  const [params, setParams] = useSearchParams()
  const days = [7, 30, 90].includes(Number(params.get('days'))) ? Number(params.get('days')) : 30
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['analytics', days], queryFn: () => adminApi.analytics(days) })

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Analytics"
        description="How fast we respond, where requests come from, and how well the AI is helping."
        actions={
          <Tabs value={String(days)} onValueChange={(v) => setParams({ days: v }, { replace: true })}>
            <TabsList>
              <TabsTrigger value="7">7 days</TabsTrigger>
              <TabsTrigger value="30">30 days</TabsTrigger>
              <TabsTrigger value="90">90 days</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Tickets created" value={data.totals.created} hint={`${data.totals.open_now} open right now`} />
            <Stat label="Avg first response" value={formatDuration(data.avg_first_response_minutes)} hint="From submission to first reply" />
            <Stat label="Avg resolution" value={formatDuration(data.avg_resolution_minutes)} hint="From submission to resolved" />
            <Stat
              label="SLA breach rate"
              value={pct(data.sla.breach_rate)}
              tone={data.sla.breach_rate && data.sla.breach_rate > 0.2 ? 'danger' : 'default'}
              hint={`${data.sla.met} met · ${data.sla.breached} late · ${data.sla.overdue} overdue`}
            />
            <Stat
              label="AI override rate"
              value={pct(data.ai_overrides.category_override_rate)}
              hint={`Category changed on ${data.ai_overrides.category_overridden} of ${data.ai_overrides.classified}`}
            />
            <Stat
              label="AI cost"
              value={`$${data.ai_usage.cost_usd.toFixed(4)}`}
              hint={`${formatNumber(data.ai_usage.calls)} calls · ${data.ai_usage.failures} failed`}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ChartCard title="Volume" caption="Tickets opened vs resolved per day. A widening gap means the backlog is growing." empty={!data.totals.created}>
                <ResponsiveContainer width="100%" height={224}>
                  <LineChart data={data.volume}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), 'd MMM')} fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} width={28} />
                    <Tooltip labelFormatter={(d) => format(parseISO(String(d)), 'd MMM yyyy')} />
                    <Line type="monotone" dataKey="created" name="Opened" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="resolved" name="Resolved" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <ChartCard title="By priority" caption="Share of incoming tickets by urgency." empty={!data.totals.created}>
              <ResponsiveContainer width="100%" height={224}>
                <PieChart>
                  <Pie data={data.by_priority.filter((p) => p.count)} dataKey="count" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {data.by_priority.filter((p) => p.count).map((p) => (
                      <Cell key={p.key} fill={PRIORITY_COLORS[p.key]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 text-xs">
                {data.by_priority.map((p) => (
                  <span key={p.key} className="flex items-center gap-1">
                    <span className="size-2 rounded-full" style={{ background: PRIORITY_COLORS[p.key] }} />
                    {p.label} {p.count}
                  </span>
                ))}
              </div>
            </ChartCard>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="By category" caption="What authors ask about most. Useful for improving self-serve help content." empty={!data.totals.created}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.by_category.map((c) => ({ ...c, short: CATEGORY_META[c.key].short }))} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="short" fontSize={11} tickLine={false} axisLine={false} width={96} />
                  <Tooltip />
                  <Bar dataKey="count" name="Tickets" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="AI assistance" caption="Token usage, cost, and how often agents send AI drafts as-is vs edited.">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Classification calls', data.ai_usage.by_feature.find((f) => f.feature === 'CLASSIFY')?.calls ?? 0],
                  ['Draft calls', data.ai_usage.by_feature.find((f) => f.feature === 'DRAFT')?.calls ?? 0],
                  ['Prompt tokens', formatNumber(data.ai_usage.prompt_tokens)],
                  ['Completion tokens', formatNumber(data.ai_usage.completion_tokens)],
                  ['Avg latency', data.ai_usage.avg_latency_ms ? `${(data.ai_usage.avg_latency_ms / 1000).toFixed(1)}s` : '—'],
                  ['Failure rate', data.ai_usage.calls ? pct(data.ai_usage.failures / data.ai_usage.calls) : '—'],
                  ['Replies using AI draft as-is', data.drafts.ai_as_is],
                  ['Replies using edited AI draft', data.drafts.ai_edited],
                  ['Replies written manually', data.drafts.total - data.drafts.ai_as_is - data.drafts.ai_edited],
                  ['Priority override rate', pct(data.ai_overrides.priority_override_rate)],
                ].map(([k, v]) => (
                  <div key={k as string} className="rounded-lg bg-muted/60 p-3">
                    <p className="text-xs text-muted-foreground">{k}</p>
                    <p className="mt-1 font-semibold">{v}</p>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  )
}
