import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { homeFor, RequireRole } from '@/auth/RequireRole'
import { useAuth } from '@/auth/AuthContext'
import { FullPageLoader } from '@/components/states'
import { AuthorLayout } from '@/layouts/AuthorLayout'
import { BooksPage } from '@/pages/author/BooksPage'
import { DashboardPage } from '@/pages/author/DashboardPage'
import { NewTicketPage } from '@/pages/author/NewTicketPage'
import { TicketDetailPage } from '@/pages/author/TicketDetailPage'
import { TicketsPage } from '@/pages/author/TicketsPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

const AdminLayout = lazy(() => import('@/layouts/AdminLayout').then((m) => ({ default: m.AdminLayout })))
const QueuePage = lazy(() => import('@/pages/admin/QueuePage').then((m) => ({ default: m.QueuePage })))
const AdminTicketPage = lazy(() => import('@/pages/admin/AdminTicketPage').then((m) => ({ default: m.AdminTicketPage })))
const AnalyticsPage = lazy(() => import('@/pages/admin/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })))

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <FullPageLoader />
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />
}

export default function App() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireRole role="AUTHOR" />}>
          <Route path="/author" element={<AuthorLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="books" element={<BooksPage />} />
            <Route path="tickets" element={<TicketsPage />} />
            <Route path="tickets/new" element={<NewTicketPage />} />
            <Route path="tickets/:id" element={<TicketDetailPage />} />
          </Route>
        </Route>

        <Route element={<RequireRole role="ADMIN" />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<QueuePage />} />
            <Route path="tickets/:id" element={<AdminTicketPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
