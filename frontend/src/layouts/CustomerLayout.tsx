import { useQuery } from '@tanstack/react-query'
import { LifeBuoy } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'

import { useWorkspace } from '@/auth/workspace'
import { Logo } from '@/components/common'
import { NotificationBell } from '@/components/NotificationBell'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { DemoBanner } from './DemoBanner'
import { UserMenu } from './UserMenu'

export function CustomerLayout() {
  const { slug, api, brief } = useWorkspace()
  const base = `/w/${slug}/help`
  const { data } = useQuery({ queryKey: ['tickets', slug, 'requester', 'unread'], queryFn: () => api.tickets.listRequester() })
  const unread = data?.results.filter((t) => t.has_unread).length ?? 0

  return (
    <div className="min-h-screen">
      <DemoBanner />
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:gap-6">
          <Link to={base} aria-label={`${brief?.name ?? 'Help'} home`}>
            <Logo name={brief?.name} subtitle="Help center" />
          </Link>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary">
            <NavLink
              to={base}
              end
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground',
                  isActive && 'bg-accent font-medium text-accent-foreground',
                )
              }
            >
              My tickets
              {unread > 0 && (
                <span className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">{unread}</span>
              )}
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <NotificationBell />
            <Button asChild size="sm">
              <Link to={`${base}/tickets/new`}>
                <LifeBuoy /> Get help
              </Link>
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
