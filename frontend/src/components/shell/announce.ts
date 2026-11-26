/**
 * Polite screen-reader announcements for things that change without focus moving
 * (a new customer reply arrived, a ticket was resolved, a draft finished).
 *   announce('Priya replied on TKT-0021')
 * <LiveRegion /> is mounted once by the shell.
 */
let message = ''
let tick = 0
const listeners = new Set<() => void>()
let clearTimer: ReturnType<typeof setTimeout> | undefined

export function announce(text: string) {
  // toggle a zero-width char so repeating the same sentence is still announced
  tick++
  message = tick % 2 ? text : `${text}​`
  listeners.forEach((l) => l())
  clearTimeout(clearTimer)
  clearTimer = setTimeout(() => {
    message = ''
    listeners.forEach((l) => l())
  }, 6000)
}

export function subscribeLive(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
export const liveMessage = () => message
