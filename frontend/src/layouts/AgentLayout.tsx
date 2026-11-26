import { useQuery } from '@tanstack/react-query'
import { BookOpen, Inbox, Keyboard, LayoutDashboard, Monitor, Moon, Settings, Sun } from 'lucide-react'
import { Suspense, useMemo } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { useWorkspace } from '@/auth/workspace'
import { DemoDock } from '@/components/dashboard/DemoDock'
import { SkeletonRows } from '@/components/ds/states'
import { CommandBar } from '@/components/shell/CommandBar'
import { useRegisterCommands, type Command } from '@/components/shell/commands'
import { CommandPalette } from '@/components/shell/CommandPalette'
import { Dock, isItemActive, type DockItem } from '@/components/shell/Dock'
import { LiveRegion } from '@/components/shell/live'
import { ShellProvider } from '@/components/shell/ShellContext'
import { useShell } from '@/components/shell/shell-context'
import { ShortcutsHelp } from '@/components/shell/ShortcutsHelp'
import { openShortcutsHelp, useShortcut } from '@/components/shell/shortcuts'
import { cn } from '@/lib/utils'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'
import { useTheme } from '@/theme/ThemeProvider'

/** Bottom tab bar for phones (the dock is hidden below md). */
function TabBar({ items }: { items: DockItem[] }) {
  const { pathname } = useLocation()
  return (
    <nav aria-label="Primary" className="flex shrink-0 items-stretch justify-around border-t border-line bg-surface px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:hidden">
      {items.map((it) => {
        const active = isItemActive(it, pathname)
        return (
          <Link
            key={it.to}
            to={it.to}
            aria-current={active ? 'page' : undefined}
            aria-label={it.count ? `${it.label}, ${it.count}` : it.label}
            className={cn('relative flex h-14 min-w-16 flex-1 flex-col items-center justify-center gap-1 rounded-control text-[11px] font-medium', active ? 'text-ink' : 'text-ink-3')}
          >
            <span className={cn('relative flex h-7 w-12 items-center justify-center rounded-control', active && 'bg-ink text-canvas')}>
              <it.icon className="size-[18px]" aria-hidden />
              {!!it.count && !active && <span className="absolute top-0.5 right-2 size-2 rounded-full bg-violet" aria-hidden />}
            </span>
            {it.label}
          </Link>
        )
      })}
    </nav>
  )
}

function Frame() {
  const { slug, api, manager, isDemo } = useWorkspace()
  const { bleed } = useShell()
  const navigate = useNavigate()
  const { setChoice } = useTheme()
  const refetchInterval = useFallbackInterval()
  const { data: stats } = useQuery({ queryKey: ['stats', slug], queryFn: api.tickets.stats, refetchInterval })
  const base = `/w/${slug}/agent`

  const items = useMemo<DockItem[]>(
    () => [
      { to: base, label: 'Home', icon: LayoutDashboard, end: true },
      // active on the list and on /tickets/:id; the badge is the needs-attention count
      { to: `${base}/tickets`, label: 'Tickets', icon: Inbox, count: stats ? stats.open + stats.in_progress : undefined },
      { to: `${base}/knowledge`, label: 'Knowledge', icon: BookOpen },
      { to: `${base}/settings`, label: manager ? 'Settings' : 'Team', icon: Settings },
    ],
    [base, stats, manager],
  )

  const commands = useMemo<Command[]>(
    () => [
      { id: 'go.home', title: 'Go to Home', group: 'Navigate', icon: LayoutDashboard, shortcut: 'g h', keywords: ['dashboard', 'overview', 'analytics', 'stats', 'reports'], perform: () => navigate(base) },
      { id: 'go.tickets', title: 'Go to Tickets', group: 'Navigate', icon: Inbox, shortcut: 'g t', keywords: ['inbox', 'queue', 'list'], perform: () => navigate(`${base}/tickets`) },
      { id: 'go.mine', title: 'Show tickets assigned to me', group: 'Navigate', icon: Inbox, keywords: ['mine', 'assigned'], perform: () => navigate(`${base}/tickets?view=mine`) },
      { id: 'go.kb', title: 'Go to Knowledge base', group: 'Navigate', icon: BookOpen, shortcut: 'g k', keywords: ['articles', 'kb'], perform: () => navigate(`${base}/knowledge`) },
      { id: 'go.settings', title: manager ? 'Go to Settings' : 'Go to Team', group: 'Navigate', icon: Settings, shortcut: 'g s', keywords: ['team', 'sla', 'categories'], perform: () => navigate(`${base}/settings`) },
      { id: 'theme.light', title: 'Theme: Light', group: 'Appearance', icon: Sun, keywords: ['appearance'], perform: () => setChoice('light') },
      { id: 'theme.dark', title: 'Theme: Dark', group: 'Appearance', icon: Moon, keywords: ['appearance'], perform: () => setChoice('dark') },
      { id: 'theme.system', title: 'Theme: Match system', group: 'Appearance', icon: Monitor, keywords: ['appearance', 'auto'], perform: () => setChoice('system') },
      { id: 'help.shortcuts', title: 'Keyboard shortcuts', group: 'Help', icon: Keyboard, shortcut: '?', perform: openShortcutsHelp },
    ],
    [base, manager, navigate, setChoice],
  )
  useRegisterCommands(commands)
  useShortcut('g h', () => navigate(base), { description: 'Go to Home', group: 'Navigate' })
  useShortcut('g t', () => navigate(`${base}/tickets`), { description: 'Go to Tickets', group: 'Navigate' })
  useShortcut('g k', () => navigate(`${base}/knowledge`), { description: 'Go to Knowledge base', group: 'Navigate' })
  useShortcut('g s', () => navigate(`${base}/settings`), { description: 'Go to Settings', group: 'Navigate' })

  return (
    <div className="flex h-dvh w-full bg-canvas text-ink">
      <a href="#main" className="sr-only z-[60] rounded-control bg-ink px-4 py-2.5 text-sm font-medium text-canvas focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to main content
      </a>
      <Dock items={items} />
      <div className="flex min-w-0 flex-1 flex-col">
        <CommandBar />
        <main id="main" tabIndex={-1} className={cn('min-h-0 flex-1 outline-none', bleed ? 'flex flex-col overflow-hidden' : 'scroll-quiet overflow-y-auto')}>
          {/* one stable tree: toggling bleed only changes classes, so the routed page is never remounted */}
          <div className={cn(bleed ? 'flex min-h-0 flex-1 flex-col' : 'mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8 md:py-8', !bleed && isDemo && 'pb-24')}>
            <Suspense fallback={<SkeletonRows rows={6} className={bleed ? 'p-6' : undefined} />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
        <TabBar items={items} />
      </div>
      <CommandPalette />
      <ShortcutsHelp />
      <LiveRegion />
      <DemoDock />
    </div>
  )
}

/**
 * Agent shell: dock (left) + command bar (top) + content. Pages render in <Outlet/>.
 * Default content is a padded, scrolling container; a page that scrolls its own regions (the ticket list, the ticket page)
 * takes over the full area by calling `useShellBleed()`.
 */
export function AgentLayout() {
  return (
    <ShellProvider>
      <Frame />
    </ShellProvider>
  )
}
