import type { UseQueryResult } from '@tanstack/react-query'
import { Clock, LayoutDashboard } from 'lucide-react'
import { useCallback, useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useWorkspace } from '@/auth/workspace'
import { ErrorState, SegmentedControl, Skeleton } from '@/components/ds'
import { useRegisterCommands, type Command } from '@/components/shell/commands'
import { PageHeader } from '@/features/shared/PageHeader'
import type { Analytics } from '@/lib/types'

import { CategoryChart, PriorityChart, SentimentChart, VolumeChart } from './Charts'
import { KpiRow } from './KpiRow'
import { TicketAging } from './TicketAging'
import { Workload } from './QueueInsights'
import { SlaGauge } from './SlaGauge'
import { useHomeData, useWorkload } from './useHomeData'

const RANGES = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
]

/** The workspace home: analytics only. Tickets themselves live under Tickets. */
export function HomePage() {
  const { slug } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const days = [7, 30, 90].includes(Number(params.get('days'))) ? Number(params.get('days')) : 30
  const setDays = useCallback((v: string) => setParams({ days: v }, { replace: true }), [setParams])
  const { analytics, open } = useHomeData(days)
  const workload = useWorkload(open.data?.results)
  const inbox = useCallback((qs: string) => `/w/${slug}/agent/tickets?${qs}`, [slug])
  const openError = open.isError ? open.error : undefined

  const commands = useMemo<Command[]>(
    () => RANGES.map((r) => ({ id: `home.range.${r.value}`, title: `Home: show last ${r.label}`, group: 'Home', icon: Clock, keywords: ['analytics', 'range', 'period', 'dashboard'], perform: () => setDays(r.value) })),
    [setDays],
  )
  useRegisterCommands(commands)

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-8">
      <PageHeader
        icon={LayoutDashboard}
        title="Overview"
        description={`How support is doing over the last ${days} days, compared with the ${days} days before.`}
        actions={<SegmentedControl value={String(days)} onChange={setDays} options={RANGES} ariaLabel="Date range for the figures and charts" />}
      />

      <KpiRow analytics={analytics.data} days={days} />

      <Gate q={analytics} height="h-60">
        {(a) => <SentimentChart data={a} />}
      </Gate>

      <Gate q={analytics} height="h-[500px]">
        {(a) => <VolumeChart data={a} days={days} />}
      </Gate>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <Gate q={analytics} height="h-[600px]" className="xl:col-span-2">
          {(a) => <PriorityChart data={a} />}
        </Gate>
        <Gate q={analytics} height="h-[600px]" className="xl:col-span-3">
          {(a) => <CategoryChart data={a} />}
        </Gate>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <TicketAging className="xl:col-span-3" data={open.data} loading={open.isLoading} error={openError} onRetry={() => open.refetch()} />
        <Gate q={analytics} height="h-[460px]" className="xl:col-span-2">
          {(a) => <SlaGauge data={a} />}
        </Gate>
      </div>

      <Workload rows={workload} loading={open.isLoading} error={openError} onRetry={() => open.refetch()} inbox={inbox} />
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
