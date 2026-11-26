import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Kbd, SegmentedControl } from '@/components/ds'
import { useShortcut } from '@/components/shell/shortcuts'
import type { QueueStats } from '@/lib/types'
import { cn } from '@/lib/utils'

import { DisplayPopover, FilterPopover } from './FilterPopover'
import { FILTER_KEYS, type ViewKey } from './model'
import type { FilterSpec } from './useFilterSpecs'

const split = (v: string | null) => (v ? v.split(',').filter(Boolean) : [])

function SearchBox({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [text, setText] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  const pushed = useRef(value)

  // URL -> input (e.g. "Clear all"); input -> URL after a short pause.
  useEffect(() => {
    if (value !== pushed.current) {
      pushed.current = value
      setText(value)
    }
  }, [value])
  useEffect(() => {
    const t = setTimeout(() => {
      const v = text.trim()
      if (v !== pushed.current) {
        pushed.current = v
        onCommit(v)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [text, onCommit])

  useShortcut('/', () => ref.current?.focus(), { description: 'Search the inbox', group: 'Inbox' })

  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
      <input
        ref={ref}
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            if (text) setText('')
            else ref.current?.blur()
          }
        }}
        placeholder="Search tickets"
        aria-label="Search tickets"
        className="h-9 w-full rounded-control border border-line bg-surface pr-9 pl-9 text-sm text-ink transition-colors outline-none placeholder:text-ink-3 focus:border-violet focus:ring-2 focus:ring-violet/30 [&::-webkit-search-cancel-button]:hidden"
      />
      {text ? (
        <button
          type="button"
          onClick={() => {
            setText('')
            ref.current?.focus()
          }}
          aria-label="Clear search"
          className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-ink-3 hover:bg-sunken hover:text-ink focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : (
        <Kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2">/</Kbd>
      )}
    </div>
  )
}

export function InboxToolbar({ view, stats, search, params, specs, sort, density, onView, onFilter, onSearch, onSort, onDensity, onResetFilters }: {
  view: ViewKey
  stats?: QueueStats
  search: string
  params: URLSearchParams
  specs: FilterSpec[]
  sort: string
  density: 'comfortable' | 'compact'
  onView: (v: ViewKey) => void
  onFilter: (key: string, value: string | null) => void
  onSearch: (v: string) => void
  onSort: (v: string) => void
  onDensity: (v: 'comfortable' | 'compact') => void
  onResetFilters: () => void
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <SearchBox value={search} onCommit={onSearch} />
        <FilterPopover specs={specs} params={params} onChange={onFilter} onReset={onResetFilters} />
        <DisplayPopover sort={sort} density={density} onSort={onSort} onDensity={onDensity} />
      </div>
      <SegmentedControl<ViewKey>
        ariaLabel="Inbox view"
        fullWidth
        size="sm"
        value={view}
        onChange={onView}
        options={[
          { value: 'attention', label: 'Attention', count: stats ? stats.open + stats.in_progress : undefined },
          { value: 'mine', label: 'Mine', count: stats?.mine },
          { value: 'unassigned', label: 'Unassigned', count: stats?.unassigned },
          { value: 'all', label: 'All' },
        ]}
      />
    </div>
  )
}

/** Only what is currently applied, each removable, plus Clear all. Renders nothing when no filter is set. */
export function AppliedChips({ specs, params, search, onFilter, onClear }: {
  specs: FilterSpec[]
  params: URLSearchParams
  search: string
  onFilter: (key: string, value: string | null) => void
  onClear: () => void
}) {
  const chips: { id: string; text: string; remove: () => void }[] = []
  for (const key of FILTER_KEYS) {
    const spec = specs.find((s) => s.key === key)
    const values = split(params.get(key))
    for (const v of values) {
      const text = spec?.options.find((o) => o.value === v)?.label ?? v
      chips.push({
        id: `${key}:${v}`,
        text: `${spec?.label ?? key}: ${text}`,
        remove: () => {
          const rest = values.filter((x) => x !== v)
          onFilter(key, rest.length ? rest.join(',') : null)
        },
      })
    }
  }
  if (search) chips.push({ id: 'q', text: `“${search}”`, remove: () => onFilter('q', null) })
  if (!chips.length) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Applied filters">
      {chips.map((c) => (
        <span key={c.id} className="inline-flex h-7 items-center gap-1 rounded-chip border border-line-strong bg-surface-2 pr-1 pl-2.5 text-xs font-medium text-ink">
          {c.text}
          <button
            type="button"
            onClick={c.remove}
            aria-label={`Remove filter ${c.text}`}
            className={cn('flex size-5 items-center justify-center rounded-md text-ink-3 hover:bg-sunken hover:text-ink focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none')}
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      <button type="button" onClick={onClear} className="h-7 rounded-md px-2 text-xs font-medium text-ink-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none">
        Clear all
      </button>
    </div>
  )
}
