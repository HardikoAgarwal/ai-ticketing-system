import { Check, ListFilter, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'

import { SegmentedControl } from '@/components/ds'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

import { SORT_OPTIONS } from './model'
import type { FilterSpec } from './useFilterSpecs'

const triggerCls =
  'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none data-[state=open]:bg-surface-2'

function Toggle({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-chip border px-2.5 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none',
        on ? 'border-violet bg-violet-soft text-ink' : 'border-line bg-surface text-ink-2 hover:bg-surface-2',
      )}
    >
      {on && <Check className="size-3.5 text-violet" aria-hidden />}
      {children}
    </button>
  )
}

const split = (v: string | null) => (v ? v.split(',').filter(Boolean) : [])

/** Everything that narrows the list, applied live (no Apply button): the URL is the state. */
export function FilterPopover({ specs, params, onChange, onReset }: {
  specs: FilterSpec[]
  params: URLSearchParams
  onChange: (key: string, value: string | null) => void
  onReset: () => void
}) {
  const [open, setOpen] = useState(false)
  const count = specs.filter((s) => params.get(s.key)).length

  const toggle = (spec: FilterSpec, value: string) => {
    const current = split(params.get(spec.key))
    if (!spec.multi) return onChange(spec.key, current[0] === value ? null : value)
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
      <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-2rem)] gap-0 p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-sm font-semibold text-ink">Filter tickets</p>
          <button
            type="button"
            onClick={onReset}
            disabled={count === 0}
            className="inline-flex items-center gap-1 rounded-md text-[13px] font-medium text-ink-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none disabled:opacity-40"
          >
            <RotateCcw className="size-3.5" aria-hidden /> Reset
          </button>
        </div>
        <div className="scroll-quiet max-h-[min(26rem,60vh)] space-y-4 overflow-y-auto px-4 py-4">
          {specs.map((spec) => {
            const selected = split(params.get(spec.key))
            return (
              <fieldset key={spec.key}>
                <legend className="mb-2 flex w-full items-baseline justify-between text-xs font-semibold tracking-wide text-ink-3 uppercase">
                  {spec.label}
                  <span className="font-normal tracking-normal normal-case">{spec.multi ? 'pick any' : 'pick one'}</span>
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {spec.options.map((o) => (
                    <Toggle key={o.value} on={selected.includes(o.value)} onClick={() => toggle(spec, o.value)}>
                      {o.label}
                    </Toggle>
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

/** Sort order and row density. */
export function DisplayPopover({ sort, density, onSort, onDensity }: {
  sort: string
  density: 'comfortable' | 'compact'
  onSort: (v: string) => void
  onDensity: (v: 'comfortable' | 'compact') => void
}) {
  return (
    <Popover>
      <PopoverTrigger className={cn(triggerCls, 'w-9 justify-center px-0')} aria-label="Display options: sort and density">
        <SlidersHorizontal className="size-4" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 gap-0 p-0">
        <div className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">Display</div>
        <div className="space-y-4 px-4 py-4">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold tracking-wide text-ink-3 uppercase">Sort by</legend>
            <div role="radiogroup" aria-label="Sort by" className="space-y-1">
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={sort === o.value}
                  onClick={() => onSort(o.value)}
                  className={cn(
                    'flex h-9 w-full items-center justify-between rounded-control px-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none',
                    sort === o.value ? 'bg-violet-soft font-medium text-ink' : 'text-ink-2 hover:bg-surface-2',
                  )}
                >
                  {o.label}
                  {sort === o.value && <Check className="size-4 text-violet" aria-hidden />}
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-ink-3 uppercase">Density</p>
            <SegmentedControl
              ariaLabel="Row density"
              fullWidth
              size="sm"
              value={density}
              onChange={onDensity}
              options={[
                { value: 'comfortable', label: 'Comfortable' },
                { value: 'compact', label: 'Compact' },
              ]}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
