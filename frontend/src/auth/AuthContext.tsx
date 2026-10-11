import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { setSessionExpiredHandler, tokenStore } from '@/lib/api'
import { authApi } from '@/lib/endpoints'
import type { User } from '@/lib/types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(tokenStore.access))
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!tokenStore.access) return
    authApi
      .me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null)
      queryClient.clear()
      toast.info('Your session expired. Please sign in again.')
    })
  }, [queryClient])

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password)
    tokenStore.set(data.access, data.refresh)
    setUser(data.user)
    return data.user
  }, [])

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
