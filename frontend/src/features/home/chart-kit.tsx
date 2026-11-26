import type { ReactNode } from 'react'

import { Panel } from '@/components/ds'
import { cn } from '@/lib/utils'

/**
 * One card for every chart: a title and a plain-language description, an optional headline figure on the right, then the chart.
 * `summary` is the accessible description of the picture, read out by screen readers in place of the graphic.
 */
export function ChartPanel({ title, description, figure, summary, empty, children, className }: {
  title: string
  description: string
  figure?: ReactNode
  summary: string
  empty?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <Panel as="figure" className={cn('flex flex-col p-5 sm:p-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <figcaption className="min-w-0">
          <span className="block text-base leading-6 font-semibold tracking-tight text-ink">{title}</span>
          <span className="mt-0.5 block text-[13px] leading-5 text-ink-2">{description}</span>
        </figcaption>
        {figure && <div className="shrink-0">{figure}</div>}
      </div>
      <div className="mt-5 flex flex-1 flex-col justify-center">
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

/** A number with a coloured square, used as the headline figure of a card. */
export function Figure({ value, label, color }: { value: ReactNode; label: string; color?: string }) {
  return (
    <div className="text-right">
      <div className="text-2xl leading-7 font-semibold tracking-tight text-ink tabular-nums">{value}</div>
      <div className="mt-0.5 flex items-center justify-end gap-1.5 text-xs font-medium text-ink-2">
        {color && <span className="size-2.5 rounded-[3px]" style={{ background: color }} aria-hidden />}
        {label}
      </div>
    </div>
  )
}
