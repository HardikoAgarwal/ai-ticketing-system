import { ArrowDownRight, ArrowUpRight, CheckCheck, Clock, Flame, Inbox, Minus, Star, Timer, UserX, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Panel, Skeleton } from '@/components/ds'
import { formatDuration } from '@/lib/format'
import type { Analytics, QueueStats } from '@/lib/types'
import { cn } from '@/lib/utils'

const TILE = {
  blue: 'bg-sky text-sky-ink',
  red: 'bg-rose text-rose-ink',
  amber: 'bg-butter text-butter-ink',
  peach: 'bg-peach text-peach-ink',
  green: 'bg-mint text-mint-ink',
  violet: 'bg-lav text-lav-ink',
} as const

/** "vs previous" change. Direction is shown with an arrow and words, never colour alone. `goodWhen` says which direction is an improvement. */
export function Delta({ now, before, goodWhen, unit = '%', periodLabel }: { now: number | null; before: number | null; goodWhen: 'up' | 'down'; unit?: '%' | 'abs'; periodLabel: string }) {
  if (now === null || before === null || before === 0) return <span className="text-xs text-ink-3">No earlier data</span>
  const diff = now - before
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-ink-3">
        <Minus className="size-3" aria-hidden /> Same as {periodLabel}
      </span>
    )
  }
  const up = diff > 0
  const good = (goodWhen === 'up') === up
  const text = unit === '%' ? `${Math.abs(Math.round((diff / before) * 100))}%` : Math.abs(diff).toFixed(1)
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', good ? 'text-mint-ink' : 'text-rose-ink')}>
      <Icon className="size-3.5" aria-hidden />
      <span>
        {text}
        <span className="sr-only">{up ? ' higher' : ' lower'}, {good ? 'an improvement' : 'worse'},</span>
        <span className="font-normal text-ink-3"> vs {periodLabel}</span>
      </span>
    </span>
  )
}

function Cell({ icon: Icon, tone, label, value, foot, to, className }: { icon: LucideIcon; tone: keyof typeof TILE; label: string; value: ReactNode; foot?: ReactNode; to?: string; className?: string }) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
        <span className={cn('flex size-7 items-center justify-center rounded-chip', TILE[tone])}>
          <Icon className="size-3.5" aria-hidden />
        </span>
        {label}
      </span>
      <span className="mt-2.5 block text-[32px] leading-9 font-semibold tracking-tight text-ink tabular-nums">{value}</span>
      <span className="mt-1.5 block min-h-4 text-xs text-ink-3">{foot}</span>
    </>
  )
  const cls = cn('block h-full min-w-0 bg-surface p-5', className)
  return to ? (
    <Link to={to} className={cn(cls, 'transition-colors hover:bg-surface-2 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none focus-visible:ring-inset')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

/** Two strips: what needs doing right now (clickable into the inbox) and how the chosen period compares with the one before. */
export function KpiRow({ stats, analytics, days, inbox }: { stats?: QueueStats; analytics?: Analytics; days: number; inbox: (qs: string) => string }) {
  const open = stats ? stats.open + stats.in_progress : undefined
  const period = `previous ${days} days`
  const a = analytics
  const csatNow = a?.csat.average ?? null
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Panel aria-labelledby="kpi-now" className="overflow-hidden">
        <h2 id="kpi-now" className="sr-only">
          Right now
        </h2>
        <div className="grid h-full grid-cols-2 gap-px bg-line sm:grid-cols-4">
          {stats ? (
            <>
              <Cell icon={Inbox} tone="blue" label="Open now" value={open} foot={`${stats.in_progress} in progress`} to={inbox('view=attention')} />
              <Cell icon={Clock} tone="red" label="Overdue reply" value={stats.overdue} foot={stats.overdue ? 'Past the response target' : 'All within target'} to={inbox('view=attention&sla=overdue')} />
              <Cell icon={UserX} tone="amber" label="Unassigned" value={stats.unassigned} foot={stats.unassigned ? 'Waiting for an owner' : 'Everyone has an owner'} to={inbox('view=unassigned')} />
              <Cell icon={Flame} tone="peach" label="Critical" value={stats.critical} foot={stats.critical ? 'Highest priority' : 'None open'} to={inbox('view=attention&priority=CRITICAL')} />
            </>
          ) : (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-surface p-5"><Skeleton className="h-24" /></div>)
          )}
        </div>
      </Panel>

      <Panel aria-labelledby="kpi-period" className="overflow-hidden">
        <h2 id="kpi-period" className="sr-only">
          Last {days} days
        </h2>
        <div className="grid h-full grid-cols-2 gap-px bg-line sm:grid-cols-4">
          {a ? (
            <>
              <Cell icon={CheckCheck} tone="green" label="Resolved" value={a.totals.resolved} foot={<Delta now={a.totals.resolved} before={a.previous.resolved} goodWhen="up" periodLabel={period} />} />
              <Cell icon={Inbox} tone="violet" label="Created" value={a.totals.created} foot={<Delta now={a.totals.created} before={a.previous.created} goodWhen="down" periodLabel={period} />} />
              <Cell
                icon={Timer}
                tone="blue"
                label="First response"
                value={formatDuration(a.avg_first_response_minutes)}
                foot={<Delta now={a.avg_first_response_minutes} before={a.previous.avg_first_response_minutes} goodWhen="down" periodLabel={period} />}
              />
              <Cell
                icon={Star}
                tone="amber"
                label="CSAT"
                value={csatNow ? `${csatNow.toFixed(1)}/5` : '—'}
                foot={csatNow ? <Delta now={csatNow} before={a.previous.csat_average} goodWhen="up" unit="abs" periodLabel={period} /> : `${a.csat.responses} responses`}
              />
            </>
          ) : (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-surface p-5"><Skeleton className="h-24" /></div>)
          )}
        </div>
      </Panel>
    </div>
  )
}
