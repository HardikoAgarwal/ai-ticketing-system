import { useQuery } from '@tanstack/react-query'
import { BarChart3, Inbox, UserRound } from 'lucide-react'
import { Suspense } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { ConnectionIndicator, Logo } from '@/components/common'
import { NotificationBell } from '@/components/NotificationBell'
import { ListSkeleton } from '@/components/states'
import { ticketsApi } from '@/lib/endpoints'
import { cn } from '@/lib/utils'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

import { UserMenu } from './UserMenu'

export function AdminLayout() {
  const refetchInterval = useFallbackInterval()
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: ticketsApi.stats, refetchInterval })

  const nav = [
    { to: '/admin', label: 'Ticket queue', icon: Inbox, end: true, count: stats ? stats.open + stats.in_progress : undefined },
    { to: '/admin?view=mine', label: 'Assigned to me', icon: UserRound, count: stats?.mine },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  ]

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card px-3 py-4 md:flex">
        <div className="px-2">
          <Logo subtitle="Support Console" />
        </div>
        <nav className="mt-8 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                  isActive && !item.to.includes('?') && 'bg-accent font-medium text-accent-foreground',
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
              {item.count !== undefined && (
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{item.count}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-2">
          <ConnectionIndicator />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:px-6">
          <div className="md:hidden">
            <Logo />
          </div>
          <nav className="flex gap-1 md:hidden">
            {nav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className="rounded-md px-2 py-1 text-sm text-muted-foreground">
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="md:hidden">
              <ConnectionIndicator />
            </div>
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-6">
          <Suspense fallback={<ListSkeleton rows={6} />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
