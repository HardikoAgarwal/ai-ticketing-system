import { useEffect, useState } from 'react'

/** useState backed by localStorage: drafts survive reloads and tab switches. Empty values remove the key. */
export function usePersistentText(key: string) {
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem(key) ?? ''
    } catch {
      return ''
    }
  })
  useEffect(() => {
    try {
      if (value) localStorage.setItem(key, value)
      else localStorage.removeItem(key)
    } catch {
      /* storage unavailable: the draft just won't persist */
    }
  }, [key, value])
  return [value, setValue] as const
}
