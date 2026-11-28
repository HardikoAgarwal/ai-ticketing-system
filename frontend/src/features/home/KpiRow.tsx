import { ArrowDownRight, ArrowUpRight, CheckCheck, Inbox, Minus, Star, Timer, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'

import { Panel, Skeleton } from '@/components/ds'
import type { Analytics } from '@/lib/types'

import { CHART, fill, on, type Hue } from './chart-tokens'
import { Duration } from './Duration'

/**
 * The comparison line under a figure: a solid arrow pill with the change, then the earlier figure in words.
 * Green means better and red means worse (`goodWhen` says which direction is better); direction is also spelled out in text and for screen readers.
 */
function Compare({ now, before, goodWhen, periodLabel, show = (n) => String(n), unit = 'pct' }: { now: number | null; before: number | null; goodWhen: 'up' | 'down'; periodLabel: string; show?: (n: number) => ReactNode; unit?: 'pct' | 'abs' }) {
  if (before === null) return <p className="truncate text-xs whitespace-nowrap text-ink-2">No earlier data</p>
  const diff = (now ?? 0) - before
  const hue: Hue = diff === 0 ? 'slate' : (diff > 0) === (goodWhen === 'up') ? 'mint' : 'rose'
  const Icon = diff === 0 ? Minus : diff > 0 ? ArrowUpRight : ArrowDownRight
  const amount = unit === 'abs' || before === 0 ? Math.abs(diff).toFixed(unit === 'abs' ? 1 : 0) : `${Math.abs(Math.round((diff / before) * 100))}%`
  return (
    <div className="flex items-center gap-2 whitespace-nowrap" title={`${periodLabel}: ${typeof show(before) === 'string' ? show(before) : ''}`}>
      <span className="inline-flex shrink-0 items-center gap-0.5 rounded-chip py-0.5 pr-2 pl-1.5 text-xs font-semibold tabular-nums" style={{ background: fill(hue), color: on(hue) }}>
        <Icon className="size-3.5" aria-hidden />
        {diff === 0 ? 'Same' : amount}
        <span className="sr-only">{diff > 0 ? ' higher' : diff < 0 ? ' lower' : ''}, {hue === 'mint' ? 'an improvement' : hue === 'rose' ? 'worse' : 'unchanged'}, compared with the {periodLabel}</span>
      </span>
      <span className="min-w-0 truncate text-xs text-ink-2">
        vs <span className="font-semibold text-ink">{show(before)}</span> last period
      </span>
    </div>
  )
}

/** A trend line with no hover, tooltip or focus: it is a picture, the number above it is the data. */
function Spark({ data, color, id }: { data: number[]; color: string; id: string }) {
  const rows = data.map((v, i) => ({ i, v }))
  return (
    <div className="pointer-events-none w-full" aria-hidden>
      <ResponsiveContainer width="100%" height={64}>
        <AreaChart data={rows} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} tabIndex={-1}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <YAxis hide domain={[0, 'dataMax + 1']} />
          <Area isAnimationActive={false} type="monotone" dataKey="v" stroke={color} strokeWidth={2.5} fill={`url(#${id})`} dot={false} activeDot={false} tooltipType="none" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5 sm:gap-1" role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const part = Math.max(0, Math.min(1, value - (n - 1)))
        return (
          <span key={n} className="relative inline-flex">
            <Star className="size-5 text-line-strong sm:size-7" aria-hidden />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${part * 100}%` }}>
              <Star className="size-5 text-transparent sm:size-7" style={{ fill: fill('butter') }} aria-hidden />
            </span>
          </span>
        )
      })}
    </div>
  )
}

function Kpi({ icon: Icon, label, value, compare, visual }: { icon: LucideIcon; label: string; value: ReactNode; compare: ReactNode; visual: ReactNode }) {
  return (
    <Panel className="flex min-w-0 flex-col p-4 sm:p-5">
      <div className="flex items-center gap-2.5 text-sm font-semibold text-ink-2">
        <span className="flex size-9 items-center justify-center rounded-control bg-violet-soft text-violet ring-1 ring-violet/20 ring-inset">
          <Icon className="size-[18px]" aria-hidden />
        </span>
        {label}
      </div>
      <div className="mt-4 text-4xl leading-10 font-semibold tracking-tight text-ink tabular-nums sm:text-[44px] sm:leading-[48px]">{value}</div>
      <div className="mt-2.5">{compare}</div>
      <div className="mt-4 flex min-h-16 flex-1 items-end">{visual}</div>
    </Panel>
  )
}

/** The four period figures. Each compares with the period just before it and has a picture of its own. */
export function KpiRow({ analytics: a, days }: { analytics?: Analytics; days: number }) {
  if (!a) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-panel" />
        ))}
      </div>
    )
  }
  const period = `previous ${days} days`
  const csat = a.csat.average
  const prev = a.previous
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <Kpi
        icon={CheckCheck}
        label="Resolved"
        value={a.totals.resolved}
        compare={<Compare now={a.totals.resolved} before={prev.resolved} goodWhen="up" periodLabel={period} />}
        visual={<Spark id="k-res" data={a.volume.map((v) => v.resolved)} color={CHART.resolved} />}
      />
      <Kpi
        icon={Inbox}
        label="New tickets"
        value={a.totals.created}
        compare={<Compare now={a.totals.created} before={prev.created} goodWhen="down" periodLabel={period} />}
        visual={<Spark id="k-new" data={a.volume.map((v) => v.created)} color={CHART.opened} />}
      />
      <Kpi
        icon={Timer}
        label="First response"
        value={<Duration minutes={a.avg_first_response_minutes} />}
        compare={<Compare now={a.avg_first_response_minutes} before={prev.avg_first_response_minutes} goodWhen="down" periodLabel={period} show={(n) => <Duration minutes={n} className="text-ink" unitClassName="text-ink-2" />} />}
        visual={
          <dl className="flex w-full flex-col gap-0.5 rounded-control bg-sunken px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <dt className="text-xs font-medium text-ink-2">Average time to resolve</dt>
            <dd className="text-xl leading-6 font-semibold text-ink">
              <Duration minutes={a.avg_resolution_minutes} />
            </dd>
          </dl>
        }
      />
      <Kpi
        icon={Star}
        label="Satisfaction"
        value={csat ? <>{csat.toFixed(1)}<span className="text-xl font-medium text-ink-3"> / 5</span></> : '—'}
        compare={csat ? <Compare now={csat} before={prev.csat_average} goodWhen="up" unit="abs" periodLabel={period} show={(n) => n.toFixed(1)} /> : <p className="text-xs text-ink-2">No ratings yet</p>}
        visual={
          <div className="w-full">
            <Stars value={csat ?? 0} />
            <p className="mt-1.5 text-xs text-ink-2">
              From {a.csat.responses} rating{a.csat.responses === 1 ? '' : 's'}
            </p>
          </div>
        }
      />
    </div>
  )
}
