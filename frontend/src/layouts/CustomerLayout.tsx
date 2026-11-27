import { useQuery } from '@tanstack/react-query'
import { LifeBuoy, Ticket } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'

import { useWorkspace } from '@/auth/workspace'
import { WorkspaceMark } from '@/components/common'
import { DemoDock } from '@/components/dashboard/DemoDock'
import { NotificationBell } from '@/components/NotificationBell'
import { LiveRegion } from '@/components/shell/live'
import { useWorkspaceEnter, WorkspaceEnterLoader } from '@/components/shell/WorkspaceEnterLoader'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { UserMenu } from './UserMenu'

/** Customer shell: a light top bar on the paper canvas (no dock), one centred column, skip link and live region. */
export function CustomerLayout() {
  const { slug, api, brief, isDemo } = useWorkspace()
  const enter = useWorkspaceEnter()
  const base = `/w/${slug}/help`
  const { data } = useQuery({ queryKey: ['tickets', slug, 'requester', 'unread'], queryFn: () => api.tickets.listRequester() })
  const unread = data?.results.filter((t) => t.has_unread).length ?? 0

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-ink px-4 py-2 text-sm font-semibold text-canvas focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:h-16 sm:gap-6 sm:px-6">
          <Link to={base} aria-label={`${brief?.name ?? 'Help'} home`} className="flex min-w-0 items-center gap-3 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
            <WorkspaceMark name={brief?.name} />
            <span className="hidden min-w-0 leading-tight min-[400px]:block">
              <span className="block max-w-40 truncate text-sm font-semibold tracking-tight sm:max-w-52">{brief?.name}</span>
              <span className="block text-[11px] text-ink-3">Help center</span>
            </span>
          </Link>
          <nav className="hidden sm:block" aria-label="Primary">
            <NavLink
              to={base}
              end
              className={({ isActive }) =>
                cn(
                  'flex h-9 items-center gap-2 rounded-control px-3 text-sm font-medium text-ink-2 outline-none hover:bg-sunken hover:text-ink focus-visible:ring-2 focus-visible:ring-violet',
                  isActive && 'bg-sunken font-semibold text-ink',
                )
              }
            >
              <Ticket className="size-4" aria-hidden /> My requests
              {unread > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-chip bg-ink px-1.5 text-[11px] font-semibold text-canvas tabular-nums">
                  {unread}
                  <span className="sr-only"> with new replies</span>
                </span>
              )}
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <NotificationBell />
            <Button asChild size="sm" className="h-9 px-3">
              <Link to={`${base}/tickets/new`}>
                <LifeBuoy aria-hidden /> <span>Get help</span>
              </Link>
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className={cn('mx-auto max-w-5xl px-4 py-6 outline-none sm:px-6 sm:py-10', isDemo && 'pb-28')}>
        <Outlet />
      </main>
      <LiveRegion />
      <DemoDock />
      <WorkspaceEnterLoader show={enter.show} name={enter.name} />
    </div>
  )
}
