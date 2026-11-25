import { useQuery } from '@tanstack/react-query'
import { LifeBuoy, Ticket } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'

import { useWorkspace } from '@/auth/workspace'
import { WorkspaceMark } from '@/components/common'
import { DemoDock } from '@/components/dashboard/DemoDock'
import { NotificationBell } from '@/components/NotificationBell'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { UserMenu } from './UserMenu'

export function CustomerLayout() {
  const { slug, api, brief, isDemo } = useWorkspace()
  const base = `/w/${slug}/help`
  const { data } = useQuery({ queryKey: ['tickets', slug, 'requester', 'unread'], queryFn: () => api.tickets.listRequester() })
  const unread = data?.results.filter((t) => t.has_unread).length ?? 0

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 shadow-[0_1px_0_0_var(--border)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:gap-6 sm:px-6">
          <Link to={base} aria-label={`${brief?.name ?? 'Help'} home`} className="flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <WorkspaceMark name={brief?.name} />
            <span className="hidden leading-tight min-[420px]:block">
              <span className="block max-w-44 truncate text-sm font-semibold tracking-tight">{brief?.name}</span>
              <span className="block text-[11px] text-muted-foreground">Help center</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary">
            <NavLink
              to={base}
              end
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                  isActive && 'bg-accent font-semibold text-accent-foreground hover:bg-accent',
                )
              }
            >
              <Ticket className="size-4" /> My tickets
              {unread > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-md bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground tabular-nums">{unread}</span>
              )}
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <NotificationBell />
            <Button asChild size="sm" className="h-9 rounded-xl px-3.5 shadow-xs">
              <Link to={`${base}/tickets/new`}>
                <LifeBuoy /> Get help
              </Link>
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>
      <main className={cn('mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10', isDemo && 'pb-24 sm:pb-24')}>
        <Outlet />
      </main>
      <DemoDock />
    </div>
  )
}
