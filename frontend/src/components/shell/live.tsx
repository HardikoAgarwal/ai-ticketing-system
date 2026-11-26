import { useSyncExternalStore } from 'react'

import { liveMessage, subscribeLive } from './announce'

/** Mounted once by the shell. Use announce() from ./announce to speak to it. */
export function LiveRegion() {
  const text = useSyncExternalStore(subscribeLive, liveMessage)
  return (
    <div aria-live="polite" aria-atomic="true" role="status" className="sr-only">
      {text}
    </div>
  )
}
