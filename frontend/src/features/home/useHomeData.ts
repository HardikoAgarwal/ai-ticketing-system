import { useQuery } from '@tanstack/react-query'
import { differenceInDays, parseISO } from 'date-fns'
import { useMemo } from 'react'

import { useWorkspace } from '@/auth/workspace'
import type { StaffTicket } from '@/lib/types'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

/** Everything the home page reads. Each query fails and loads on its own so one slow call never blanks the page. */
export function useHomeData(days: number) {
  const { slug, api } = useWorkspace()
  const poll = useFallbackInterval()
  const live = poll || 60_000

  const analytics = useQuery({ queryKey: ['analytics', slug, days], queryFn: () => api.analytics(days) })
  const open = useQuery({
    queryKey: ['home-open-tickets', slug],
    queryFn: () => api.tickets.listStaff({ status: 'OPEN,IN_PROGRESS', page_size: 100 }),
    refetchInterval: live,
  })
  return { analytics, open }
}

/** Days waiting, 0 to 13, then "14+". The colour of a column follows how worrying that wait is. */
export const MAX_DAY = 14
export function zoneOf(day: number): 'mint' | 'butter' | 'peach' | 'rose' {
  return day < 1 ? 'mint' : day < 3 ? 'butter' : day < 7 ? 'peach' : 'rose'
}

export interface AgeSummary {
  rows: { day: number; label: string; count: number }[]
  median: number | null
  oldest: { days: number; reference: string } | null
  stale: number
}

/** Open tickets grouped by whole days since they arrived, plus the median wait, the oldest ticket and how many are over a week old. */
export function ageOf(tickets: StaffTicket[]): AgeSummary {
  const now = new Date()
  const rows = Array.from({ length: MAX_DAY + 1 }, (_, day) => ({ day, label: day === MAX_DAY ? `${MAX_DAY}+` : String(day), count: 0 }))
  const days = tickets.map((t) => Math.max(0, differenceInDays(now, parseISO(t.created_at))))
  for (const d of days) rows[Math.min(d, MAX_DAY)].count++
  const sorted = [...days].sort((x, y) => x - y)
  let oldest: AgeSummary['oldest'] = null
  for (const t of tickets) if (!oldest || differenceInDays(now, parseISO(t.created_at)) > oldest.days) oldest = { days: Math.max(0, differenceInDays(now, parseISO(t.created_at))), reference: t.reference }
  return { rows, median: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null, oldest, stale: days.filter((d) => d >= 7).length }
}

export interface WorkloadRow {
  id: number | null
  name: string
  count: number
  overdue: number
}

/** Open tickets per owner, busiest first, with "Unassigned" always shown so a pile-up there is obvious. */
export function useWorkload(tickets: StaffTicket[] | undefined): WorkloadRow[] {
  return useMemo(() => {
    if (!tickets) return []
    const map = new Map<number | null, WorkloadRow>()
    for (const t of tickets) {
      const id = t.assigned_to?.id ?? null
      const row = map.get(id) ?? { id, name: t.assigned_to?.full_name ?? 'Unassigned', count: 0, overdue: 0 }
      row.count++
      if (t.sla_state === 'overdue') row.overdue++
      map.set(id, row)
    }
    if (!map.has(null)) map.set(null, { id: null, name: 'Unassigned', count: 0, overdue: 0 })
    return [...map.values()].sort((a, b) => (a.id === null ? -1 : b.id === null ? 1 : b.count - a.count))
  }, [tickets])
}
