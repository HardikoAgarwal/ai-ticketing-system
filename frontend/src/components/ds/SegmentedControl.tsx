import type { LucideIcon } from 'lucide-react'
import { useRef, type KeyboardEvent, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  icon?: LucideIcon
  count?: number
  disabled?: boolean
}

/**
 * Single-choice control (radiogroup). Arrow keys move and select, Home/End jump, one tab stop.
 * Use for views and modes; use <Tabs> when it switches panels of content.
 */
export function SegmentedControl<T extends string>({ value, onChange, options, ariaLabel, size = 'md', fullWidth = false, className }: {
  value: T
  onChange: (v: T) => void
  options: SegmentOption<T>[]
  ariaLabel: string
  size?: 'sm' | 'md'
  fullWidth?: boolean
  className?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0)

  const onKey = (e: KeyboardEvent, idx: number) => {
    const pos = enabled.indexOf(idx)
    let next = -1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = enabled[(pos + 1) % enabled.length]
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = enabled[(pos - 1 + enabled.length) % enabled.length]
    else if (e.key === 'Home') next = enabled[0]
    else if (e.key === 'End') next = enabled[enabled.length - 1]
    if (next < 0) return
    e.preventDefault()
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('inline-flex items-center gap-0.5 rounded-control border border-line bg-sunken p-0.5', fullWidth && 'flex w-full', className)}>
      {options.map((o, i) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-[8px] font-medium whitespace-nowrap transition-colors disabled:opacity-45',
              size === 'sm' ? 'h-8 px-2.5 text-[13px]' : 'h-9 px-3 text-sm',
              fullWidth && 'flex-1',
              on ? 'bg-surface text-ink shadow-[0_1px_2px_rgb(40_30_110/0.14)] ring-1 ring-line' : 'text-ink-3 hover:text-ink',
            )}
          >
            {o.icon && <o.icon className="size-4" aria-hidden />}
            {o.label}
            {o.count !== undefined && (
              <span className={cn('rounded-md px-1.5 text-xs font-semibold tabular-nums', on ? 'bg-ink text-canvas' : 'bg-line text-ink-2')}>{o.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
