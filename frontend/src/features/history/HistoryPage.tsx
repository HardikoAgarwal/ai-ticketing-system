import { Archive, CheckCheck, History, Loader2, Search, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { useWorkspace } from '@/auth/workspace'
import { ErrorState, Kbd, SegmentedControl, Skeleton } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { useShortcut } from '@/components/shell/shortcuts'
import { EndOfList, NoHistory, NoMatches } from '@/features/inbox/ListStates'
import { rememberQueue } from '@/features/inbox/queue-order'
import { StatTile } from '@/features/inbox/StatTile'
import { HISTORY_COLUMNS } from '@/features/inbox/table-columns'
import { TableSkeleton } from '@/features/inbox/TableSkeleton'
import { PageHeader } from '@/features/shared/PageHeader'

import { HistoryRow } from './HistoryRow'
import { HistoryTable } from './HistoryTable'
import { RANGES, useHistory, type FinishedStatus, type Range } from './useHistory'

function SearchBox({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [text, setText] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  const pushed = useRef(value)
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
  useShortcut('/', () => ref.current?.focus(), { description: 'Search history', group: 'History' })
  return (
    <div className="relative min-w-0 basis-full sm:basis-auto sm:w-60">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
      <input
        ref={ref}
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && (text ? setText('') : ref.current?.blur())}
        placeholder="Search history"
        aria-label="Search resolved and closed tickets"
        className="h-10 w-full rounded-control border border-line-strong bg-surface pr-10 pl-10 text-sm text-ink shadow-card outline-none placeholder:text-ink-3 focus:border-violet focus:ring-2 focus:ring-violet/30 [&::-webkit-search-cancel-button]:hidden"
      />
      {text ? (
        <button type="button" onClick={() => setText('')} aria-label="Clear search" className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-3 hover:bg-sunken hover:text-ink focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none">
          <X className="size-3.5" aria-hidden />
        </button>
      ) : (
        <Kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2">/</Kbd>
      )}
    </div>
  )
}

/**
 * Tickets that are finished: Resolved (waiting for the customer to confirm, closes itself after the auto-close period) and
 * Closed (final). Newest finish first, with a date range, search and the two status tiles as filters.
 */
export function HistoryPage() {
  const { slug, api } = useWorkspace()
  const h = useHistory()
  const workspace = useQuery({ queryKey: ['workspace', slug], queryFn: api.workspace })
  const days = workspace.data?.auto_close_days ?? 0
  const sentinel = useRef<HTMLDivElement>(null)
  const { list, tickets } = h
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list

  useEffect(() => {
    rememberQueue(tickets.map((t) => t.id), '', 'tickets/history')
  }, [tickets])

  useEffect(() => {
    const el = sentinel.current
    if (!el || !hasNextPage) return
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && !isFetchingNextPage && void fetchNextPage(), { rootMargin: '480px' })
    io.observe(el)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, tickets.length])

  // Keep the previous list on screen while a change loads; show placeholders only if the answer is slow.
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (!list.isPlaceholderData) return
    const t = setTimeout(() => setSlow(true), 350)
    return () => {
      clearTimeout(t)
      setSlow(false)
    }
  }, [list.isPlaceholderData])
  const showSkeleton = list.isLoading || (list.isPlaceholderData && slow)

  const c = h.counts.data
  const pick = (s: FinishedStatus) => h.patch({ status: s === 'all' ? null : s })

  return (
    <div className="mx-auto w-full max-w-[1400px] pb-8">
      <div className="space-y-8 pb-8">
        <PageHeader
          icon={History}
          title="History"
          description="Resolved and closed tickets, newest first."
          actions={
            <>
              <SearchBox value={h.search} onCommit={(v) => h.patch({ q: v || null })} />
              <SegmentedControl<Range> ariaLabel="Date range" className="h-10" value={h.range} onChange={(v) => h.patch({ range: v === 'all' ? null : v })} options={RANGES.map((r) => ({ value: r.value, label: r.label }))} />
            </>
          }
        />
        <div className="grid grid-cols-3 gap-3" role="group" aria-label="Finished tickets. Select one to filter the list">
          {c ? (
            <>
              <StatTile icon={History} hue="lav" label="All finished" value={c.resolved + c.closed} foot="Resolved and closed" active={h.status === 'all'} onPick={() => pick('all')} />
              <StatTile icon={CheckCheck} hue="mint" label="Resolved" value={c.resolved} foot={days ? `Closes itself after ${days} quiet days` : 'Waiting for the customer'} active={h.status === 'RESOLVED'} onPick={() => pick('RESOLVED')} />
              <StatTile icon={Archive} hue="slate" label="Closed" value={c.closed} foot="Final. A reply reopens it" active={h.status === 'CLOSED'} onPick={() => pick('CLOSED')} />
            </>
          ) : (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-panel sm:h-[158px]" />)
          )}
        </div>
      </div>

      <div className="pt-3">
        {showSkeleton ? (
          <>
            <div className="hidden lg:block">
              <TableSkeleton columns={HISTORY_COLUMNS} caption="Loading history" />
            </div>
            <div className="space-y-3 lg:hidden" role="status" aria-label="Loading history">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="sk h-28 rounded-panel bg-sunken" aria-hidden />
              ))}
            </div>
          </>
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : tickets.length === 0 ? (
          h.filtered ? <NoMatches onClear={h.clearAll} /> : <NoHistory />
        ) : (
          <>
            <div className="hidden pb-3 lg:block">
              <HistoryTable tickets={tickets} basePath={`/w/${slug}/agent/tickets`} />
            </div>
            <ul aria-label="Resolved and closed tickets" className="space-y-3 pb-3 lg:hidden">
              {tickets.map((t) => (
                <HistoryRow key={t.id} ticket={t} to={`/w/${slug}/agent/tickets/${t.id}`} />
              ))}
            </ul>
            <div ref={sentinel} className="flex justify-center py-2">
              {hasNextPage ? (
                <Button variant="outline" size="sm" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
                  {isFetchingNextPage && <Loader2 className="animate-spin" />} Load more
                </Button>
              ) : (
                <EndOfList />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
