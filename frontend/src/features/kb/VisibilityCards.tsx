import { Check } from 'lucide-react'
import { useRef, type KeyboardEvent } from 'react'

import { fill, on } from '@/components/ds'
import { cn } from '@/lib/utils'

import { VISIBILITY, type Visibility } from './kb-utils'

const ORDER: Visibility[] = ['public', 'staff', 'draft']

/**
 * Who can use the article, as three equal cards in a row (a radio group): an icon in the colour of that choice, its name and a one-line
 * explanation. The chosen card gets a dark outline and a check. Arrow keys move between them.
 */
export function VisibilityCards({ value, onChange, disabled }: { value: Visibility; onChange: (v: Visibility) => void; disabled?: boolean }) {
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
    <div role="radiogroup" aria-label="Who can use this article" className="grid gap-3 sm:grid-cols-3">
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
              'relative flex flex-col items-start gap-2.5 rounded-control border-2 p-3.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60',
              selected ? 'border-ink bg-surface-2' : 'border-line hover:border-line-strong hover:bg-surface-2',
            )}
          >
            <span className="flex size-8 items-center justify-center rounded-control" style={{ background: fill(v.hue), color: on(v.hue) }}>
              <v.icon className="size-4" aria-hidden />
            </span>
            <span className="block">
              <span className="block text-sm font-semibold text-ink">{v.label}</span>
              <span className="mt-0.5 block text-[13px] leading-5 text-ink-2">{v.short}</span>
            </span>
            {selected && (
              <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-ink text-canvas" aria-hidden>
                <Check className="size-3" strokeWidth={3.5} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
