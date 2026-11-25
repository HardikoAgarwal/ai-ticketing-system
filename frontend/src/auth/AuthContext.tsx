import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import {
  sessionStore,
  setSessionExpiredHandler,
  setWorkspaceExpiredHandler,
  type DemoMeta,
  type SessionKey,
} from '@/lib/api'
import { authApi, demoApi, type AuthResponse } from '@/lib/endpoints'
import { isStaff, type User } from '@/lib/types'

interface AuthState {
  user: User | null
  loading: boolean
  /** Set while the visitor is inside the public demo (both agent and customer sessions exist). */
  demo: DemoMeta | null
  activeView: 'agent' | 'customer' | null
  login: (email: string, password: string) => Promise<User>
  completeAuth: (data: AuthResponse) => User
  startDemo: (template: string) => Promise<string>
  switchView: (view: 'agent' | 'customer') => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

/** Home route for a user, optionally for a specific workspace. */
export function homeFor(user: User, slug?: string): string {
  const m = (slug && user.memberships.find((x) => x.workspace.slug === slug)) || user.memberships[0]
  if (!m) return '/'
  return `/w/${m.workspace.slug}/${isStaff(m.role) ? 'agent' : 'help'}`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(sessionStore.access))
  const [demo, setDemo] = useState<DemoMeta | null>(sessionStore.demo)
  const [active, setActive] = useState<SessionKey | null>(sessionStore.active)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!sessionStore.access) return
    authApi
      .me()
      .then(setUser)
      .catch(() => sessionStore.clear())
      .finally(() => setLoading(false))
  }, [])

  const reset = useCallback(() => {
    sessionStore.clear()
    setUser(null)
    setDemo(null)
    setActive(null)
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    setSessionExpiredHandler(() => {
      reset()
      toast.info('Your session expired. Please sign in again.')
    })
    setWorkspaceExpiredHandler(() => {
      reset()
      sessionStorage.setItem('helpdesk.notice', 'Your demo workspace expired. Start a fresh one below.')
      window.location.assign('/')
    })
  }, [reset])

  const completeAuth = useCallback(
    (data: AuthResponse) => {
      sessionStore.clear()
      sessionStore.setSession('main', { access: data.access, refresh: data.refresh })
      queryClient.clear()
      setDemo(null)
      setActive('main')
      setUser(data.user)
      return data.user
    },
    [queryClient],
  )

  const login = useCallback(async (email: string, password: string) => completeAuth(await authApi.login(email, password)), [completeAuth])

  const startDemo = useCallback(
    async (template: string) => {
      const res = await demoApi.start(template)
      sessionStore.clear()
      sessionStore.setSession('customer', { access: res.customer.access, refresh: res.customer.refresh }, false)
      sessionStore.setSession('agent', { access: res.agent.access, refresh: res.agent.refresh }, true)
      const meta = { slug: res.workspace_slug, expiresAt: res.expires_at, template }
      sessionStore.setDemo(meta)
      queryClient.clear()
      setDemo(meta)
      setActive('agent')
      setUser(res.agent.user)
      return res.workspace_slug
    },
    [queryClient],
  )

  const switchView = useCallback(
    async (view: 'agent' | 'customer') => {
      if (!sessionStore.has(view)) return
      sessionStore.switchTo(view)
      queryClient.clear()
      setActive(view)
      setUser(await authApi.me())
    },
    [queryClient],
  )

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      demo,
      activeView: active === 'agent' || active === 'customer' ? active : null,
      login,
      completeAuth,
      startDemo,
      switchView,
      logout: reset,
    }),
    [user, loading, demo, active, login, completeAuth, startDemo, switchView, reset],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
