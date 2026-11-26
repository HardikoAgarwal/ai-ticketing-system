import { useMemo, useState, type ReactNode } from 'react'

import { ShellContext } from './shell-context'

export function ShellProvider({ children }: { children: ReactNode }) {
  const [bleed, setBleed] = useState(false)
  const value = useMemo(() => ({ bleed, setBleed }), [bleed])
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}
