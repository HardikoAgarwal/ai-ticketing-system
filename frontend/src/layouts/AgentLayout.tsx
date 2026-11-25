import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  BookOpen,
  Check,
  ChevronsUpDown,
  Inbox,
  type LucideIcon,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  UserRound,
} from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { homeFor, useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { ConnectionIndicator, WorkspaceMark } from '@/components/common'
import { DemoDock } from '@/components/dashboard/DemoDock'
import { NotificationBell } from '@/components/NotificationBell'
import { ListSkeleton } from '@/components/states'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

import { UserMenu } from './UserMenu'

const COLLAPSE_KEY = 'helpdesk.sidebar'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  count?: number
}

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })
  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1')
      } catch {
        /* ignore */
      }
      return !c
    })
  return [collapsed, toggle] as const
}

/** Workspace header: tile + name + role, and a switcher when the account belongs to several workspaces. */
function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth()
  const { brief, slug, role } = useWorkspace()
  const navigate = useNavigate()
  const roleLabel = role === 'REQUESTER' ? 'Customer' : (role ?? '').charAt(0) + (role ?? '').slice(1).toLowerCase()
  const memberships = user?.memberships ?? []
  const body = (
    <button
      className={cn(
        'flex w-full items-center gap-3 rounded-xl p-1.5 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
        collapsed && 'justify-center',
      )}
      aria-label="Switch workspace"
    >
      <WorkspaceMark name={brief?.name} />
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-semibold tracking-tight">{brief?.name ?? 'Workspace'}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{roleLabel} workspace</span>
          </span>
          {memberships.length > 1 && <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />}
        </>
      )}
    </button>
  )
  if (memberships.length <= 1) return <div>{body}</div>
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{body}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Your workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {memberships.map((m) => (
          <DropdownMenuItem key={m.workspace.slug} onClick={() => user && navigate(homeFor(user, m.workspace.slug))}>
            <WorkspaceMark name={m.workspace.name} className="size-6 rounded-md text-[11px]" />
            <span className="flex-1 truncate">{m.workspace.name}</span>
            {m.workspace.slug === slug && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SidebarLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) => {
        const active = isActive && !item.to.includes('?')
        return cn(
          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
          collapsed && 'justify-center px-0',
          active && 'bg-accent font-semibold text-accent-foreground hover:bg-accent hover:text-accent-foreground',
        )
      }}
    >
      <item.icon className="size-[18px] shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {item.count !== undefined && item.count > 0 && (
        collapsed ? (
          <span className="absolute top-1 right-1.5 size-2 rounded-full bg-primary ring-2 ring-card" />
        ) : (
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground tabular-nums group-[.bg-accent]:bg-card">{item.count}</span>
        )
      )}
    </NavLink>
  )
  if (!collapsed) return link
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  )
}

