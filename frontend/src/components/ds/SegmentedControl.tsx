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
export function SegmentedControl<T extends string>({ value, onChange, options, ariaLabel, size = 'md', variant = 'pill', fullWidth = false, className, activeClassName }: {
  value: T
  onChange: (v: T) => void
  options: SegmentOption<T>[]
  ariaLabel: string
  size?: 'sm' | 'md'
  /** `underline` draws tabs with an underline; it stretches to its parent's height so the line can sit on a bottom border. */
  variant?: 'pill' | 'underline'
  fullWidth?: boolean
  className?: string
  /** Colours for the selected segment; defaults to the brand fill. */
  activeClassName?: string
}) {
  const line = variant === 'underline'
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
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(line ? 'flex items-stretch gap-6' : 'inline-flex items-center gap-1 rounded-control border border-line bg-sunken p-1', fullWidth && 'flex w-full', className)}
    >
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
              'inline-flex items-center justify-center gap-1.5 font-medium whitespace-nowrap transition-colors disabled:opacity-45',
              size === 'sm' ? 'text-[13px]' : 'text-sm',
              fullWidth && 'flex-1',
              line
                ? cn(
                    'relative px-0.5 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:transition-colors focus-visible:outline-offset-0',
                    on ? cn('font-semibold text-ink', activeClassName ?? 'after:bg-ink') : 'text-ink-3 hover:text-ink hover:after:bg-line-strong',
                  )
                : cn(
                    'rounded-[8px]',
                    size === 'sm' ? 'h-8 px-3.5' : 'h-9 px-4',
                    on ? cn('shadow-sm', activeClassName ?? 'bg-violet text-white') : 'text-ink-3 hover:bg-violet-soft hover:text-ink',
                  ),
            )}
          >
            {o.icon && <o.icon className="size-4" aria-hidden />}
            {o.label}
            {o.count !== undefined && (
              <span
                className={cn(
                  'rounded-md px-1.5 text-xs font-semibold tabular-nums',
                  line ? (on ? 'bg-ink text-canvas' : 'bg-sunken text-ink-3') : on ? 'bg-white/25 text-white' : 'bg-line text-ink-2',
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
