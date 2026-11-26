import type { LucideIcon } from 'lucide-react'
import { useRef, type KeyboardEvent, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface TabItem<T extends string> {
  value: T
  label: ReactNode
  icon?: LucideIcon
  count?: number
  disabled?: boolean
}

const tabId = (prefix: string, v: string) => `${prefix}-tab-${v}`
const panelId = (prefix: string, v: string) => `${prefix}-panel-${v}`

/**
 * Accessible tablist (automatic activation, roving tabindex, arrows/Home/End). Pair with <TabPanel> using the same `idPrefix`.
 * Controlled: you own `value` (e.g. sync it to `?tab=`). The list scrolls sideways when it does not fit.
 */
export function Tabs<T extends string>({ value, onChange, items, idPrefix, ariaLabel, className }: {
  value: T
  onChange: (v: T) => void
  items: TabItem<T>[]
  idPrefix: string
  ariaLabel: string
  className?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const enabled = items.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0)

  const onKey = (e: KeyboardEvent, idx: number) => {
    const pos = enabled.indexOf(idx)
    let next = -1
    if (e.key === 'ArrowRight') next = enabled[(pos + 1) % enabled.length]
    else if (e.key === 'ArrowLeft') next = enabled[(pos - 1 + enabled.length) % enabled.length]
    else if (e.key === 'Home') next = enabled[0]
    else if (e.key === 'End') next = enabled[enabled.length - 1]
    if (next < 0) return
    e.preventDefault()
    onChange(items[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div role="tablist" aria-label={ariaLabel} aria-orientation="horizontal" className={cn('scroll-quiet flex items-center gap-1 overflow-x-auto border-b border-line px-2', className)}>
      {items.map((t, i) => {
        const on = t.value === value
        return (
          <button
            key={t.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            id={tabId(idPrefix, t.value)}
            aria-selected={on}
            aria-controls={panelId(idPrefix, t.value)}
            tabIndex={on ? 0 : -1}
            disabled={t.disabled}
            onClick={() => onChange(t.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              'relative -mb-px inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors disabled:opacity-45',
              on ? 'border-ink text-ink' : 'border-transparent text-ink-3 hover:text-ink',
            )}
          >
            {t.icon && <t.icon className="size-4" aria-hidden />}
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={cn('rounded-md px-1.5 text-xs font-semibold tabular-nums', on ? 'bg-ink text-canvas' : 'bg-sunken text-ink-2')}>{t.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** The panel for one tab. Unmounts when inactive unless `keepMounted` (use for the conversation to keep scroll + draft state). */
export function TabPanel({ idPrefix, value, current, keepMounted = false, className, children }: {
  idPrefix: string
  value: string
  current: string
  keepMounted?: boolean
  className?: string
  children: ReactNode
}) {
  const active = value === current
  if (!active && !keepMounted) return null
  return (
    <div role="tabpanel" id={panelId(idPrefix, value)} aria-labelledby={tabId(idPrefix, value)} hidden={!active} tabIndex={0} className={cn('outline-none focus-visible:outline-2 focus-visible:outline-violet', className)}>
      {children}
    </div>
  )
}
