import { ArrowUpDown, Check, CircleDot, Flag, ListFilter, RotateCcw, Tag, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { fill, on, type Hue } from '@/components/ds'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

import { hueFor, SORT_OPTIONS } from './model'
import type { FilterSpec } from './useFilterSpecs'

const triggerCls =
  'relative inline-flex h-10 shrink-0 items-center gap-2 rounded-control border border-line-strong bg-surface px-4 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none data-[state=open]:border-violet data-[state=open]:bg-violet-soft data-[state=open]:ring-2 data-[state=open]:ring-violet/25'

const SECTION_ICON: Record<string, LucideIcon> = { status: CircleDot, priority: Flag, category: Tag }

function Option({ selected, hue, children, onClick }: { selected: boolean; hue: Hue; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      style={selected ? { background: fill(hue), color: on(hue) } : undefined}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-control border px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none',
        selected ? 'border-transparent' : 'border-line-strong bg-surface text-ink hover:bg-surface-2',
      )}
    >
      {selected ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <span className="size-2.5 rounded-full" style={{ background: fill(hue) }} aria-hidden />}
      {children}
    </button>
  )
}

const split = (v: string | null) => (v ? v.split(',').filter(Boolean) : [])

/** Status, priority and category, applied live (no Apply button): the URL is the state. Overdue and owner are the tiles above the list. */
export function FilterPopover({ specs, params, onChange, onReset }: {
  specs: FilterSpec[]
  params: URLSearchParams
  onChange: (key: string, value: string | null) => void
  onReset: () => void
}) {
  const [open, setOpen] = useState(false)
  const count = specs.reduce((n, s) => n + split(params.get(s.key)).length, 0)

  const toggle = (spec: FilterSpec, value: string) => {
    const current = split(params.get(spec.key))
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    onChange(spec.key, next.length ? next.join(',') : null)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn(triggerCls, count > 0 && 'border-violet bg-violet-soft')} aria-label={count ? `Filters, ${count} applied` : 'Filters'}>
        <ListFilter className="size-4" aria-hidden />
        <span className="hidden sm:inline">Filters</span>
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex size-[18px] items-center justify-center rounded-full bg-violet text-[10px] font-bold text-canvas tabular-nums ring-2 ring-canvas" aria-hidden>
            {count}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[27rem] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-panel p-0">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="flex size-10 items-center justify-center rounded-control bg-violet-soft text-violet ring-1 ring-violet/20 ring-inset" aria-hidden>
            <ListFilter className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base leading-5 font-semibold text-ink">Filter tickets</p>
            <p className="text-xs text-ink-2">{count ? `${count} applied` : 'Nothing applied'} · the list updates as you pick</p>
          </div>
        </div>
        <div className="scroll-quiet max-h-[min(30rem,60vh)] space-y-3 overflow-y-auto bg-surface-2 p-3">
          {specs.map((spec) => {
            const selected = split(params.get(spec.key))
            const Icon = SECTION_ICON[spec.key] ?? Tag
            return (
              <fieldset key={spec.key} className="rounded-control bg-surface p-4 shadow-card">
                <legend className="sr-only">{spec.label}</legend>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink" aria-hidden>
                  <Icon className="size-4 text-ink-2" />
                  {spec.label}
                  {selected.length > 0 && <span className="ml-auto rounded-md bg-violet px-1.5 py-0.5 text-xs font-bold text-white tabular-nums">{selected.length}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {spec.options.map((o) => (
                    <Option key={o.value} selected={selected.includes(o.value)} hue={hueFor(spec.key, o.value, o.label)} onClick={() => toggle(spec, o.value)}>
                      {o.label}
                    </Option>
                  ))}
                </div>
              </fieldset>
            )
          })}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
          <button
            type="button"
            onClick={onReset}
            disabled={count === 0}
            className="inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-semibold text-ink-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none disabled:opacity-40"
          >
            <RotateCcw className="size-4" aria-hidden /> Clear all
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-10 items-center rounded-control bg-ink px-5 text-sm font-semibold text-canvas transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Done
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** Sort order. */
export function SortPopover({ sort, onSort }: { sort: string; onSort: (v: string) => void }) {
  const label = SORT_OPTIONS.find((o) => o.value === sort)?.label
  return (
    <Popover>
      <PopoverTrigger className={triggerCls} aria-label={`Sort: ${label}`}>
        <ArrowUpDown className="size-4" aria-hidden />
        <span className="hidden sm:inline">Sort</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 gap-0 overflow-hidden rounded-panel p-0">
        <div className="border-b border-line px-5 py-4 text-base font-semibold text-ink">Sort by</div>
        <div role="radiogroup" aria-label="Sort by" className="space-y-1 p-2">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={sort === o.value}
              onClick={() => onSort(o.value)}
              className={cn('flex h-10 w-full items-center justify-between rounded-control px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none', sort === o.value ? 'bg-violet-soft font-semibold text-ink' : 'text-ink hover:bg-violet-soft/60')}
            >
              {o.label}
              {sort === o.value && <Check className="size-4 text-violet" aria-hidden />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
