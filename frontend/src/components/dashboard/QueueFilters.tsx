import { Check, ListFilter, Search, SlidersHorizontal, X, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Tone } from '@/lib/constants'
import { cn } from '@/lib/utils'

export interface FilterOption {
  value: string
  label: string
  tone?: Tone
  icon?: LucideIcon
}

export interface FilterSpec {
  key: string
  label: string
  multi?: boolean
  options: FilterOption[]
  icon?: LucideIcon
}

const csv = (v: string | null) => (v ? v.split(',').filter(Boolean) : [])

function toggle(spec: FilterSpec, current: string | null, value: string): string | null {
  if (!spec.multi) return current === value ? null : value
  const set = new Set(csv(current))
  if (set.has(value)) set.delete(value)
  else set.add(value)
  return set.size ? [...set].join(',') : null
}

/** Small removable chips for every applied filter value, e.g. "Priority: High ×". Renders nothing when no filter is set. */
export function ActiveFilterChips({ specs, values, onChange, onClear }: {
  specs: FilterSpec[]
  values: Record<string, string | null>
  onChange: (key: string, v: string | null) => void
  onClear: () => void
}) {
  const chips = specs.flatMap((spec) =>
    csv(values[spec.key]).map((v) => ({ spec, value: v, label: spec.options.find((o) => o.value === v)?.label ?? v })),
  )
  if (!chips.length) return <span />
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map(({ spec, value, label }) => (
        <button
          key={`${spec.key}:${value}`}
          type="button"
          onClick={() => onChange(spec.key, toggle(spec, values[spec.key], value))}
          aria-label={`Remove ${spec.label} filter ${label}`}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card pr-1.5 pl-2.5 text-xs font-medium transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
        >
          <span className="text-muted-foreground">{spec.label}:</span> {label} <X className="size-3.5 text-muted-foreground" />
        </button>
      ))}
      <button type="button" onClick={onClear} className="ml-1 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
        Clear all
      </button>
    </div>
  )
}

export const SORT_OPTIONS = [
  { value: 'default', label: 'Urgency, then oldest', ordering: undefined },
  { value: 'newest', label: 'Newest first', ordering: '-created_at' },
  { value: 'oldest', label: 'Oldest first', ordering: 'created_at' },
  { value: 'updated', label: 'Recently updated', ordering: '-updated_at' },
  { value: 'sla', label: 'SLA due soonest', ordering: 'sla_due_at' },
] as const

export function SortSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label="Sort tickets" className="h-9 w-auto min-w-40 rounded-md border-border bg-card font-medium shadow-xs">
        <ListFilter className="size-4 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {SORT_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  // "/" jumps to search, like most dashboards
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable) return
      e.preventDefault()
      ref.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <div className="relative w-full sm:w-52">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search"
        aria-label="Search tickets"
        className="h-9 rounded-md border-border bg-card pr-9 pl-8 text-sm shadow-xs"
      />
      {value ? (
        <button type="button" onClick={() => { onChange(''); ref.current?.focus() }} aria-label="Clear search" className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted">
          <X className="size-3.5" />
        </button>
      ) : (
        !focused && (
          <kbd aria-hidden className="pointer-events-none absolute top-1/2 right-2 hidden h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded border bg-muted px-1 font-mono text-[11px] text-muted-foreground sm:flex">
            /
          </kbd>
        )
      )}
    </div>
  )
}

export interface QuickView {
  key: string
  label: string
  count?: number
}

/** Neutral segmented control for the quick views, each with a live count. Scrolls sideways on phones. */
export function QuickViews({ views, value, onChange }: { views: QuickView[]; value: string; onChange: (key: string) => void }) {
  return (
    <div role="tablist" aria-label="Ticket views" className="flex max-w-full shrink-0 gap-0.5 overflow-x-auto rounded-md border border-border bg-muted p-0.5 [&::-webkit-scrollbar]:hidden">
      {views.map((v) => {
        const on = v.key === value
        return (
          <button
            key={v.key}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(v.key)}
            className={cn(
              'flex h-8 shrink-0 items-center gap-1.5 rounded px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none',
              on ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {v.label}
            {v.count !== undefined && <span className={cn('text-xs tabular-nums', on ? 'text-muted-foreground' : 'text-muted-foreground/70')}>{v.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** "Filters" button + dialog. Nothing applies until "Apply". */
export function FilterDialog({ specs, values, onApply, activeCount }: {
  specs: FilterSpec[]
  values: Record<string, string | null>
  onApply: (next: Record<string, string | null>) => void
  activeCount: number
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="h-9 shrink-0 rounded-md border-border bg-card px-3 shadow-xs">
        <SlidersHorizontal /> Filters
        {activeCount > 0 && <span className="rounded bg-primary px-1.5 text-xs font-semibold text-primary-foreground">{activeCount}</span>}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        {/* flex-col (not the default grid) so the body gets a bounded height and scrolls while header and footer stay put */}
        <DialogContent className="flex max-h-[85svh] flex-col gap-0 overflow-hidden rounded-lg p-0 sm:max-w-lg">
          {open && <FilterForm specs={specs} initial={values} onClose={() => setOpen(false)} onApply={onApply} />}
        </DialogContent>
      </Dialog>
    </>
  )
}

function FilterForm({ specs, initial, onApply, onClose }: {
  specs: FilterSpec[]
  initial: Record<string, string | null>
  onApply: (next: Record<string, string | null>) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(initial)
  const count = specs.filter((s) => draft[s.key]).length
  return (
    <>
      <DialogHeader className="shrink-0 border-b px-5 py-4">
        <DialogTitle className="text-base">Filter tickets</DialogTitle>
        <DialogDescription>Narrow the queue, then apply. Applied filters show above the list.</DialogDescription>
      </DialogHeader>
      <div className="min-h-0 flex-1 divide-y overflow-y-auto overscroll-contain">
        {specs.map((spec) => (
          <section key={spec.key} className="px-5 py-4">
            <div className="mb-2.5 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold">{spec.label}</h3>
              <span className="text-xs text-muted-foreground">{spec.multi ? 'Pick any' : 'Pick one'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {spec.options.map((o) => {
                const on = csv(draft[spec.key]).includes(o.value)
                const OIcon = o.tone?.icon ?? o.icon
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setDraft((d) => ({ ...d, [spec.key]: toggle(spec, d[spec.key], o.value) }))}
                    className={cn(
                      'flex h-9 min-w-0 items-center gap-2 rounded-md border px-2.5 text-left text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none',
                      on ? 'border-primary bg-primary/10 font-medium text-foreground' : 'border-border bg-card text-foreground/80 hover:bg-muted',
                    )}
                  >
                    {OIcon && <OIcon className={cn('size-4 shrink-0', on ? 'text-primary' : 'text-muted-foreground')} />}
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    {on && <Check className="size-3.5 shrink-0 text-primary" />}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>
      <DialogFooter className="shrink-0 flex-row items-center justify-between border-t bg-muted/40 px-5 py-3 sm:justify-between">
        <Button variant="ghost" onClick={() => setDraft(Object.fromEntries(specs.map((s) => [s.key, null])))} disabled={!count}>
          Reset
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onApply(draft); onClose() }}>Apply{count ? ` (${count})` : ''}</Button>
        </div>
      </DialogFooter>
    </>
  )
}
