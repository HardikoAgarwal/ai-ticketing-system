import { useQuery } from '@tanstack/react-query'
import { BarChart3, BookOpen, Inbox, Settings, UserRound } from 'lucide-react'
import { Suspense } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { useWorkspace } from '@/auth/workspace'
import { ConnectionIndicator, Logo } from '@/components/common'
import { NotificationBell } from '@/components/NotificationBell'
import { ListSkeleton } from '@/components/states'
import { cn } from '@/lib/utils'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

import { DemoBanner } from './DemoBanner'
import { UserMenu } from './UserMenu'

export function AgentLayout() {
  const { slug, api, brief, manager } = useWorkspace()
  const refetchInterval = useFallbackInterval()
  const { data: stats } = useQuery({ queryKey: ['stats', slug], queryFn: api.tickets.stats, refetchInterval })
  const base = `/w/${slug}/agent`

  const nav = [
    { to: base, label: 'Queue', icon: Inbox, end: true, count: stats ? stats.open + stats.in_progress : undefined },
    { to: `${base}?view=mine`, label: 'Assigned to me', icon: UserRound, count: stats?.mine },
    { to: `${base}/analytics`, label: 'Analytics', icon: BarChart3 },
    { to: `${base}/knowledge`, label: 'Knowledge base', icon: BookOpen },
    { to: `${base}/settings`, label: manager ? 'Settings' : 'Team', icon: Settings },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <DemoBanner />
      <div className="flex min-h-0 flex-1">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col self-start border-r bg-card px-3 py-4 md:flex">
          <div className="px-2">
            <Logo name={brief?.name} subtitle="Agent workspace" />
          </div>
          <nav className="mt-8 space-y-1" aria-label="Primary">
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
              <Logo name={brief?.name} />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <ConnectionIndicator />
              <NotificationBell />
              <UserMenu />
            </div>
          </header>
          <nav className="flex gap-1 overflow-x-auto border-b bg-card px-3 py-1.5 md:hidden" aria-label="Primary">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'shrink-0 rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap text-muted-foreground',
                    isActive && !item.to.includes('?') && 'bg-accent font-medium text-accent-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <main className="flex-1 px-4 py-6 md:px-6">
            <Suspense fallback={<ListSkeleton rows={6} />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  )
}
