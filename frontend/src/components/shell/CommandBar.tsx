import { Search } from 'lucide-react'

import { useWorkspace } from '@/auth/workspace'
import { NotificationBell } from '@/components/NotificationBell'
import { UserMenu } from '@/layouts/UserMenu'

import { openPalette } from './commands'

/**
 * Phone-only top bar. On desktop there is no top bar at all: search, live status, notifications and the account
 * menu live in the dock. Phones have no dock, so these few controls sit here.
 */
export function MobileBar() {
  const { brief } = useWorkspace()
  return (
    <header className="z-30 flex h-12 shrink-0 items-center gap-1 border-b border-line bg-canvas/90 px-3 backdrop-blur md:hidden">
      <p className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-ink">{brief?.name}</p>
      <button type="button" onClick={openPalette} aria-label="Search tickets and run commands" className="flex size-9 items-center justify-center rounded-control text-ink-2 hover:bg-sunken focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none">
        <Search className="size-[18px]" aria-hidden />
      </button>
      <NotificationBell />
      <UserMenu />
    </header>
  )
}
