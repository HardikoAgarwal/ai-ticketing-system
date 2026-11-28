import { Link, Outlet } from 'react-router-dom'

import { useWorkspace } from '@/auth/workspace'
import { WorkspaceMark } from '@/components/common'
import { DemoDock } from '@/components/dashboard/DemoDock'
import { NotificationBell } from '@/components/NotificationBell'
import { LiveRegion } from '@/components/shell/live'
import { ReleaseSetupWhenReady } from '@/features/auth/SetupHandoff'
import { cn } from '@/lib/utils'

import { UserMenu } from './UserMenu'

/** The page column and the floating header share one width, so their edges line up. */
const SHELL = 'mx-auto w-full max-w-[1200px] px-3 sm:px-4 md:px-8'

/**
 * Customer shell. A floating header (a rounded bar detached from the edges, translucent so the page shows through when it
 * scrolls under) with the brand, which leads home, and the alerts and account. Page actions live in each page's header.
 */
export function CustomerLayout() {
  const { slug, brief, isDemo } = useWorkspace()
  const base = `/w/${slug}/help`

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-ink px-4 py-2 text-sm font-semibold text-canvas focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
      >
        Skip to content
      </a>

      <div className="sticky top-0 z-30 pt-3 sm:pt-4">
        <div className={SHELL}>
          <header className="mx-auto flex h-[60px] w-full max-w-[560px] items-center gap-3 rounded-full border border-line bg-surface/85 pr-2 pl-2 shadow-dock backdrop-blur-md supports-[backdrop-filter]:bg-surface/75">
            <Link
              to={base}
              aria-label={`${brief?.name ?? 'Help'} home`}
              className="flex min-w-0 items-center gap-3 rounded-full py-1 pr-4 pl-1 outline-none transition-colors hover:bg-sunken focus-visible:ring-2 focus-visible:ring-violet"
            >
              <WorkspaceMark name={brief?.name} className="size-11 rounded-full text-base" />
              <span className="min-w-0 leading-tight">
                <span className="block max-w-56 truncate text-[15px] font-semibold tracking-tight">{brief?.name}</span>
                <span className="block text-xs text-ink-3">Help center</span>
              </span>
            </Link>

            <div className="ml-auto flex items-center gap-1">
              <NotificationBell large />
              <UserMenu large />
            </div>
          </header>
        </div>
      </div>

      <main id="main" tabIndex={-1} className={cn(SHELL, 'pt-8 pb-10 outline-none md:pt-10', isDemo && 'pb-28')}>
        <ReleaseSetupWhenReady>
          <Outlet />
        </ReleaseSetupWhenReady>
      </main>
      <LiveRegion />
      <DemoDock />
    </div>
  )
}
