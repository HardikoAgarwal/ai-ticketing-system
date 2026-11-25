import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

export type ThemeChoice = 'light' | 'dark' | 'system'
const KEY = 'helpdesk.theme'

interface ThemeCtx {
  choice: ThemeChoice
  /** The theme actually in effect right now (system resolved). */
  resolved: 'light' | 'dark'
  setChoice: (c: ThemeChoice) => void
}

const Ctx = createContext<ThemeCtx>({ choice: 'system', resolved: 'light', setChoice: () => {} })

function readChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
  } catch {
    return 'system'
  }
}

const systemPrefersDark = () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches

/** Applies `.dark` to <html>. The marketing page (/) always stays on its own fixed palette. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(readChoice)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)
  const { pathname } = useLocation()

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = () => setSystemDark(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const resolved: 'light' | 'dark' = choice === 'system' ? (systemDark ? 'dark' : 'light') : choice
  const onLanding = pathname === '/'

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark' && !onLanding)
  }, [resolved, onLanding])

  const setChoice = useCallback((c: ThemeChoice) => {
    setChoiceState(c)
    try {
      localStorage.setItem(KEY, c)
    } catch {
      /* private mode: the choice just won't persist */
    }
  }, [])

  const value = useMemo(() => ({ choice, resolved, setChoice }), [choice, resolved, setChoice])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(Ctx)
