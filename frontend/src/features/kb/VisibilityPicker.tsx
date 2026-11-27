import { Check } from 'lucide-react'
import { useRef, type KeyboardEvent } from 'react'

import { fill, on } from '@/components/ds'
import { cn } from '@/lib/utils'

import { VISIBILITY, type Visibility } from './kb-utils'

const ORDER: Visibility[] = ['public', 'staff', 'draft']

/** Three cards, one choice (a radio group): who can see the article and whether the AI may quote it. Arrow keys move between them. */
export function VisibilityPicker({ value, onChange, disabled }: { value: Visibility; onChange: (v: Visibility) => void; disabled?: boolean }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (i + step + ORDER.length) % ORDER.length
    onChange(ORDER[next])
    refs.current[next]?.focus()
  }
  return (
    <div role="radiogroup" aria-label="Visibility" className="space-y-2">
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
              'flex w-full items-start gap-3 rounded-control border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none disabled:opacity-60',
              selected ? 'border-ink bg-surface-2' : 'border-line hover:bg-surface-2',
            )}
          >
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-control" style={{ background: fill(v.hue), color: on(v.hue) }}>
              <v.icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">{v.label}</span>
              <span className="mt-0.5 block text-[13px] leading-5 text-ink-2">{v.hint}</span>
            </span>
            {selected && <Check className="mt-1 size-4 shrink-0 text-ink" strokeWidth={3} aria-hidden />}
          </button>
        )
      })}
    </div>
  )
}
