import { CheckCheck, Inbox, Loader2, SearchX, UserCheck, X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState, ErrorState } from '@/components/ds'
import type { StaffTicket } from '@/lib/types'
import { cn } from '@/lib/utils'

import { TicketCard, TicketCardSkeleton } from './TicketCard'
import { GRID, TicketRow, TicketRowSkeleton } from './TicketRow'

export interface InboxListProps {
  /** Page header, queue stats and toolbar. Rendered at the top of the scrolling area so the list gets the whole screen once you scroll. */
  top?: ReactNode
  ordered: StaffTicket[]
  total: number
  loading: boolean
  fetching: boolean
  error: unknown
  hasNext: boolean
  fetchingNext: boolean
  onRetry: () => void
  onLoadMore: () => void
  /** Base path of the ticket pages, e.g. /w/acme/agent/tickets */
  ticketsPath: string
  cursor: number | null
  selected: Set<number>
  fresh: Set<number>
  layout: 'cards' | 'table'
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

const HEAD = 'text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase'

/** The full-width ticket list: a column header (lg+), bulk bar, infinite scroll. */
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
  const selectAll = (
    <Checkbox
      checked={allChecked ? true : selecting ? 'indeterminate' : false}
      onCheckedChange={(v) => p.onSelectAll(v === true)}
      aria-label="Select all loaded tickets"
      disabled={!p.ordered.length}
    />
  )

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={scroller} className="scroll-quiet min-h-0 flex-1 overflow-y-auto pb-28" aria-busy={p.fetching}>
        {p.top && <div className="space-y-4 px-2 pt-6 pb-4">{p.top}</div>}
        {/* column header: sticky, lg+ only (below lg the rows are cards) */}
        <div className={cn('sticky top-0 z-20 hidden h-9 border-b border-line bg-canvas px-3', p.layout === 'table' && 'lg:block')}>
          <div className={cn('h-full', GRID)}>
            <span className="flex items-center">{selectAll}</span>
            <span className={HEAD}>
              Ticket
              {p.fetching && !p.loading && <Loader2 className="ml-2 inline size-3 animate-spin text-ink-3 motion-reduce:animate-none" aria-label="Refreshing" />}
            </span>
            <span className={HEAD}>Status</span>
            <span className={HEAD}>Priority</span>
            <span className={HEAD}>Customer</span>
            <span className={cn(HEAD, 'hidden xl:block')}>Category</span>
            <span className={cn(HEAD, 'hidden xl:block')}>Owner</span>
            <span className={cn(HEAD, 'text-right')}>Updated</span>
          </div>
        </div>
        <div className={cn('flex items-center gap-2.5 px-3 py-2 text-xs text-ink-3', p.layout === 'table' && 'lg:hidden')} aria-live="polite">
          {selectAll}
          <span>
            {p.loading ? 'Loading…' : (
              <>
                <span className="font-medium text-ink-2 tabular-nums">{p.ordered.length}</span>
                {p.total > p.ordered.length ? <> of <span className="tabular-nums">{p.total}</span></> : null} ticket{p.total === 1 ? '' : 's'}
              </>
            )}
          </span>
        </div>

        <div className="px-2">
          {p.loading ? (
            p.layout === 'cards' ? (
              <div className="space-y-6 pt-1">
                {Array.from({ length: 4 }).map((_, i) => <TicketCardSkeleton key={i} />)}
              </div>
            ) : (
              <div className="space-y-1 pt-1">
                {Array.from({ length: 8 }).map((_, i) => <TicketRowSkeleton key={i} />)}
              </div>
            )
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
              <ul aria-label="Tickets" className={p.layout === 'cards' ? 'space-y-9 pb-4' : 'space-y-3 pb-3'}>
                {p.ordered.map((t) => p.layout === 'cards' ? (
                  <TicketCard
                    key={t.id}
                    ticket={t}
                    to={`${p.ticketsPath}/${t.id}`}
                    cursor={p.cursor === t.id}
                    checked={p.selected.has(t.id)}
                    selecting={selecting}
                    fresh={p.fresh.has(t.id)}
                    meId={p.meId}
                    onToggle={p.onToggle}
                  />
                ) : (
                  <TicketRow
                    key={t.id}
                    ticket={t}
                    to={`${p.ticketsPath}/${t.id}`}
                    cursor={p.cursor === t.id}
                    checked={p.selected.has(t.id)}
                    selecting={selecting}
                    fresh={p.fresh.has(t.id)}
                    meId={p.meId}
                    onToggle={p.onToggle}
                  />
                ))}
              </ul>
              <div ref={sentinel} className="flex justify-center py-4">
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
      </div>

      {selecting && (
        <div role="region" aria-label="Bulk actions" className="absolute inset-x-3 bottom-4 z-30 mx-auto flex max-w-2xl items-center gap-2 rounded-panel border border-line-strong bg-ink px-3 py-2 text-canvas shadow-pop md:bottom-6">
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
