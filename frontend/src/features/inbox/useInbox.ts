import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { announce } from '@/components/shell/announce'
import { useWorkspace } from '@/auth/workspace'
import type { StaffTicket } from '@/lib/types'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

import { buildQuery, BUCKETS, FILTER_KEYS, PAGE_SIZE, ticketBucket, viewFromParams, type FilterKey, type TicketBucket, type ViewKey } from './model'

export interface Group {
  key: TicketBucket | 'all'
  label: string
  dot: string
  items: StaffTicket[]
}

/** All list state (view, filters, search, sort, density) is URL-backed; the list itself is an infinite query. */
export function useInbox() {
  const { slug, api } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const refetchInterval = useFallbackInterval()

  const view = viewFromParams(params)
  const sort = params.get('sort') ?? 'default'
  const density: 'compact' | 'comfortable' = params.get('density') === 'compact' ? 'compact' : 'comfortable'
  const search = params.get('q') ?? ''
  const query = useMemo(() => buildQuery(params), [params])
  const queryKey = JSON.stringify(query)

  const patch = useCallback(
    (changes: Record<string, string | null>, opts: { reset?: boolean } = {}) => {
      setParams(
        (prev) => {
          const next = opts.reset ? new URLSearchParams() : new URLSearchParams(prev)
          for (const [k, v] of Object.entries(changes)) {
            if (v) next.set(k, v)
            else next.delete(k)
          }
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const stats = useQuery({ queryKey: ['stats', slug], queryFn: api.tickets.stats, refetchInterval })
  const list = useInfiniteQuery({
    queryKey: ['tickets', slug, 'staff', 'inbox', query],
    queryFn: ({ pageParam }) => api.tickets.listStaff({ ...query, page: pageParam, page_size: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
    placeholderData: keepPreviousData,
    refetchInterval,
  })

  const tickets = useMemo(() => {
    const seen = new Set<number>()
    const out: StaffTicket[] = []
    for (const page of list.data?.pages ?? []) {
      for (const t of page.results) {
        if (!seen.has(t.id)) {
          seen.add(t.id)
          out.push(t)
        }
      }
    }
    return out
  }, [list.data])

  // `group=on|off` is an explicit override; otherwise group by urgency only in the default sort of the working views.
  const groupParam = params.get('group')
  const grouped = groupParam === 'on' ? true : groupParam === 'off' ? false : sort === 'default' && view !== 'all'
  const groups: Group[] = useMemo(() => {
    if (!grouped) return [{ key: 'all', label: '', dot: '', items: tickets }]
    return BUCKETS.map((b) => ({ ...b, items: tickets.filter((t) => ticketBucket(t) === b.key) })).filter((g) => g.items.length)
  }, [tickets, grouped])
  /** Visual order (groups flattened): the order J/K walk through. */
  const ordered = useMemo(() => groups.flatMap((g) => g.items), [groups])
  const total = list.data?.pages[0]?.count ?? 0

  /* New tickets arriving over the socket (a page-count-neutral growth of the known set) get a short highlight + announcement. */
  const known = useRef<{ key: string; ids: Set<number>; pages: number } | null>(null)
  const [fresh, setFresh] = useState<Set<number>>(new Set())
  useEffect(() => {
    if (!list.data) return
    const pages = list.data.pages.length
    const ids = new Set(tickets.map((t) => t.id))
    const prev = known.current
    if (prev && prev.key === queryKey && prev.pages === pages) {
      const added = tickets.filter((t) => !prev.ids.has(t.id) && t.status !== 'RESOLVED' && t.status !== 'CLOSED')
      if (added.length) {
        setFresh((f) => new Set([...f, ...added.map((t) => t.id)]))
        announce(added.length === 1 ? `New ticket ${added[0]!.reference} from ${added[0]!.requester.name}: ${added[0]!.subject}` : `${added.length} new tickets in the inbox`)
        const gone = added.map((t) => t.id)
        setTimeout(() => setFresh((f) => new Set([...f].filter((id) => !gone.includes(id)))), 7000)
      }
    }
    known.current = { key: queryKey, ids, pages }
  }, [list.data, tickets, queryKey])

  /** Switch view: filters and search reset, display preferences (sort, density) stay. */
  const setView = useCallback(
    (next: ViewKey, filters: Record<string, string> = {}) =>
      setParams(
        (prev) => {
          const out = new URLSearchParams()
          if (next !== 'attention') out.set('view', next)
          for (const k of ['sort', 'density']) if (prev.get(k)) out.set(k, prev.get(k)!)
          for (const [k, v] of Object.entries(filters)) out.set(k, v)
          return out
        },
        { replace: true },
      ),
    [setParams],
  )

  const activeFilters = FILTER_KEYS.filter((k) => params.get(k))
  /** Drop filters, search and sort but keep the current view. */
  const clearAll = useCallback(() => setParams(view === 'attention' ? new URLSearchParams() : new URLSearchParams({ view }), { replace: true }), [setParams, view])

  return {
    slug,
    params,
    view: view as ViewKey,
    sort,
    density,
    search,
    activeFilters: activeFilters as FilterKey[],
    patch,
    setView,
    clearAll,
    stats,
    list,
    tickets,
    groups,
    ordered,
    total,
    fresh,
    grouped,
  }
}
