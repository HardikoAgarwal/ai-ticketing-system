import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { announce } from '@/components/shell/announce'
import type { StaffTicket } from '@/lib/types'

/**
 * Keyboard cursor (J/K), multi-selection and the bulk actions (assign to me, resolve).
 * The API has no bulk endpoint, so a bulk action is one request per ticket, run in parallel; failures are counted, not hidden.
 */
export function useInboxActions(ordered: StaffTicket[], openId: number | null) {
  const { api } = useWorkspace()
  const qc = useQueryClient()
  const [cursorRaw, setCursor] = useState<number | null>(null)
  const [selectedRaw, setSelected] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)

  // Selection/cursor entries that left the list (filtered out, resolved elsewhere, realtime) simply stop counting.
  const ids = useMemo(() => new Set(ordered.map((t) => t.id)), [ordered])
  const selected = useMemo(() => (selectedRaw.size && [...selectedRaw].some((id) => !ids.has(id)) ? new Set([...selectedRaw].filter((id) => ids.has(id))) : selectedRaw), [selectedRaw, ids])
  const cursor = cursorRaw !== null && ids.has(cursorRaw) ? cursorRaw : null

  const move = useCallback(
    (delta: 1 | -1) => {
      if (!ordered.length) return
      const from = cursor ?? openId
      const i = from === null ? -1 : ordered.findIndex((t) => t.id === from)
      const next = i === -1 ? (delta === 1 ? 0 : ordered.length - 1) : Math.max(0, Math.min(ordered.length - 1, i + delta))
      setCursor(ordered[next]!.id)
    },
    [ordered, cursor, openId],
  )

  const toggle = useCallback((id: number) => {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  const clearSelection = useCallback(() => setSelected(new Set()), [])
  const selectAll = useCallback((on: boolean) => setSelected(on ? new Set(ordered.map((t) => t.id)) : new Set()), [ordered])

  const refresh = useCallback(
    (ids: number[]) => {
      qc.invalidateQueries({ queryKey: ['tickets'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      ids.forEach((id) => qc.invalidateQueries({ queryKey: ['ticket', id] }))
    },
    [qc],
  )

  const run = useCallback(
    async (ids: number[], verb: { done: string }, op: (id: number) => Promise<unknown>) => {
      if (!ids.length || busy) return
      setBusy(true)
      const results = await Promise.allSettled(ids.map(op))
      const failed = results.filter((r) => r.status === 'rejected').length
      const ok = ids.length - failed
      refresh(ids)
      setSelected(new Set())
      setBusy(false)
      const message = `${ok} ticket${ok === 1 ? '' : 's'} ${verb.done}${failed ? `, ${failed} failed` : ''}`
      if (failed) toast.error(message)
      else toast.success(message)
      announce(message)
    },
    [busy, refresh],
  )

  const open = useMemo(() => new Map(ordered.map((t) => [t.id, t])), [ordered])
  const resolve = useCallback(
    (ids: number[]) => run(ids.filter((id) => open.get(id) && open.get(id)!.status !== 'RESOLVED' && open.get(id)!.status !== 'CLOSED'), { done: 'resolved' }, (id) => api.tickets.update(id, { status: 'RESOLVED' })),
    [run, api, open],
  )
  const assignToMe = useCallback((ids: number[]) => run(ids, { done: 'assigned to you' }, (id) => api.tickets.assignToMe(id)), [run, api])

  return { cursor, setCursor, selected, move, toggle, clearSelection, selectAll, resolve, assignToMe, busy }
}