function SidebarBody({ groups, collapsed, onNavigate, reserveDock }: { groups: { label: string; items: NavItem[] }[]; collapsed: boolean; onNavigate?: () => void; reserveDock: boolean }) {
  return (
    <>
      <div className="px-1">
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>
      <nav className="mt-6 flex-1 space-y-6 overflow-y-auto" aria-label="Primary">
        {groups.map((g) => (
          <div key={g.label}>
            {!collapsed && <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-muted-foreground/80 uppercase">{g.label}</p>}
            <div className="space-y-0.5">
              {g.items.map((item) => (
                <SidebarLink key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      {/* bottom: the account card; extra room under it in demos so the floating demo dock never covers it */}
      <div className={cn('pt-3', reserveDock && 'mb-14')}>
        <UserMenu variant="card" collapsed={collapsed} />
      </div>
    </>
  )
}

/** The page title shown in the top bar, derived from the route. */
function useCrumb(base: string) {
  const { pathname } = useLocation()
  if (pathname.startsWith(`${base}/tickets/`)) return 'Ticket'
  if (pathname.startsWith(`${base}/analytics`)) return 'Analytics'
  if (pathname.startsWith(`${base}/knowledge`)) return 'Knowledge base'
  if (pathname.startsWith(`${base}/settings`)) return 'Settings'
  return 'Ticket queue'
}

export function AgentLayout() {
  const { slug, api, brief, manager, isDemo } = useWorkspace()
  const refetchInterval = useFallbackInterval()
  const { data: stats } = useQuery({ queryKey: ['stats', slug], queryFn: api.tickets.stats, refetchInterval })
  const base = `/w/${slug}/agent`
  const crumb = useCrumb(base)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [collapsed, toggleCollapsed] = useCollapsed()
  const [drawer, setDrawer] = useState(false)

  useEffect(() => setDrawer(false), [pathname])

  const groups = [
    {
      label: 'Support',
      items: [
        { to: base, label: 'Ticket queue', icon: Inbox, end: true, count: stats ? stats.open + stats.in_progress : undefined },
        { to: `${base}?view=mine`, label: 'Assigned to me', icon: UserRound, count: stats?.mine },
      ],
    },
    { label: 'Insights', items: [{ to: `${base}/analytics`, label: 'Analytics', icon: BarChart3 }] },
    {
      label: 'Workspace',
      items: [
        { to: `${base}/knowledge`, label: 'Knowledge base', icon: BookOpen },
        { to: `${base}/settings`, label: manager ? 'Settings' : 'Team', icon: Settings },
      ],
    },
  ]

  const openSearch = () => {
    navigate(base)
    // the queue listens for "/" to focus its search box
    setTimeout(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true })), 150)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            'sticky top-0 hidden h-screen shrink-0 flex-col self-start border-r border-border bg-card px-3 py-4 transition-[width] duration-200 md:flex',
            collapsed ? 'w-[76px]' : 'w-[264px]',
          )}
        >
          <SidebarBody groups={groups} collapsed={collapsed} reserveDock={isDemo} />
        </aside>

        <Sheet open={drawer} onOpenChange={setDrawer}>
          <SheetContent side="left" className="w-[280px] gap-0 p-3 sm:max-w-[280px]" showCloseButton={false}>
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarBody groups={groups} collapsed={false} onNavigate={() => setDrawer(false)} reserveDock={isDemo} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/85 px-4 backdrop-blur md:px-6">
            <button className="flex size-9 items-center justify-center rounded-lg border bg-card text-muted-foreground shadow-xs md:hidden" onClick={() => setDrawer(true)} aria-label="Open navigation">
              <Menu className="size-[18px]" />
            </button>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={toggleCollapsed} className="hidden size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                  {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</TooltipContent>
            </Tooltip>
            <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-sm sm:flex">
              <Link to={base} className="max-w-40 truncate text-muted-foreground transition-colors hover:text-foreground">{brief?.name}</Link>
              <span className="text-muted-foreground/50">/</span>
              <span className="font-semibold">{crumb}</span>
            </nav>
            <span className="truncate text-sm font-semibold sm:hidden">{crumb}</span>

            <button
              onClick={openSearch}
              className="mx-auto hidden h-10 w-full max-w-md items-center gap-2.5 rounded-xl border bg-background px-3.5 text-sm text-muted-foreground shadow-xs transition-colors hover:border-ring/50 hover:text-foreground lg:flex"
            >
              <Search className="size-4" />
              <span className="flex-1 text-left">Search tickets…</span>
              <kbd className="rounded-md border bg-card px-1.5 font-mono text-xs">/</kbd>
            </button>

            <div className="ml-auto flex items-center gap-2.5 sm:gap-3 lg:ml-0">
              <ConnectionIndicator />
              <NotificationBell />
              <div className="md:hidden">
                <UserMenu />
              </div>
            </div>
          </header>
          <main className={cn('mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-8 md:py-8', isDemo && 'pb-24')}>
            <Suspense fallback={<ListSkeleton rows={6} />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
      <DemoDock />
    </div>
  )
}
