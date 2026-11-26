import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { startOfDay, subDays } from 'date-fns'
import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useWorkspace } from '@/auth/workspace'
import type { StaffTicket } from '@/lib/types'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

export type FinishedStatus = 'all' | 'RESOLVED' | 'CLOSED'
export type Range = '7' | '30' | '90' | 'all'
export const RANGES: { value: Range; label: string }[] = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: 'all', label: 'All time' },
]
const PAGE = 25

/** Resolved and closed tickets. Status, date range and search live in the URL; the list is an infinite query, newest finish first. */
export function useHistory() {
  const { slug, api } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const refetchInterval = useFallbackInterval()

  const status: FinishedStatus = params.get('status') === 'RESOLVED' ? 'RESOLVED' : params.get('status') === 'CLOSED' ? 'CLOSED' : 'all'
  const range: Range = (['7', '30', '90'] as const).find((r) => r === params.get('range')) ?? 'all'
  const search = params.get('q') ?? ''
  // Whole days from the start of today, so the query key (and the cache) does not change every second.
  const [today] = useState(() => startOfDay(new Date()))
  const since = useMemo(() => (range === 'all' ? undefined : subDays(today, Number(range)).toISOString()), [range, today])
  const statuses = status === 'all' ? 'RESOLVED,CLOSED' : status

  const patch = useCallback(
    (changes: Record<string, string | null>) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(changes)) {
            if (v) next.set(k, v)
            else next.delete(k)
          }
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  const list = useInfiniteQuery({
    queryKey: ['tickets', slug, 'staff', 'history', statuses, since, search],
    queryFn: ({ pageParam }) => api.tickets.listStaff({ status: statuses, q: search || undefined, ordering: '-resolved_at', resolved_after: since, page: pageParam, page_size: PAGE }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
    placeholderData: keepPreviousData,
    refetchInterval,
  })

  /** How many are Resolved and how many Closed in the chosen range (ignores search, so the tiles stay put while you type). */
  const counts = useQuery({
    queryKey: ['tickets', slug, 'history-counts', since],
    queryFn: async () => {
      const [resolved, closed] = await Promise.all(
        (['RESOLVED', 'CLOSED'] as const).map((s) => api.tickets.listStaff({ status: s, resolved_after: since, page_size: 1 })),
      )
      return { resolved: resolved.count, closed: closed.count }
    },
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

  const filtered = status !== 'all' || range !== 'all' || !!search
  const clearAll = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams])

  return { status, range, search, patch, clearAll, filtered, list, tickets, counts }
}
