import type { LucideIcon } from 'lucide-react'
import { useEffect, useSyncExternalStore } from 'react'

/**
 * Command registry behind the Cmd/Ctrl-K palette. Any component can contribute commands while it is mounted:
 *
 *   const commands = useMemo<Command[]>(() => [
 *     { id: 'ticket.resolve', title: 'Resolve ticket', group: 'This ticket', icon: CheckCheck, shortcut: 'e', perform: resolve },
 *   ], [resolve])
 *   useRegisterCommands(commands)      // memoize the array; it re-registers when the identity changes
 *
 * `when: false` hides a command (e.g. already resolved). Commands are removed automatically on unmount.
 */
export interface Command {
  id: string
  title: string
  /** Section header in the palette. Commands of the same group are listed together. */
  group?: string
  icon?: LucideIcon
  /** Extra words that should match the search (synonyms). */
  keywords?: string[]
  /** Shown as a hint on the right; wire the actual key with useShortcut. */
  shortcut?: string
  /** Hide without unregistering. */
  when?: boolean
  perform: () => void
}

const groups = new Map<number, Command[]>()
const listeners = new Set<() => void>()
let nextId = 1
let snapshot: Command[] = []

function publish() {
  snapshot = [...groups.values()].flat().filter((c) => c.when !== false)
  listeners.forEach((l) => l())
}

export function useRegisterCommands(commands: Command[]) {
  useEffect(() => {
    const id = nextId++
    groups.set(id, commands)
    publish()
    return () => {
      groups.delete(id)
      publish()
    }
  }, [commands])
}

export function useCommands(): Command[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => snapshot,
  )
}

/* palette open state lives here too so any component (command bar, dock, shortcuts) can open it */
let open = false
const openListeners = new Set<() => void>()
export function setPaletteOpen(v: boolean) {
  open = v
  openListeners.forEach((l) => l())
}
export const openPalette = () => setPaletteOpen(true)
export function usePaletteOpen(): boolean {
  return useSyncExternalStore(
    (cb) => {
      openListeners.add(cb)
      return () => openListeners.delete(cb)
    },
    () => open,
  )
}
