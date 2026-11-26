import { Timer } from 'lucide-react'

import type { Analytics } from '@/lib/types'

import { ChartPanel } from './chart-kit'
import { fill, type Hue } from './chart-tokens'

const R = 84
const ARC = Math.PI * R
const PATH = `M ${100 - R} 100 A ${R} ${R} 0 0 1 ${100 + R} 100`

/** Response targets as a half-circle gauge: the arc is split into met / missed / overdue, the share met is the big number. */
export function SlaGauge({ data, className }: { data: Analytics; className?: string }) {
  const { met, breached, overdue } = data.sla
  const total = met + breached + overdue
  const parts: { key: string; label: string; value: number; hue: Hue }[] = [
    { key: 'met', label: 'Met', value: met, hue: 'mint' },
    { key: 'missed', label: 'Missed', value: breached, hue: 'rose' },
    { key: 'overdue', label: 'Overdue now', value: overdue, hue: 'butter' },
  ]
  let offset = 0
  return (
    <ChartPanel
      icon={Timer}
      className={className}
      title="Response targets"
      description="Replies on time, late, and still waiting."
      summary={`Gauge of response targets: ${met} met, ${breached} missed, ${overdue} overdue now.`}
      empty={!total}
    >
      <div className="relative mx-auto w-full max-w-[420px]">
        <svg viewBox="0 0 200 112" className="w-full" aria-hidden>
          <path d={PATH} fill="none" strokeWidth={24} className="stroke-sunken" />
          {parts.map((p) => {
            if (!p.value) return null
            const len = (p.value / total) * ARC
            const start = offset
            offset += len
            return <path key={p.key} d={PATH} fill="none" strokeWidth={24} stroke={fill(p.hue)} strokeDasharray={`${Math.max(0, len - 2)} ${ARC}`} strokeDashoffset={-start} />
          })}
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span className="text-5xl leading-[48px] font-semibold tracking-tight text-ink tabular-nums">{Math.round((met / total) * 100)}%</span>
          <span className="text-xs font-medium text-ink-2">met on time</span>
        </div>
      </div>
      <dl className="mt-6 grid grid-cols-3 gap-2">
        {parts.map((p) => (
          <div key={p.key} className="rounded-control px-3 py-2.5" style={{ background: fill(p.hue), color: `var(--on-${p.hue})` }}>
            <dd className="text-2xl leading-7 font-semibold tabular-nums">{p.value}</dd>
            <dt className="text-xs font-medium opacity-90">{p.label}</dt>
          </div>
        ))}
      </dl>
    </ChartPanel>
  )
}
