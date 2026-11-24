import { useMemo } from 'react'
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom'

import { FullPageLoader } from '@/components/states'
import { wsApi } from '@/lib/endpoints'
import { isManager, isStaff } from '@/lib/types'

import { homeFor, useAuth } from './AuthContext'

/** The active workspace (from the URL), the caller's role in it, and a bound API client. */
// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspace() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const membership = user?.memberships.find((m) => m.workspace.slug === slug)
  const api = useMemo(() => wsApi(slug), [slug])
  return {
    slug,
    api,
    membership,
    brief: membership?.workspace,
    role: membership?.role,
    staff: isStaff(membership?.role),
    manager: isManager(membership?.role),
    isDemo: !!membership?.workspace.is_demo,
  }
}

/** Route guard: signed in, member of :slug, and on the area matching their role. */
export function RequireArea({ area }: { area: 'agent' | 'help' }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const { slug = '' } = useParams()

  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  const membership = user.memberships.find((m) => m.workspace.slug === slug)
  if (!membership) return <Navigate to={homeFor(user)} replace />
  const wanted = isStaff(membership.role) ? 'agent' : 'help'
  if (wanted !== area) return <Navigate to={`/w/${slug}/${wanted}`} replace />
  return <Outlet />
}
