import { Check, ChevronsUpDown, Moon, PanelLeftClose, PanelLeftOpen, Sun, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { homeFor, useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { Avatar } from '@/components/ds/Avatar'
import { NotificationBell } from '@/components/NotificationBell'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { UserMenu } from '@/layouts/UserMenu'
import { cn } from '@/lib/utils'
import { useTheme } from '@/theme/ThemeProvider'

export interface DockItem {
  to: string
  label: string
  icon: LucideIcon
  /** Exact match only (no sub-routes), e.g. the inbox root. */
  end?: boolean
  /** Extra path prefixes that also mark this item active (the inbox stays active on /tickets/:id). */
  also?: string[]
  count?: number
}

/** Active-state for a nav item; tolerant of trailing slashes. */
export function isItemActive(item: DockItem, pathname: string) {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === item.to) return true
  if (item.also?.some((p) => path === p || path.startsWith(`${p}/`))) return true
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
const LABEL = 'min-w-0 truncate whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover/dock:opacity-100 group-focus-within/dock:opacity-100 group-data-[pinned=true]/dock:opacity-100'
const ROW = 'flex h-10 w-full items-center gap-3 rounded-control px-[11px] text-sm font-medium transition-colors'

function WorkspaceBlock() {
  const { user } = useAuth()
  const { brief, slug } = useWorkspace()
  const navigate = useNavigate()
  const memberships = user?.memberships ?? []
  const trigger = (
    <button className={cn(ROW, 'h-12 text-ink hover:bg-sunken')} aria-label={memberships.length > 1 ? `Workspace: ${brief?.name}. Switch workspace` : `Workspace: ${brief?.name}`}>
      <Avatar name={brief?.name} size="md" className="bg-ink text-canvas border-ink" />
      <span className={cn(LABEL, 'flex-1 text-left font-semibold tracking-tight')}>{brief?.name ?? 'Workspace'}</span>
      {memberships.length > 1 && <ChevronsUpDown className={cn('size-4 shrink-0 text-ink-3 opacity-0 group-hover/dock:opacity-100 group-focus-within/dock:opacity-100 group-data-[pinned=true]/dock:opacity-100')} aria-hidden />}
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

function NavRow({ item }: { item: DockItem }) {
  const { pathname } = useLocation()
  const active = isItemActive(item, pathname)
  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      aria-label={item.count ? `${item.label}, ${item.count}` : item.label}
      className={cn(ROW, 'relative', active ? 'bg-ink text-canvas' : 'text-ink-2 hover:bg-sunken hover:text-ink')}
    >
      <span className="relative flex size-[18px] shrink-0 items-center justify-center">
        <item.icon className="size-[18px]" aria-hidden />
        {!!item.count && !active && <span className="absolute -top-1.5 -right-2 size-2 rounded-full bg-violet ring-2 ring-surface group-hover/dock:hidden group-focus-within/dock:hidden group-data-[pinned=true]/dock:hidden" aria-hidden />}
      </span>
      <span className={cn(LABEL, 'flex-1')}>{item.label}</span>
      {!!item.count && (
        <span className={cn('hidden rounded-md px-1.5 text-xs font-semibold tabular-nums group-hover/dock:inline group-focus-within/dock:inline group-data-[pinned=true]/dock:inline', active ? 'bg-canvas/20 text-canvas' : 'bg-violet-soft text-lav-ink')}>{item.count}</span>
      )}
    </Link>
  )
}

/**
 * Left dock: 64px icon rail that expands to a labelled panel on hover / keyboard focus, or stays open when pinned.
 * Expanding overlays the page (it never reflows content) unless pinned.
 */
export function Dock({ items }: { items: DockItem[] }) {
  const [pinned, togglePinned] = usePinned()
  const { resolved, setChoice } = useTheme()
  const dark = resolved === 'dark'
  return (
    <div className={cn('relative hidden shrink-0 transition-[width] duration-200 md:block', pinned ? 'w-[232px]' : 'w-16')}>
      <nav
        aria-label="Primary"
        data-pinned={pinned}
        className="group/dock fixed inset-y-0 left-0 z-40 flex w-16 flex-col overflow-hidden border-r border-line bg-surface px-[9px] py-3 transition-[width,box-shadow] duration-200 hover:w-[232px] hover:shadow-dock focus-within:w-[232px] focus-within:shadow-dock data-[pinned=true]:w-[232px]"
      >
        <WorkspaceBlock />
        <ul className="mt-4 flex flex-1 flex-col gap-1">
          {items.map((it) => (
            <li key={it.to}>
              <NavRow item={it} />
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-1">
          <button type="button" onClick={() => setChoice(dark ? 'light' : 'dark')} className={cn(ROW, 'text-ink-2 hover:bg-sunken hover:text-ink')} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}>
            {dark ? <Sun className="size-[18px] shrink-0" aria-hidden /> : <Moon className="size-[18px] shrink-0" aria-hidden />}
            <span className={LABEL}>{dark ? 'Light theme' : 'Dark theme'}</span>
          </button>
          <NotificationBell variant="dock" labelClassName={LABEL} rowClassName={cn(ROW, 'text-ink-2 hover:bg-sunken hover:text-ink')} />
          <button type="button" onClick={togglePinned} aria-pressed={pinned} className={cn(ROW, 'text-ink-2 hover:bg-sunken hover:text-ink')}>
            {pinned ? <PanelLeftClose className="size-[18px] shrink-0" aria-hidden /> : <PanelLeftOpen className="size-[18px] shrink-0" aria-hidden />}
            <span className={LABEL}>{pinned ? 'Unpin sidebar' : 'Pin sidebar open'}</span>
          </button>
          <UserMenu variant="dock" labelClassName={LABEL} rowClassName={cn(ROW, 'h-12 text-ink hover:bg-sunken')} />
        </div>
      </nav>
    </div>
  )
}
