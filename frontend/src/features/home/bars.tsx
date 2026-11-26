import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { mix, type Hue } from './chart-tokens'

export interface BarItem {
  key: string
  label: string
  value: number
  hue: Hue
  /** Small element before the label (an avatar, an icon). */
  lead?: ReactNode
  /** Extra words after the count, e.g. "2 overdue". */
  note?: ReactNode
  to?: string
}

/**
 * Horizontal bars with the name and the count written inside the bar, so there is nothing to look up in a legend.
 * The fill is a soft tint of the hue; the text is always the page ink, so contrast does not depend on the hue.
 */
export function BarRows({ items, total, rowHeight = 44 }: { items: BarItem[]; total?: number; rowHeight?: number }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  const sum = total ?? items.reduce((n, i) => n + i.value, 0)
  return (
    <ul className="space-y-2">
      {items.map((it) => {
        const width = it.value ? Math.max((it.value / max) * 100, it.lead ? 18 : 6) : 0
        const body = (
          <>
            <span aria-hidden className="absolute inset-y-0 left-0 rounded-control border transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${width}%`, background: mix(it.hue, 30), borderColor: mix(it.hue, 55) }} />
            <span className="relative flex h-full items-center gap-2.5 px-3 text-sm">
              {it.lead}
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{it.label}</span>
              {it.note && <span className="text-xs font-medium text-ink-2">{it.note}</span>}
              <span className="font-semibold text-ink tabular-nums">{it.value}</span>
              {sum > 0 && <span className="w-9 text-right text-xs text-ink-2 tabular-nums">{Math.round((it.value / sum) * 100)}%</span>}
            </span>
          </>
        )
        const cls = 'relative block w-full overflow-hidden rounded-control bg-sunken'
        return (
          <li key={it.key}>
            {it.to ? (
              <Link to={it.to} style={{ height: rowHeight }} className={cn(cls, 'focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none hover:brightness-[0.98]')}>
                {body}
              </Link>
            ) : (
              <div style={{ height: rowHeight }} className={cls}>
                {body}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** One wide bar split into segments, each labelled inside with its name and share. Segments too narrow for text keep a title. */
export function StackBar({ items, height = 88 }: { items: BarItem[]; height?: number }) {
  const total = items.reduce((n, i) => n + i.value, 0) || 1
  return (
    <div className="flex w-full gap-1.5" style={{ height }}>
      {items
        .filter((i) => i.value > 0)
        .map((it) => {
          const share = it.value / total
          return (
            <div
              key={it.key}
              title={`${it.label}: ${it.value} (${Math.round(share * 100)}%)`}
              className="flex min-w-0 flex-col justify-between overflow-hidden rounded-control border p-3 transition-[flex-grow] duration-500"
              style={{ flexGrow: it.value, flexBasis: 0, background: mix(it.hue, 30), borderColor: mix(it.hue, 55) }}
            >
              {share >= 0.1 && <span className="truncate text-[13px] font-medium text-ink">{it.label}</span>}
              <span className="text-xl leading-6 font-semibold text-ink tabular-nums">
                {share >= 0.06 ? `${Math.round(share * 100)}%` : ''}
                {share >= 0.1 && <span className="ml-1.5 text-xs font-normal text-ink-2">{it.value}</span>}
              </span>
            </div>
          )
        })}
    </div>
  )
}
