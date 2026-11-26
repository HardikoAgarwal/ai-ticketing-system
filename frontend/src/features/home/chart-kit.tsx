import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Panel } from '@/components/ds'
import { cn } from '@/lib/utils'

/**
 * One card for every chart. A header band (icon tile, title, one plain sentence saying what to read from the chart, and an optional
 * headline figure) sits above a hairline; the chart fills the body. `summary` is the screen-reader description of the picture.
 */
export function ChartPanel({ icon: Icon, title, description, figure, summary, empty, children, className, bodyClassName }: {
  icon: LucideIcon
  title: string
  description: string
  figure?: ReactNode
  summary: string
  empty?: boolean
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <Panel as="figure" className={cn('flex flex-col overflow-hidden', className)}>
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line px-5 py-4 sm:px-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-violet-soft text-violet ring-1 ring-violet/20 ring-inset" aria-hidden>
          <Icon className="size-5" />
        </span>
        <figcaption className="min-w-0 flex-1 basis-56">
          <span className="block text-base leading-6 font-semibold tracking-tight text-ink">{title}</span>
          <span className="block text-[13px] leading-5 text-ink-2">{description}</span>
        </figcaption>
        {figure && <div className="ml-auto shrink-0">{figure}</div>}
      </header>
      <div className={cn('flex flex-1 flex-col justify-center p-5 sm:p-6', bodyClassName)}>
        {empty ? (
          <div className="flex h-60 items-center justify-center rounded-control border border-dashed border-line-strong bg-surface-2 text-sm text-ink-2">No data in this period yet</div>
        ) : (
          <div role="img" aria-label={summary} className="flex flex-1 flex-col justify-center">
            {children}
          </div>
        )}
      </div>
    </Panel>
  )
}

/** A headline number for a card header. `color` adds a square that keys it to a series; `tone` colours the number itself (good / bad). */
export function Figure({ value, label, color, tone }: { value: ReactNode; label: string; color?: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="text-right">
      <div className={cn('text-2xl leading-7 font-semibold tracking-tight tabular-nums', tone === 'good' ? 'text-[var(--viz-mint)]' : tone === 'bad' ? 'text-[var(--viz-rose)]' : 'text-ink')}>{value}</div>
      <div className="mt-0.5 flex items-center justify-end gap-1.5 text-xs font-medium text-ink-2">
        {color && <span className="size-2.5 rounded-[3px]" style={{ background: color }} aria-hidden />}
        {label}
      </div>
    </div>
  )
}
