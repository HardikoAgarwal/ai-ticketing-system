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

/** A filter as a chip: neutral when unset, filled with the chosen value (and an ×) when set. */
export function FilterChip({ spec, value, onChange }: { spec: FilterSpec; value: string | null; onChange: (v: string | null) => void }) {
  const [open, setOpen] = useState(false)
  const text = summary(spec, value)
  const Icon = spec.icon
  return (
    <div className={cn('inline-flex items-center rounded-full border text-sm shadow-xs transition-colors', text ? 'border-primary/30 bg-primary/[0.07] text-primary' : 'bg-card hover:bg-muted')}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" aria-label={`Filter by ${spec.label}`} className={cn('flex h-8 items-center gap-1.5 rounded-full pl-3 font-medium focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none', text ? 'pr-1.5' : 'pr-2.5')}>
            {Icon && <Icon className="size-3.5 opacity-70" />}
            <span>{spec.label}</span>
            {text && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold">{text}</span>}
            {!text && <ChevronDown className="size-3.5 opacity-60" />}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-60 gap-0.5 p-1.5">
          <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {spec.label} {spec.multi && <span className="font-normal normal-case">· pick any</span>}
          </p>
          <div role="menu" className="max-h-72 overflow-y-auto">
            {spec.options.map((o) => (
              <OptionRow
                key={o.value}
                spec={spec}
                option={o}
                active={csv(value).includes(o.value)}
                onPick={() => {
                  onChange(toggle(spec, value, o.value))
                  if (!spec.multi) setOpen(false)
                }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {text && (
        <button type="button" onClick={() => onChange(null)} aria-label={`Clear ${spec.label} filter`} className="mr-1 flex size-6 items-center justify-center rounded-full hover:bg-primary/15 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none">
          <X className="size-3.5" />
        </button>
      )}
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
      <SelectTrigger size="sm" aria-label="Sort tickets" className="w-full min-w-44 bg-card font-medium sm:w-auto">
        <ListFilter className="size-3.5 text-muted-foreground" />
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
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search subject, customer or TKT-0001" aria-label="Search tickets" className="h-11 rounded-xl bg-card pr-10 pl-10 shadow-xs" />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search" className="absolute top-1/2 right-2.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

export interface QuickView {
  key: string
  label: string
  count?: number
}

/** Segmented pill views with live counts. Scrolls sideways on phones. */
export function QuickViews({ views, value, onChange }: { views: QuickView[]; value: string; onChange: (key: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (el && ref.current) ref.current.scrollTo({ left: el.offsetLeft - 24, behavior: 'smooth' })
  }, [value])
  return (
    <div ref={ref} role="tablist" aria-label="Ticket views" className="relative -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden">
      {views.map((v) => {
        const on = v.key === value
        return (
          <button
            key={v.key}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(v.key)}
            className={cn(
              'flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none',
              on ? 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25' : 'bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground',
            )}
          >
            {v.label}
            {v.count !== undefined && (
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums', on ? 'bg-white/20 text-primary-foreground' : 'bg-muted text-muted-foreground')}>{v.count}</span>
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
      <Button variant="outline" onClick={() => setOpen(true)} className="h-11 rounded-xl px-3.5">
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
