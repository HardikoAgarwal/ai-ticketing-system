import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { FullPageLoader } from '@/components/states'
import type { Role } from '@/lib/types'

import { useAuth } from './AuthContext'

export function homeFor(role: Role) {
  return role === 'ADMIN' ? '/admin' : '/author'
}

export function RequireRole({ role }: { role: Role }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />
  return <Outlet />
}
