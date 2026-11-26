import { useMemo } from 'react'

import { useWorkspace } from '@/auth/workspace'

/**
 * The ticket list remembers the ids it is currently showing (and the URL query that produced them)
 * so the full-page ticket view can offer Back to the list, Previous and Next.
 */
const KEY = 'helpdesk.queue'

interface Remembered {
  ids: number[]
  search: string
  /** Which list: "tickets" (active) or "tickets/history". */
  path: string
}

function read(): Remembered {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Remembered
      if (Array.isArray(parsed.ids)) return { ids: parsed.ids, search: parsed.search ?? '', path: parsed.path ?? 'tickets' }
    }
  } catch {
    /* storage unavailable: fall through */
  }
  return { ids: [], search: '', path: 'tickets' }
}

/** Call whenever the visible list changes. `queueSearch` is the list's query string ("?view=mine" or ""). */
export function rememberQueue(ids: number[], queueSearch: string, path = 'tickets') {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ids, search: queueSearch, path }))
  } catch {
    /* ignore */
  }
}

export interface QueueNeighbors {
  prevId?: number
  nextId?: number
  /** 1-based position of the current ticket in the remembered list. */
  position?: number
  total?: number
  /** Where "Back to tickets" should go, with the remembered filters. */
  backTo: string
  /** What to call that place: "All tickets" or "History". */
  backLabel: string
}

export function useQueueNeighbors(currentId: number): QueueNeighbors {
  const { slug } = useWorkspace()
  return useMemo(() => {
    const { ids, search, path } = read()
    const base = `/w/${slug}/agent/${path}`
    const backLabel = path === 'tickets/history' ? 'History' : 'All tickets'
    const backTo = search ? `${base}${search.startsWith('?') ? search : `?${search}`}` : base
    const i = ids.indexOf(currentId)
    if (i === -1) return { backTo, backLabel }
    return { prevId: ids[i - 1], nextId: ids[i + 1], position: i + 1, total: ids.length, backTo, backLabel }
  }, [slug, currentId])
}
