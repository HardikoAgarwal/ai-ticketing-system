import { Check, ChevronDown, ChevronsUpDown, PanelLeftClose, PanelLeftOpen, Search, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { homeFor, useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { Avatar } from '@/components/ds/Avatar'
import { Kbd } from '@/components/ds/Kbd'
import { useConnectionState } from '@/realtime/RealtimeProvider'
import { NotificationBell } from '@/components/NotificationBell'
import { openPalette } from './commands'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { UserMenu } from '@/layouts/UserMenu'
import { cn } from '@/lib/utils'

export interface DockItem {
  to: string
  label: string
  icon: LucideIcon
  /** Exact match only (no sub-routes), e.g. Home, so it is not active on every page below it. */
  end?: boolean
  count?: number
  /** Sub-pages: the item becomes an expandable row (a dropdown submenu) that stays closed until opened or until one of them is the current page. */
  children?: DockItem[]
  /** Not active on this path prefix, for a sibling that lives under the same URL (Active vs History). */
  exclude?: string
  /** Label for the phone tab bar, where there is no group heading to explain "Active". */
  mobileLabel?: string
  /** Phone tab bar: `false` leaves the item out; an object makes it stand in for its whole group (its own link and icon). */
  mobile?: false | { to: string; icon: LucideIcon }
}

/** Active-state for a nav item; tolerant of trailing slashes. */
export function isItemActive(item: DockItem, pathname: string) {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (item.exclude && (path === item.exclude || path.startsWith(`${item.exclude}/`))) return false
  if (path === item.to) return true
  return !item.end && path.startsWith(`${item.to}/`)
}

const PIN_KEY = 'helpdesk.dock.pinned'
function usePinned() {
  const [pinned, setPinned] = useState(() => {
    try {
      return localStorage.getItem(PIN_KEY) === '1'
    } catch {
      return false
    }
  })
  const toggle = () =>
    setPinned((p) => {
      try {
        localStorage.setItem(PIN_KEY, p ? '0' : '1')
      } catch {
        /* ignore */
      }
      return !p
    })
  return [pinned, toggle] as const
}

/* Labels live in the DOM always (screen readers); they are only hidden visually while the dock is collapsed. */
const SHOW = 'group-hover/dock:opacity-100 group-has-[:focus-visible,[data-state=open]]/dock:opacity-100 group-data-[pinned=true]/dock:opacity-100'
const LABEL = 'min-w-0 truncate whitespace-nowrap opacity-0 transition-opacity duration-150 ' + SHOW
const ROW = 'flex h-10 w-full items-center gap-3 rounded-control px-[13.5px] text-sm font-medium transition-colors'

function WorkspaceBlock() {
  const { user } = useAuth()
  const { brief, slug } = useWorkspace()
  const navigate = useNavigate()
  const memberships = user?.memberships ?? []
  const trigger = (
    <button className={cn(ROW, 'h-[45px] px-[2.5px] text-ink hover:bg-sunken')} aria-label={memberships.length > 1 ? `Workspace: ${brief?.name}. Switch workspace` : `Workspace: ${brief?.name}`}>
      <Avatar name={brief?.name} size="lg" className="bg-ink text-canvas border-ink" />
      <span className={cn(LABEL, 'flex-1 pl-0.5 text-left text-[15px] font-semibold tracking-tight')}>{brief?.name ?? 'Workspace'}</span>
      {memberships.length > 1 && <ChevronsUpDown className={cn('size-4 shrink-0 text-ink-3 opacity-0 group-hover/dock:opacity-100 group-has-[:focus-visible,[data-state=open]]/dock:opacity-100 group-data-[pinned=true]/dock:opacity-100')} aria-hidden />}
    </button>
  )
  if (memberships.length <= 1) return trigger
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="w-60">
        <DropdownMenuLabel className="text-xs text-ink-3">Your workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {memberships.map((m) => (
          <DropdownMenuItem key={m.workspace.slug} onClick={() => user && navigate(homeFor(user, m.workspace.slug))}>
            <Avatar name={m.workspace.name} size="sm" />
            <span className="flex-1 truncate">{m.workspace.name}</span>
            {m.workspace.slug === slug && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NavRow({ item, sub = false }: { item: DockItem; sub?: boolean }) {
  const { pathname } = useLocation()
  const active = isItemActive(item, pathname)
  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      aria-label={item.label + (item.count ? `, ${item.count}` : '')}
      className={cn(ROW, 'relative', sub && 'h-9 text-[13px]', active ? 'bg-ink text-canvas' : 'text-ink-2 hover:bg-sunken hover:text-ink')}
    >
      <span className="relative flex size-[18px] shrink-0 items-center justify-center">
        <item.icon className={sub ? 'size-4' : 'size-[18px]'} aria-hidden />
        {!!item.count && !active && <span className="absolute -top-1.5 -right-2 size-2 rounded-full bg-violet ring-2 ring-surface group-hover/dock:hidden group-has-[:focus-visible,[data-state=open]]/dock:hidden group-data-[pinned=true]/dock:hidden" aria-hidden />}
      </span>
      <span className={cn(LABEL, 'flex-1')}>{item.label}</span>
      {!!item.count && (
        <span className={cn('hidden h-6 min-w-6 items-center justify-center rounded-md bg-violet px-2 text-[13px] font-bold text-white tabular-nums shadow-sm group-hover/dock:inline-flex group-has-[:focus-visible,[data-state=open]]/dock:inline-flex group-data-[pinned=true]/dock:inline-flex')}>{item.count}</span>
      )}
    </Link>
  )
}

/**
 * A dock row that opens a dropdown submenu (Settings and its tabs). It stays closed until you open it, and opens by itself when you are on one of its pages.
 * The submenu is only shown while the dock itself is expanded; the collapsed icon rail shows just the parent icon.
 */
function NavGroup({ item }: { item: DockItem }) {
  const { pathname } = useLocation()
  const [manual, setManual] = useState<boolean | null>(null)
  const activeIndex = item.children?.findIndex((c) => isItemActive(c, pathname)) ?? -1
  const childActive = activeIndex >= 0
  const open = manual ?? childActive
  const listId = `dock-sub-${item.label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setManual(!open)}
        className={cn(ROW, 'relative', childActive ? 'font-semibold text-ink' : 'text-ink-2 hover:bg-sunken hover:text-ink', childActive && !open && 'bg-sunken')}
      >
        <span className="relative flex size-[18px] shrink-0 items-center justify-center">
          <item.icon className="size-[18px]" aria-hidden />
        </span>
        <span className={cn(LABEL, 'flex-1 text-left')}>{item.label}</span>
        <ChevronDown className={cn('size-4 shrink-0 text-ink-3 opacity-0 transition-[transform,opacity] duration-200 group-hover/dock:opacity-100 group-has-[:focus-visible,[data-state=open]]/dock:opacity-100 group-data-[pinned=true]/dock:opacity-100', open && 'rotate-180')} aria-hidden />
      </button>
      <ul id={listId} hidden={!open} className="mt-1 ml-[22px] hidden flex-col gap-1 group-hover/dock:[&:not([hidden])]:flex group-has-[:focus-visible,[data-state=open]]/dock:[&:not([hidden])]:flex group-data-[pinned=true]/dock:[&:not([hidden])]:flex">
        {item.children?.map((c, i) => {
          const count = item.children?.length ?? 0
          const last = i === count - 1
          const current = i === activeIndex // only this tick is dark
          const reached = activeIndex >= 0 && i <= activeIndex // the line above this tick leads down to the current tab: dark
          const passed = activeIndex >= 0 && i < activeIndex // the current tab is further down: the line carries on below this tick
          return (
            // a thread: a thin line runs down the left, dark from the top to the current tab and grey below it; every tab hangs off it with a short grey tick,
            // and only the current tab's tick is dark (the last tab has a rounded corner)
            <li key={c.to} className="relative pl-4">
              {last ? (
                <span aria-hidden className={cn('absolute top-0 left-0 h-[18px] w-4 rounded-bl-[10px] border-b border-l transition-colors', current ? 'border-ink' : 'border-line-strong')} />
              ) : (
                <>
                  <span aria-hidden className={cn('absolute top-0 left-0 h-[18px] w-px transition-colors', reached ? 'bg-ink' : 'bg-line-strong')} />
                  <span aria-hidden className={cn('absolute top-[18px] -bottom-1 left-0 w-px transition-colors', passed ? 'bg-ink' : 'bg-line-strong')} />
                  <span aria-hidden className={cn('absolute top-[18px] left-0 h-px w-4 transition-colors', current ? 'bg-ink' : 'bg-line-strong')} />
                </>
              )}
              <NavRow item={c} sub />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * Left dock: 64px icon rail that expands to a labelled panel on hover / keyboard focus, or stays open when pinned.
 * Expanding overlays the page (it never reflows content) unless pinned.
 */
export function Dock({ items }: { items: DockItem[] }) {
  const [pinned, togglePinned] = usePinned()
  const state = useConnectionState()
  const status = {
    live: { label: 'Live updates', dot: 'bg-mint-ink' },
    connecting: { label: 'Connecting…', dot: 'bg-butter-ink animate-pulse motion-reduce:animate-none' },
    offline: { label: 'Reconnecting…', dot: 'bg-ink-3' },
  }[state]
  return (
    <div className={cn('relative hidden shrink-0 transition-[width] duration-200 md:block', pinned ? 'w-[232px]' : 'w-16')}>
      {/* the rail opens on hover, on keyboard focus, or while one of its menus is open; a mouse click leaves no focus ring, so moving the pointer away closes it */}
      <nav
        aria-label="Primary"
        data-pinned={pinned}
        className="group/dock fixed inset-y-0 left-0 z-40 w-16 border-r border-line bg-surface transition-[width,box-shadow] duration-200 hover:w-[232px] hover:shadow-dock has-[:focus-visible,[data-state=open]]:w-[232px] has-[:focus-visible,[data-state=open]]:shadow-dock data-[pinned=true]:w-[232px]"
      >
        <div className="flex h-full w-full flex-col overflow-hidden px-[9px] py-3">
          <WorkspaceBlock />
          <button type="button" onClick={openPalette} className={cn(ROW, 'mt-3 border border-line-strong px-[12.5px] text-ink-3 hover:border-violet/60 hover:text-ink')} aria-label="Search tickets and run commands">
            <Search className="size-[18px] shrink-0" aria-hidden />
            <span className={cn(LABEL, 'flex-1 text-left')}>Search</span>
            <Kbd keys="mod+k" className="hidden group-hover/dock:inline-flex group-has-[:focus-visible,[data-state=open]]/dock:inline-flex group-data-[pinned=true]/dock:inline-flex" />
          </button>
          <ul className="scroll-quiet mt-3 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
            {items.map((it) => (
              <li key={it.to}>{it.children ? <NavGroup item={it} /> : <NavRow item={it} />}</li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
            <NotificationBell variant="dock" labelClassName={LABEL} rowClassName={cn(ROW, 'text-ink-2 hover:bg-sunken hover:text-ink')} />
            <UserMenu variant="dock" labelClassName={LABEL} trailingClassName={cn('opacity-0 transition-opacity duration-150', SHOW)} status={status} rowClassName={cn(ROW, 'h-[45px] border border-line bg-surface-2 px-[3.5px] text-ink hover:bg-sunken')} />
          </div>
        </div>
      </nav>
      {/* a tab fixed to the sidebar's right edge: the sidebar's own colour, flat where it meets the sidebar, rounded outside. It sits beside the sidebar (not in it), so pointing at it does not open the collapsed sidebar */}
      <button
        type="button"
        onClick={togglePinned}
        aria-pressed={pinned}
        aria-label={pinned ? 'Collapse the sidebar' : 'Keep the sidebar open'}
        title={pinned ? 'Collapse the sidebar' : 'Keep the sidebar open'}
        className={cn(
          'fixed bottom-6 z-30 hidden h-11 w-10 items-center justify-center rounded-r-full border border-l-0 border-line bg-surface pr-1 text-ink-2 transition-[left,color,background-color] duration-200 hover:bg-surface-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none md:flex',
          pinned ? 'left-[232px]' : 'left-16',
        )}
      >
        {pinned ? <PanelLeftClose className="size-5" aria-hidden /> : <PanelLeftOpen className="size-5" aria-hidden />}
      </button>
    </div>
  )
}
