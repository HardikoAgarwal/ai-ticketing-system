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
}

function read(): Remembered {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Remembered
      if (Array.isArray(parsed.ids)) return { ids: parsed.ids, search: parsed.search ?? '' }
    }
  } catch {
    /* storage unavailable: fall through */
  }
  return { ids: [], search: '' }
}

/** Call whenever the visible list changes. `queueSearch` is the list's query string ("?view=mine" or ""). */
export function rememberQueue(ids: number[], queueSearch: string) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ids, search: queueSearch }))
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
}

export function useQueueNeighbors(currentId: number): QueueNeighbors {
  const { slug } = useWorkspace()
  return useMemo(() => {
    const { ids, search } = read()
    const base = `/w/${slug}/agent/tickets`
    const backTo = search ? `${base}${search.startsWith('?') ? search : `?${search}`}` : base
    const i = ids.indexOf(currentId)
    if (i === -1) return { backTo }
    return { prevId: ids[i - 1], nextId: ids[i + 1], position: i + 1, total: ids.length, backTo }
  }, [slug, currentId])
}
