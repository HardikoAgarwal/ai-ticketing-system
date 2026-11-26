import { useCallback, useEffect, useRef, useState } from 'react'

import { ApiError } from '@/lib/api'

import { SETUP_STEPS } from './setup-steps'

export const isColdStart = (err: unknown) => err instanceof ApiError && (err.status === 0 || err.status >= 502)

/**
 * Drives the visual progress of the setup screen. Steps advance on a timer, but the last one only lights up
 * once the real request is `done`. `elapsed` (seconds) is exposed so callers can show the "server is waking up" note.
 */
export function useSetupProgress({ active, done, error }: { active: boolean; done: boolean; error: boolean }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!active || error || done) return
    const id = window.setInterval(() => setElapsed((s) => s + 0.5), 500)
    return () => window.clearInterval(id)
  }, [active, error, done])
  // reset the clock whenever a launch ends or a new one starts
  useEffect(() => () => setElapsed(0), [active])
  const step = done ? SETUP_STEPS.length - 1 : Math.min(Math.floor(elapsed / 1.4), SETUP_STEPS.length - 2)
  const progress = done ? 100 : Math.min(90, 6 + elapsed * 11)
  return { step, progress, elapsed, waking: elapsed > 7 }
}

/** Retry loop for a sleeping free-tier API: cold-start failures wait 4s and try again, up to `attempts` times. */
export function useColdStartRetry() {
  const cancelled = useRef(false)
  useEffect(() => {
    cancelled.current = false
    return () => {
      cancelled.current = true
    }
  }, [])
  return useCallback(async <T,>(fn: () => Promise<T>, attempts = 4): Promise<T> => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await fn()
      } catch (err) {
        if (!isColdStart(err) || attempt >= attempts - 1 || cancelled.current) throw err
        await new Promise((r) => setTimeout(r, 4000))
      }
    }
  }, [])
}
