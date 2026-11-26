import { useCallback, useState } from 'react'

function read(key: string) {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return '' // storage unavailable: start empty
  }
}

/** Text state mirrored to localStorage so an unsent reply survives a reload. Follows `key` when the ticket changes. */
export function usePersistentDraft(key: string) {
  const [state, setState] = useState(() => ({ key, value: read(key) }))
  if (state.key !== key) setState({ key, value: read(key) })
  const set = useCallback(
    (next: string) => {
      setState({ key, value: next })
      try {
        if (next) localStorage.setItem(key, next)
        else localStorage.removeItem(key)
      } catch {
        /* ignore */
      }
    },
    [key],
  )
  return [state.key === key ? state.value : read(key), set] as const
}
