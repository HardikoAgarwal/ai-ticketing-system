import { CheckCheck, Inbox, Loader2, SearchX, UserCheck, X } from 'lucide-react'
import { Fragment, useEffect, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState, ErrorState } from '@/components/ds'
import type { StaffTicket } from '@/lib/types'
import { cn } from '@/lib/utils'

import { TicketRow, TicketRowSkeleton } from './TicketRow'
import type { Group } from './useInbox'

export interface InboxListProps {
  groups: Group[]
  ordered: StaffTicket[]
  total: number
  loading: boolean
  fetching: boolean
  error: unknown
  hasNext: boolean
  fetchingNext: boolean
  onRetry: () => void
  onLoadMore: () => void
  baseUrl: string
  search: string
  openId: number | null
  cursor: number | null
  selected: Set<number>
  fresh: Set<number>
  compact: boolean
  meId?: number
  filtered: boolean
  view: string
  onToggle: (id: number) => void
  onSelectAll: (on: boolean) => void
  onClearFilters: () => void
  busy: boolean
  onBulkResolve: () => void
  onBulkAssign: () => void
  onClearSelection: () => void
}

export function InboxList(p: InboxListProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const sentinel = useRef<HTMLDivElement>(null)

  // Infinite scroll: load the next page when the end comes into view. A visible "Load more" button covers keyboard users.
  const { hasNext, fetchingNext, onLoadMore } = p
  const count = p.ordered.length
  useEffect(() => {
    const el = sentinel.current
    if (!el || !hasNext) return
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && !fetchingNext && onLoadMore(), { root: scroller.current, rootMargin: '240px' })
    io.observe(el)
    return () => io.disconnect()
  }, [hasNext, fetchingNext, onLoadMore, count])

  // Keep the keyboard cursor visible.
  useEffect(() => {
    if (p.cursor === null) return
    scroller.current?.querySelector(`[data-ticket-id="${p.cursor}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [p.cursor])

  const selecting = p.selected.size > 0
  const allChecked = p.ordered.length > 0 && p.selected.size === p.ordered.length

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2.5 px-4 pb-1.5 text-xs text-ink-3" aria-live="polite">
        <Checkbox
          checked={allChecked ? true : selecting ? 'indeterminate' : false}
          onCheckedChange={(v) => p.onSelectAll(v === true)}
          aria-label="Select all loaded tickets"
          disabled={!p.ordered.length}
        />
        <span>
          {p.loading ? 'Loading…' : (
            <>
              <span className="font-medium text-ink-2 tabular-nums">{p.ordered.length}</span>
              {p.total > p.ordered.length ? <> of <span className="tabular-nums">{p.total}</span></> : null} ticket{p.total === 1 ? '' : 's'}
            </>
          )}
        </span>
        {p.fetching && !p.loading && <Loader2 className="size-3.5 animate-spin text-ink-3 motion-reduce:animate-none" aria-label="Refreshing" />}
      </div>

      <div ref={scroller} className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-2 pb-24" aria-busy={p.fetching}>
        {p.loading ? (
          <div className="space-y-1">
            {Array.from({ length: 7 }).map((_, i) => <TicketRowSkeleton key={i} compact={p.compact} />)}
          </div>
        ) : p.error ? (
          <ErrorState error={p.error} onRetry={p.onRetry} className="m-2" />
        ) : p.ordered.length === 0 ? (
          <EmptyState
            icon={p.filtered ? SearchX : Inbox}
            title={p.filtered ? 'No tickets match' : p.view === 'mine' ? 'Nothing assigned to you' : 'Inbox zero'}
            description={p.filtered ? 'Try removing a filter or searching for something else.' : 'New tickets appear here the moment they arrive.'}
            action={p.filtered ? <Button variant="outline" size="sm" onClick={p.onClearFilters}>Clear filters</Button> : undefined}
          />
        ) : (
          <>
            {p.groups.map((g) => (
              <Fragment key={g.key}>
                {g.label && (
                  <div className="sticky top-0 z-10 -mx-2 flex items-center gap-2 bg-surface/95 px-5 py-1.5 backdrop-blur">
                    <span className={cn('size-2 rounded-full', g.dot)} aria-hidden />
                    <h3 className="text-xs font-semibold tracking-wide text-ink-2 uppercase">{g.label}</h3>
                    <span className="text-xs text-ink-3 tabular-nums">{g.items.length}</span>
                  </div>
                )}
                <ul aria-label={g.label || 'Tickets'} className="space-y-0.5">
                  {g.items.map((t) => (
                    <TicketRow
                      key={t.id}
                      ticket={t}
                      to={`${p.baseUrl}/tickets/${t.id}${p.search}`}
                      open={p.openId === t.id}
                      cursor={p.cursor === t.id}
                      checked={p.selected.has(t.id)}
                      selecting={selecting}
                      fresh={p.fresh.has(t.id)}
                      compact={p.compact}
                      meId={p.meId}
                      onToggle={p.onToggle}
                    />
                  ))}
                </ul>
              </Fragment>
            ))}
            <div ref={sentinel} className="flex justify-center py-3">
              {p.hasNext ? (
                <Button variant="outline" size="sm" onClick={p.onLoadMore} disabled={p.fetchingNext}>
                  {p.fetchingNext && <Loader2 className="animate-spin" />} Load more
                </Button>
              ) : (
                <span className="text-xs text-ink-3">You've reached the end</span>
              )}
            </div>
          </>
        )}
      </div>

      {selecting && (
        <div role="region" aria-label="Bulk actions" className="absolute inset-x-3 bottom-3 z-20 flex items-center gap-2 rounded-panel border border-line-strong bg-ink px-3 py-2 text-canvas shadow-pop">
          <span className="text-sm font-medium whitespace-nowrap tabular-nums">{p.selected.size} selected</span>
          <span className="flex-1" />
          <Button size="sm" variant="secondary" className="whitespace-nowrap" onClick={p.onBulkAssign} disabled={p.busy}>
            <UserCheck /> Assign to me
          </Button>
          <Button size="sm" variant="secondary" className="whitespace-nowrap" onClick={p.onBulkResolve} disabled={p.busy}>
            <CheckCheck /> Resolve
          </Button>
          <button
            type="button"
            onClick={p.onClearSelection}
            aria-label="Clear selection"
            className="flex size-8 items-center justify-center rounded-control text-canvas/80 hover:bg-white/10 hover:text-canvas focus-visible:ring-2 focus-visible:ring-canvas focus-visible:outline-none"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  )
}
