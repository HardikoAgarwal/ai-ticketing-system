import { useRef, type KeyboardEvent } from 'react'

import { fill, on } from '@/components/ds'
import { cn } from '@/lib/utils'

import { VISIBILITY, type Visibility } from './kb-utils'

const ORDER: Visibility[] = ['public', 'staff', 'draft']

/**
 * Who can use the article, as one compact three-way switch (a radio group). The chosen option lifts onto a white pill and its icon takes
 * the colour of that choice; a one-line explanation of the chosen option sits beside it. Arrow keys move between options.
 */
export function VisibilitySwitch({ value, onChange, disabled }: { value: Visibility; onChange: (v: Visibility) => void; disabled?: boolean }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (i + step + ORDER.length) % ORDER.length
    onChange(ORDER[next])
    refs.current[next]?.focus()
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div role="radiogroup" aria-label="Who can use this article" className="inline-flex rounded-control border border-line bg-sunken p-1">
        {ORDER.map((key, i) => {
          const v = VISIBILITY[key]
          const selected = value === key
          return (
            <button
              key={key}
              ref={(el) => {
                refs.current[i] = el
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(key)}
              onKeyDown={(e) => onKey(e, i)}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-[8px] px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none disabled:cursor-default',
                selected ? 'bg-surface text-ink shadow-sm ring-1 ring-line-strong' : 'text-ink-2 hover:text-ink disabled:hover:text-ink-2',
              )}
            >
              <span className="flex size-5 items-center justify-center rounded-md" style={selected ? { background: fill(v.hue), color: on(v.hue) } : undefined} aria-hidden>
                <v.icon className="size-3" />
              </span>
              {v.label}
            </button>
          )
        })}
      </div>
      <p className="min-w-0 text-[13px] leading-5 text-ink-2" aria-live="polite">
        {VISIBILITY[value].short}
      </p>
    </div>
  )
}
