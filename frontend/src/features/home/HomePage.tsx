import type { UseQueryResult } from '@tanstack/react-query'
import { Clock } from 'lucide-react'
import { useCallback, useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { ErrorState, SegmentedControl, Skeleton } from '@/components/ds'
import { useRegisterCommands, type Command } from '@/components/shell/commands'
import { PageTitle } from '@/features/shared/PageTitle'
import type { Analytics } from '@/lib/types'

import { ActivityFeed } from './ActivityFeed'
import { AiInsights } from './AiInsights'
import { NeedsAttention, SlaHealth } from './Attention'
import { CategoryChart, PriorityChart, SentimentChart, VolumeChart } from './Charts'
import { KpiRow } from './KpiRow'
import { TicketAging, Workload } from './QueueInsights'
import { useHomeData, useWorkload } from './useHomeData'

const RANGES = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
]

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

/** The workspace home: what needs doing now, how the period is going, queue shape, and how the AI is helping. */
export function HomePage() {
  const { slug } = useWorkspace()
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const days = [7, 30, 90].includes(Number(params.get('days'))) ? Number(params.get('days')) : 30
  const setDays = useCallback((v: string) => setParams({ days: v }, { replace: true }), [setParams])
  const { analytics, stats, open, usage, feed } = useHomeData(days)
  const workload = useWorkload(open.data?.results)
  const inbox = useCallback((qs: string) => `/w/${slug}/agent/tickets?${qs}`, [slug])

  const commands = useMemo<Command[]>(
    () => RANGES.map((r) => ({ id: `home.range.${r.value}`, title: `Home: show last ${r.label}`, group: 'Home', icon: Clock, keywords: ['analytics', 'range', 'period', 'dashboard'], perform: () => setDays(r.value) })),
    [setDays],
  )
  useRegisterCommands(commands)

  const first = user?.full_name?.split(' ')[0]
  const s = stats.data
  const openCount = s ? s.open + s.in_progress : undefined
  const summary = s
    ? openCount
      ? `${openCount} open ticket${openCount === 1 ? '' : 's'}${s.overdue ? `, ${s.overdue} past the response target.` : ', all within target.'}`
      : 'Nothing is open. Enjoy the quiet.'
    : 'Checking the queue…'
  const a = analytics.data

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-8">
      <PageTitle
        title={`${greeting()}${first ? `, ${first}` : ''}`}
        description={summary}
        actions={<SegmentedControl value={String(days)} onChange={setDays} options={RANGES} ariaLabel="Date range for the period figures and charts" />}
      />

      <KpiRow stats={s} analytics={a} days={days} inbox={inbox} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <NeedsAttention tickets={open.data?.results} loading={open.isLoading} error={open.isError ? open.error : undefined} onRetry={() => open.refetch()} slug={slug} inbox={inbox} />
        <SlaHealth analytics={a} stats={s} open={open.data?.results} inbox={inbox} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Gate q={analytics} height="h-80" className="lg:col-span-2">
          {(a) => <VolumeChart data={a} days={days} />}
        </Gate>
        <TicketAging data={open.data} loading={open.isLoading} error={open.isError ? open.error : undefined} onRetry={() => open.refetch()} />
      </div>

      <Gate q={analytics} height="h-64">
        {(a) => <AiInsights data={a} usage={usage.data} />}
      </Gate>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Workload rows={workload} loading={open.isLoading} error={open.isError ? open.error : undefined} onRetry={() => open.refetch()} inbox={inbox} />
        <Gate q={analytics} height="h-80">
          {(a) => <PriorityChart data={a} />}
        </Gate>
        <Gate q={analytics} height="h-80">
          {(a) => <SentimentChart data={a} />}
        </Gate>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Gate q={analytics} height="h-80">
          {(a) => <CategoryChart data={a} />}
        </Gate>
        <ActivityFeed feed={feed.data} loading={feed.isLoading} error={feed.isError ? feed.error : undefined} onRetry={() => feed.refetch()} slug={slug} />
      </div>
    </div>
  )
}

/** Shows a skeleton, an error with retry, or the content for one analytics-backed block, so each block fails on its own. */
function Gate({ q, height, className, children }: { q: UseQueryResult<Analytics>; height: string; className?: string; children: (a: Analytics) => ReactNode }) {
  if (q.isError) return <ErrorState className={className} error={q.error} onRetry={() => q.refetch()} title="We couldn't load this" />
  if (!q.data) {
    return (
      <div role="status" aria-label="Loading" className={className}>
        <Skeleton className={`${height} rounded-panel`} />
        <span className="sr-only">Loading…</span>
      </div>
    )
  }
  return <div className={`${className ?? ''} [&>*]:h-full`}>{children(q.data)}</div>
}
