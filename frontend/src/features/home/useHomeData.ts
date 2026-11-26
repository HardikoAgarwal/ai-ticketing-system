import { useQuery } from '@tanstack/react-query'
import { differenceInDays, differenceInHours, parseISO } from 'date-fns'
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

/** Age buckets for open tickets. The colour runs from calm to urgent, so a tall red column is the thing to act on. */
export const AGING_BUCKETS = [
  { key: 'd1', label: 'Under 1 day', hint: 'Fresh', hue: 'mint' },
  { key: 'd3', label: '1–3 days', hint: 'Getting older', hue: 'butter' },
  { key: 'd7', label: '3–7 days', hint: 'Needs a nudge', hue: 'peach' },
  { key: 'd7p', label: 'Over 7 days', hint: 'Stale', hue: 'rose' },
] as const
export type AgingKey = (typeof AGING_BUCKETS)[number]['key']

export function agingOf(tickets: StaffTicket[]): Record<AgingKey, number> {
  const out: Record<AgingKey, number> = { d1: 0, d3: 0, d7: 0, d7p: 0 }
  const now = new Date()
  for (const t of tickets) {
    const h = differenceInHours(now, parseISO(t.created_at))
    if (h < 24) out.d1++
    else if (h < 72) out.d3++
    else if (h < 168) out.d7++
    else out.d7p++
  }
  return out
}

/** The longest-waiting open ticket, for the card headline. */
export function oldestOf(tickets: StaffTicket[]): { days: number; reference: string } | null {
  let best: StaffTicket | null = null
  for (const t of tickets) if (!best || t.created_at < best.created_at) best = t
  return best ? { days: Math.max(0, differenceInDays(new Date(), parseISO(best.created_at))), reference: best.reference } : null
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
