import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

const BAR = { violet: 'bg-violet', green: 'bg-mint-ink', amber: 'bg-butter-ink', red: 'bg-rose-ink', ink: 'bg-ink', ai: 'bg-gradient-to-r from-aurora-1 via-aurora-2 to-aurora-3' } as const
const STROKE = { violet: 'stroke-violet', green: 'stroke-mint-ink', amber: 'stroke-butter-ink', red: 'stroke-rose-ink', ink: 'stroke-ink', ai: 'stroke-violet' } as const
export type ProgressTone = keyof typeof BAR

export function ProgressBar({ value, max = 100, tone = 'violet', size = 'md', label, className }: { value: number; max?: number; tone?: ProgressTone; size?: 'sm' | 'md'; label: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(max, 1)) * 100))
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)} className={cn('overflow-hidden rounded-full bg-sunken', size === 'sm' ? 'h-1.5' : 'h-2', className)}>
      <div className={cn('h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none', BAR[tone])} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function ProgressRing({ value, max = 100, size = 44, stroke = 4, tone = 'violet', label, children }: { value: number; max?: number; size?: number; stroke?: number; tone?: ProgressTone; label: string; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value / Math.max(max, 1)))
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)} className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-sunken" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className={cn('transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none', STROKE[tone])} />
      </svg>
      {children && <span className="absolute text-[11px] font-semibold text-ink tabular-nums">{children}</span>}
    </div>
  )
}
