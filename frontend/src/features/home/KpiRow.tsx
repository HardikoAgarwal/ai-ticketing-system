import { ArrowDownRight, ArrowUpRight, CheckCheck, Clock, Flame, Inbox, Minus, Star, Timer, UserX, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'

import { Panel, Skeleton } from '@/components/ds'
import { formatDuration } from '@/lib/format'
import type { Analytics, QueueStats } from '@/lib/types'
import { cn } from '@/lib/utils'

import { CHART, HUE, mix, type Hue } from './chart-tokens'

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

function Spark({ data, color, id }: { data: number[]; color: string; id: string }) {
  const rows = data.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width="100%" height={56}>
      <AreaChart data={rows} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <YAxis hide domain={[0, 'dataMax + 1']} />
        <Area isAnimationActive={false} type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1" role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, value - (n - 1)))
        return (
          <span key={n} className="relative inline-flex">
            <Star className="size-6 text-line-strong" aria-hidden />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="size-6 fill-butter-ink text-butter-ink" aria-hidden />
            </span>
          </span>
        )
      })}
    </div>
  )
}

function Kpi({ icon: Icon, hue, label, value, delta, visual }: { icon: LucideIcon; hue: Hue; label: string; value: ReactNode; delta: ReactNode; visual: ReactNode }) {
  return (
    <Panel className="flex min-w-0 flex-col p-4 sm:p-5">
      <div className="flex items-center gap-2.5 text-sm font-medium text-ink-2">
        <span className="flex size-8 items-center justify-center rounded-control" style={{ background: mix(hue, 22), color: HUE[hue] }}>
          <Icon className="size-4" aria-hidden />
        </span>
        {label}
      </div>
      <div className="mt-4 text-4xl leading-10 sm:text-[44px] sm:leading-[48px] font-semibold tracking-tight text-ink tabular-nums">{value}</div>
      <div className="mt-1.5 min-h-4">{delta}</div>
      <div className="mt-4 flex min-h-14 items-end">{visual}</div>
    </Panel>
  )
}

/** The four period figures, each with a picture of its own: a trend line, a star scale, or the matching second number. */
export function KpiRow({ analytics: a, days }: { analytics?: Analytics; days: number }) {
  if (!a) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-52 rounded-panel sm:h-60" />
        ))}
      </div>
    )
  }
  const period = `previous ${days} days`
  const csat = a.csat.average
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <Kpi
        icon={CheckCheck}
        hue="mint"
        label="Resolved"
        value={a.totals.resolved}
        delta={<Delta now={a.totals.resolved} before={a.previous.resolved} goodWhen="up" periodLabel={period} />}
        visual={<div className="w-full"><Spark id="k-res" data={a.volume.map((v) => v.resolved)} color={CHART.resolved} /></div>}
      />
      <Kpi
        icon={Inbox}
        hue="lav"
        label="New tickets"
        value={a.totals.created}
        delta={<Delta now={a.totals.created} before={a.previous.created} goodWhen="down" periodLabel={period} />}
        visual={<div className="w-full"><Spark id="k-new" data={a.volume.map((v) => v.created)} color={CHART.opened} /></div>}
      />
      <Kpi
        icon={Timer}
        hue="sky"
        label="First response"
        value={formatDuration(a.avg_first_response_minutes)}
        delta={<Delta now={a.avg_first_response_minutes} before={a.previous.avg_first_response_minutes} goodWhen="down" periodLabel={period} />}
        visual={
          <dl className="w-full rounded-control bg-sunken px-3 py-2.5">
            <dt className="text-xs text-ink-2">Average time to resolve</dt>
            <dd className="text-lg leading-6 font-semibold text-ink tabular-nums">{formatDuration(a.avg_resolution_minutes)}</dd>
          </dl>
        }
      />
      <Kpi
        icon={Star}
        hue="butter"
        label="Customer satisfaction"
        value={csat ? <>{csat.toFixed(1)}<span className="text-xl font-medium text-ink-3"> / 5</span></> : '—'}
        delta={csat ? <Delta now={csat} before={a.previous.csat_average} goodWhen="up" unit="abs" periodLabel={period} /> : <span className="text-xs text-ink-3">No ratings yet</span>}
        visual={
          <div className="w-full">
            <Stars value={csat ?? 0} />
            <p className="mt-1.5 text-xs text-ink-2">{a.csat.responses} rating{a.csat.responses === 1 ? '' : 's'}</p>
          </div>
        }
      />
    </div>
  )
}

/** The live queue as four plain numbers. Each opens the ticket list already filtered. */
export function QueueNow({ stats, inbox }: { stats?: QueueStats; inbox: (qs: string) => string }) {
  const cells = stats
    ? [
        { icon: Inbox, hue: 'sky' as Hue, label: 'Open now', value: stats.open + stats.in_progress, foot: `${stats.in_progress} in progress`, to: inbox('view=attention') },
        { icon: Clock, hue: 'rose' as Hue, label: 'Overdue reply', value: stats.overdue, foot: stats.overdue ? 'Past the response target' : 'All within target', to: inbox('view=attention&sla=overdue') },
        { icon: UserX, hue: 'butter' as Hue, label: 'Unassigned', value: stats.unassigned, foot: stats.unassigned ? 'Waiting for an owner' : 'Everyone has an owner', to: inbox('view=unassigned') },
        { icon: Flame, hue: 'peach' as Hue, label: 'Critical', value: stats.critical, foot: stats.critical ? 'Highest priority' : 'None open', to: inbox('view=attention&priority=CRITICAL') },
      ]
    : []
  return (
    <Panel aria-label="Queue right now" className="overflow-hidden">
      <div className="grid grid-cols-2 gap-px bg-line lg:grid-cols-4">
        {stats
          ? cells.map((c) => (
              <Link key={c.label} to={c.to} className="flex items-center gap-4 bg-surface p-5 transition-colors hover:bg-surface-2 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none focus-visible:ring-inset">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-panel" style={{ background: mix(c.hue, 22), color: HUE[c.hue] }}>
                  <c.icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink-2">{c.label}</span>
                  <span className="block text-[28px] leading-8 font-semibold text-ink tabular-nums">{c.value}</span>
                  <span className="block truncate text-xs text-ink-3">{c.foot}</span>
                </span>
              </Link>
            ))
          : Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface p-5">
                <Skeleton className="h-16" />
              </div>
            ))}
      </div>
    </Panel>
  )
}
