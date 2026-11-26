import { FlaskConical, Search } from 'lucide-react'

import { useWorkspace } from '@/auth/workspace'
import { ConnectionIndicator } from '@/components/common'
import { Chip } from '@/components/ds/Chip'
import { Kbd } from '@/components/ds/Kbd'
import { NotificationBell } from '@/components/NotificationBell'
import { UserMenu } from '@/layouts/UserMenu'

import { openPalette } from './commands'

/** Top bar of the content area: workspace name, a centred search/command trigger, realtime state and the demo marker. */
export function CommandBar() {
  const { brief, isDemo } = useWorkspace()
  return (
    <header className="z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-canvas/85 px-3 backdrop-blur md:px-5">
      <p className="hidden w-48 shrink-0 truncate text-sm font-semibold tracking-tight text-ink lg:block">{brief?.name}</p>
      <button
        type="button"
        onClick={openPalette}
        aria-label="Search tickets and run commands"
        aria-keyshortcuts="Control+K Meta+K"
        className="mx-auto flex h-10 w-full max-w-[560px] items-center gap-3 rounded-control border border-line-strong bg-surface px-3.5 text-left text-sm text-ink-3 shadow-[0_1px_0_var(--line)] transition-colors hover:border-violet/60 hover:text-ink-2"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 truncate">Search tickets or run a command…</span>
        <Kbd keys="mod+k" className="hidden sm:inline-flex" />
      </button>
      <div className="flex shrink-0 items-center gap-2 lg:w-48 lg:justify-end">
        {isDemo && (
          <Chip tone="violet" icon={FlaskConical} size="sm" className="hidden sm:inline-flex">
            Demo
          </Chip>
        )}
        <div className="hidden sm:block">
          <ConnectionIndicator />
        </div>
        <div className="flex items-center gap-1 md:hidden">
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
