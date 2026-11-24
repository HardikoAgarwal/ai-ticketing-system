import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { homeFor, useAuth } from '@/auth/AuthContext'
import { RequireArea } from '@/auth/workspace'
import { FullPageLoader } from '@/components/states'
import { AgentLayout } from '@/layouts/AgentLayout'
import { CustomerLayout } from '@/layouts/CustomerLayout'
import { InvitePage, LoginPage, SignupPage } from '@/pages/AuthPages'
import { LandingPage } from '@/pages/LandingPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { NewTicketPage } from '@/pages/customer/NewTicketPage'
import { TicketDetailPage } from '@/pages/customer/TicketDetailPage'
import { TicketsPage } from '@/pages/customer/TicketsPage'

const QueuePage = lazy(() => import('@/pages/agent/QueuePage').then((m) => ({ default: m.QueuePage })))
const TicketPage = lazy(() => import('@/pages/agent/TicketPage').then((m) => ({ default: m.TicketPage })))
const AnalyticsPage = lazy(() => import('@/pages/agent/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })))
const KnowledgePage = lazy(() => import('@/pages/agent/KnowledgePage').then((m) => ({ default: m.KnowledgePage })))
const SettingsPage = lazy(() => import('@/pages/agent/SettingsPage').then((m) => ({ default: m.SettingsPage })))

/** /w/:slug -> the right area for the caller's role. */
function WorkspaceRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/login" replace />
  const slug = window.location.pathname.split('/')[2]
  return <Navigate to={homeFor(user, slug)} replace />
}

export default function App() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />

        <Route path="/w/:slug" element={<WorkspaceRedirect />} />

        <Route element={<RequireArea area="help" />}>
          <Route path="/w/:slug/help" element={<CustomerLayout />}>
            <Route index element={<TicketsPage />} />
            <Route path="tickets/new" element={<NewTicketPage />} />
            <Route path="tickets/:id" element={<TicketDetailPage />} />
          </Route>
        </Route>

        <Route element={<RequireArea area="agent" />}>
          <Route path="/w/:slug/agent" element={<AgentLayout />}>
            <Route index element={<QueuePage />} />
            <Route path="tickets/:id" element={<TicketPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="knowledge" element={<KnowledgePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
