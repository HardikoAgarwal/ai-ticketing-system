import { ArrowUpDown, Check, ListFilter, RotateCcw } from 'lucide-react'
import { useState } from 'react'

import { fill, on, type Hue } from '@/components/ds'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

import { categoryHue, PRIORITY_HUE, SORT_OPTIONS, STATUS_HUE } from './model'
import type { FilterSpec } from './useFilterSpecs'

const triggerCls =
  'inline-flex h-11 shrink-0 items-center gap-2 rounded-control border border-line-strong bg-surface px-4 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none data-[state=open]:bg-surface-2'

/** The colour an option is drawn in when selected: status, priority and category each use the colours the tickets themselves wear. */
function hueFor(spec: FilterSpec, value: string, label: string): Hue {
  if (spec.key === 'status') return STATUS_HUE[value as keyof typeof STATUS_HUE] ?? 'slate'
  if (spec.key === 'priority') return PRIORITY_HUE[value] ?? 'slate'
  return categoryHue(label)
}

function Option({ on: selected, hue, children, onClick }: { on: boolean; hue: Hue; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      style={selected ? { background: fill(hue), color: on(hue), borderColor: 'transparent' } : undefined}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-control border px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none',
        !selected && 'border-line-strong bg-surface text-ink hover:bg-surface-2',
      )}
    >
      {selected && <Check className="size-3.5" aria-hidden />}
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
      <PopoverTrigger className={triggerCls} aria-label={count ? `Filters, ${count} applied` : 'Filters'}>
        <ListFilter className="size-4" aria-hidden />
        <span className="hidden sm:inline">Filters</span>
        {count > 0 && <span className="rounded-md bg-ink px-1.5 text-xs font-semibold text-canvas tabular-nums">{count}</span>}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[26rem] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-panel p-0">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="flex size-9 items-center justify-center rounded-control bg-violet-soft text-violet ring-1 ring-violet/20 ring-inset" aria-hidden>
            <ListFilter className="size-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-ink">Filter tickets</p>
            <p className="text-xs text-ink-2">Pick any combination. The list updates as you go.</p>
          </div>
          <button
            type="button"
            onClick={onReset}
            disabled={count === 0}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[13px] font-semibold text-ink-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none disabled:opacity-40"
          >
            <RotateCcw className="size-3.5" aria-hidden /> Reset
          </button>
        </div>
        <div className="scroll-quiet max-h-[min(28rem,62vh)] divide-y divide-line overflow-y-auto">
          {specs.map((spec) => {
            const selected = split(params.get(spec.key))
            return (
              <fieldset key={spec.key} className="px-5 py-4">
                <legend className="mb-3 flex w-full items-center justify-between text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase">
                  {spec.label}
                  {selected.length > 0 && <span className="rounded-md bg-sunken px-1.5 py-0.5 tracking-normal text-ink-2 normal-case tabular-nums">{selected.length} selected</span>}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {spec.options.map((o) => (
                    <Option key={o.value} on={selected.includes(o.value)} hue={hueFor(spec, o.value, o.label)} onClick={() => toggle(spec, o.value)}>
                      {o.label}
                    </Option>
                  ))}
                </div>
              </fieldset>
            )
          })}
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
      <PopoverContent align="start" className="w-72 gap-0 overflow-hidden rounded-panel p-0">
        <div className="border-b border-line px-5 py-4 text-[15px] font-semibold text-ink">Sort by</div>
        <div role="radiogroup" aria-label="Sort by" className="space-y-1 p-2">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={sort === o.value}
              onClick={() => onSort(o.value)}
              className={cn('flex h-10 w-full items-center justify-between rounded-control px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none', sort === o.value ? 'bg-ink font-semibold text-canvas' : 'text-ink hover:bg-surface-2')}
            >
              {o.label}
              {sort === o.value && <Check className="size-4" aria-hidden />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
