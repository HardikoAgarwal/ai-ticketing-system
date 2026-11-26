import { createContext, useContext, useLayoutEffect } from 'react'

export interface ShellCtx {
  bleed: boolean
  setBleed: (v: boolean) => void
}
export const ShellContext = createContext<ShellCtx>({ bleed: false, setBleed: () => {} })

export const useShell = () => useContext(ShellContext)

/**
 * Call from a page that manages its own layout (the split inbox, full-height panes). While mounted, the shell stops
 * padding/constraining the page and stops scrolling <main>: the page gets the whole area (flex column, min-h-0) and
 * must scroll its own panes. Pages that do not call this get the default padded, scrolling container.
 */
export function useShellBleed(on = true) {
  const { setBleed } = useShell()
  useLayoutEffect(() => {
    setBleed(on)
    return () => setBleed(false)
  }, [on, setBleed])
}
