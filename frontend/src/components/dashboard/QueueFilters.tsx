import { Check, ChevronDown, ListFilter, Search, SlidersHorizontal, X, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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

function summary(spec: FilterSpec, value: string | null): string | null {
  const vals = csv(value)
  if (!vals.length) return null
  const first = spec.options.find((o) => o.value === vals[0])?.label ?? vals[0]
  return vals.length > 1 ? `${first} +${vals.length - 1}` : first
}

function toggle(spec: FilterSpec, current: string | null, value: string): string | null {
  if (!spec.multi) return current === value ? null : value
  const set = new Set(csv(current))
  if (set.has(value)) set.delete(value)
  else set.add(value)
  return set.size ? [...set].join(',') : null
}

function OptionRow({ spec, option, active, onPick }: { spec: FilterSpec; option: FilterOption; active: boolean; onPick: () => void }) {
  const Icon = option.tone?.icon ?? option.icon
  return (
    <button
      type="button"
      role={spec.multi ? 'menuitemcheckbox' : 'menuitemradio'}
      aria-checked={active}
      onClick={onPick}
      className={cn('flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none', active && 'bg-accent/60 font-medium')}
    >
      {Icon && <Icon className={cn('size-4 shrink-0', option.tone?.iconClass ?? 'text-muted-foreground')} />}
      <span className="flex-1 truncate">{option.label}</span>
      {active && <Check className="size-4 text-primary" />}
    </button>
  )
}

/** One filter in the toolbar grid: equal-sized, neutral when unset, filled with a count when active. Opens a pick list. */
export function FilterButton({ spec, value, onChange }: { spec: FilterSpec; value: string | null; onChange: (v: string | null) => void }) {
  const [open, setOpen] = useState(false)
  const vals = csv(value)
  const text = summary(spec, value)
  const Icon = spec.icon ?? ListFilter
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Filter by ${spec.label}${text ? `, currently ${text}` : ''}`}
          className={cn(
            'group flex h-10 w-full min-w-0 items-center gap-2 rounded-xl border px-3 text-sm font-medium shadow-xs transition-all focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none',
            text ? 'border-primary/40 bg-primary/[0.08] text-primary' : 'border-slate-200 bg-white text-foreground/80 hover:border-slate-300 hover:bg-slate-50',
          )}
        >
          <Icon className={cn('size-4 shrink-0', text ? 'text-primary' : 'text-muted-foreground')} />
          <span className="min-w-0 flex-1 truncate text-left">{vals.length > 1 ? spec.label : (text ?? spec.label)}</span>
          {vals.length > 1 && <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">{vals.length}</span>}
          <ChevronDown className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180', text ? 'text-primary/70' : 'text-muted-foreground')} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-0.5 p-1.5">
        <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {spec.label} {spec.multi && <span className="font-normal normal-case">· pick any</span>}
        </p>
        <div role="menu" className="max-h-72 overflow-y-auto">
          {spec.options.map((o) => (
            <OptionRow
              key={o.value}
              spec={spec}
              option={o}
              active={vals.includes(o.value)}
              onPick={() => {
                onChange(toggle(spec, value, o.value))
                if (!spec.multi) setOpen(false)
              }}
            />
          ))}
        </div>
        {vals.length > 0 && (
          <button type="button" onClick={() => { onChange(null); setOpen(false) }} className="mt-1 rounded-md border-t px-2.5 py-2 text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
            Clear {spec.label.toLowerCase()}
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}

/** Removable chips for every active filter value ("Priority: High ×"). */
export function ActiveFilterChips({ specs, values, onChange, onClear, extra }: {
  specs: FilterSpec[]
  values: Record<string, string | null>
  onChange: (key: string, v: string | null) => void
  onClear: () => void
  extra?: { label: string; onRemove: () => void }[]
}) {
  const chips = specs.flatMap((spec) =>
    csv(values[spec.key]).map((v) => ({ spec, value: v, label: spec.options.find((o) => o.value === v)?.label ?? v })),
  )
  if (!chips.length && !extra?.length) return null
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-4">
      <span className="mr-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Active</span>
      {extra?.map((e) => (
        <button key={e.label} type="button" onClick={e.onRemove} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-slate-900 pr-2 pl-3 text-[13px] font-medium text-white transition-colors hover:bg-slate-700 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none">
          {e.label} <X className="size-3.5 opacity-80" />
        </button>
      ))}
      {chips.map(({ spec, value, label }) => (
        <button
          key={`${spec.key}:${value}`}
          type="button"
          onClick={() => onChange(spec.key, toggle(spec, values[spec.key], value))}
          aria-label={`Remove ${spec.label} filter ${label}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 pr-2 pl-3 text-[13px] font-medium text-primary transition-colors hover:bg-primary/15 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
        >
          <span className="text-primary/70">{spec.label}:</span> {label} <X className="size-3.5" />
        </button>
      ))}
      <Button variant="ghost" size="sm" onClick={onClear} className="ml-auto h-8 text-muted-foreground">
        <X /> Clear all
      </Button>
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
      <SelectTrigger aria-label="Sort tickets" className="h-11 w-full min-w-48 rounded-xl border-slate-200 bg-white font-medium shadow-xs sm:w-auto">
        <ListFilter className="size-4 text-muted-foreground" />
        <span className="text-muted-foreground">Sort:</span>
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
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search by subject, customer, company or TKT-0001"
        aria-label="Search tickets"
        className="h-11 rounded-xl border-slate-200 bg-white pr-14 pl-11 text-[15px] shadow-xs"
      />
      {value ? (
        <button type="button" onClick={() => { onChange(''); ref.current?.focus() }} aria-label="Clear search" className="absolute top-1/2 right-3 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
          <X className="size-4" />
        </button>
      ) : (
        !focused && (
          <kbd aria-hidden className="pointer-events-none absolute top-1/2 right-3 hidden h-6 min-w-6 -translate-y-1/2 items-center justify-center rounded-md border bg-slate-50 px-1.5 font-mono text-xs text-muted-foreground sm:flex">
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

/** Segmented control for the quick views, each with a live count. Scrolls sideways on phones. */
export function QuickViews({ views, value, onChange }: { views: QuickView[]; value: string; onChange: (key: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (el && ref.current) ref.current.scrollTo({ left: el.offsetLeft - 24, behavior: 'smooth' })
  }, [value])
  return (
    <div ref={ref} role="tablist" aria-label="Ticket views" className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200/70 ring-inset [&::-webkit-scrollbar]:hidden">
      {views.map((v) => {
        const on = v.key === value
        return (
          <button
            key={v.key}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(v.key)}
            className={cn(
              'flex h-9 shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none',
              on ? 'bg-white text-foreground shadow-sm ring-1 ring-slate-200' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {v.label}
            {v.count !== undefined && (
              <span className={cn('rounded-full px-2 py-px text-xs font-semibold tabular-nums', on ? 'bg-primary text-primary-foreground' : 'bg-slate-200/80 text-slate-600')}>{v.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Phone filters: one button that opens a sheet with every filter as toggle pills. */
export function FilterSheet({ specs, values, onChange, onClear, activeCount, children }: {
  specs: FilterSpec[]
  values: Record<string, string | null>
  onChange: (key: string, v: string | null) => void
  onClear: () => void
  activeCount: number
  children?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="h-11 rounded-xl border-slate-200 bg-white px-3.5 shadow-xs">
        <SlidersHorizontal /> Filters
        {activeCount > 0 && <span className="rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">{activeCount}</span>}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85svh] gap-0 rounded-t-2xl p-0">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle>Filter tickets</SheetTitle>
            <SheetDescription>Narrow the list. Filters are saved in the page URL.</SheetDescription>
          </SheetHeader>
          <div className="space-y-5 overflow-y-auto px-5 py-5">
            {children}
            {specs.map((spec) => (
              <section key={spec.key}>
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{spec.label}</p>
                <div className="flex flex-wrap gap-2">
                  {spec.options.map((o) => {
                    const on = csv(values[spec.key]).includes(o.value)
                    return (
                      <button
                        key={o.value}
                        type="button"
                        aria-pressed={on}
                        onClick={() => onChange(spec.key, toggle(spec, values[spec.key], o.value))}
                        className={cn('rounded-full border px-3.5 py-2 text-sm font-medium transition-colors', on ? 'border-primary bg-primary/10 text-primary' : 'bg-card text-foreground/80')}
                      >
                        {o.label}
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
          <div className="flex gap-2 border-t bg-card px-5 py-3.5">
            <Button variant="ghost" onClick={onClear} disabled={!activeCount}>
              Clear all
            </Button>
            <Button className="ml-auto" onClick={() => setOpen(false)}>
              Show results
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
