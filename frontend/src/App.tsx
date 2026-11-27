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

const HomePage = lazy(() => import('@/features/home/HomePage').then((m) => ({ default: m.HomePage })))
const AgentHistoryPage = lazy(() => import('@/features/history/HistoryPage').then((m) => ({ default: m.HistoryPage })))
const AgentTicketsPage = lazy(() => import('@/features/inbox/TicketsPage').then((m) => ({ default: m.TicketsPage })))
const TicketPage = lazy(() => import('@/features/ticket/TicketPage').then((m) => ({ default: m.TicketPage })))
const ArticleEditorPage = lazy(() => import('@/features/kb/ArticleEditorPage').then((m) => ({ default: m.ArticleEditorPage })))
const KnowledgePage = lazy(() => import('@/pages/agent/KnowledgePage').then((m) => ({ default: m.KnowledgePage })))
const DesignSystemPage = lazy(() => import('@/pages/DesignSystemPage').then((m) => ({ default: m.DesignSystemPage })))
const SetupPreviewPage = lazy(() => import('@/pages/SetupPreviewPage').then((m) => ({ default: m.SetupPreviewPage })))
const UsersPage = lazy(() => import('@/features/users/UsersPage').then((m) => ({ default: m.UsersPage })))
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
        {/* hidden dev previews; not linked in product nav */}
        <Route path="/_design" element={<DesignSystemPage />} />
        <Route path="/_setup-preview" element={<SetupPreviewPage />} />

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
            <Route index element={<HomePage />} />
            <Route path="tickets" element={<AgentTicketsPage />} />
            <Route path="tickets/history" element={<AgentHistoryPage />} />
            <Route path="tickets/:id" element={<TicketPage />} />
            {/* analytics now lives on the home dashboard; keep old links and bookmarks working */}
            <Route path="analytics" element={<Navigate to=".." replace />} />
            <Route path="knowledge" element={<KnowledgePage />} />
            <Route path="knowledge/new" element={<ArticleEditorPage />} />
            <Route path="knowledge/:id" element={<ArticleEditorPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="settings/:section" element={<SettingsPage />} />
            <Route path="users" element={<UsersPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
