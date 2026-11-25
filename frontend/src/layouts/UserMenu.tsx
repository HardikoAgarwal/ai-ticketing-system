import { ChevronsUpDown, LogOut, Monitor, Moon, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useTheme, type ThemeChoice } from '@/theme/ThemeProvider'

const THEMES: { key: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { key: 'light', label: 'Light', Icon: Sun },
  { key: 'dark', label: 'Dark', Icon: Moon },
  { key: 'system', label: 'System', Icon: Monitor },
]

function ThemeSwitch() {
  const { choice, setChoice } = useTheme()
  return (
    <div className="px-2 py-1.5">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">Appearance</p>
      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {THEMES.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={choice === key}
            onClick={(e) => {
              e.preventDefault()
              setChoice(key)
            }}
            className={cn(
              'flex h-8 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring',
              choice === key ? 'bg-card text-foreground shadow-xs ring-1 ring-border' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" /> {label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Account menu with theme switch. `card` renders the wide sidebar variant, `avatar` the compact top-bar one. */
export function UserMenu({ variant = 'avatar', collapsed = false }: { variant?: 'avatar' | 'card'; collapsed?: boolean }) {
  const { user, logout } = useAuth()
  const { brief, role } = useWorkspace()
  const navigate = useNavigate()
  if (!user) return null
  const roleLabel = role === 'REQUESTER' ? 'Customer' : (role ?? '').charAt(0) + (role ?? '').slice(1).toLowerCase()
  const avatar = (
    <Avatar className="size-8">
      <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">{initials(user.full_name)}</AvatarFallback>
    </Avatar>
  )
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'card' ? (
          <button
            aria-label="Account menu"
            className={cn(
              'flex w-full items-center gap-2.5 rounded-xl border border-border bg-background/60 p-2 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
              collapsed && 'justify-center border-transparent bg-transparent p-1',
            )}
          >
            {avatar}
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-[13px] font-semibold">{user.full_name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{roleLabel}</span>
                </span>
                <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
              </>
            )}
          </button>
        ) : (
          <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account menu">
            {avatar}
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={variant === 'card' ? 'start' : 'end'} side={variant === 'card' ? 'top' : 'bottom'} className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-semibold">{user.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.is_demo ? 'Demo account' : user.email}</p>
          {brief && (
            <p className="mt-1 text-xs text-muted-foreground">
              {roleLabel} · {brief.name}
            </p>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ThemeSwitch />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            logout()
            navigate('/')
          }}
        >
          <LogOut className="size-4" /> {user.is_demo ? 'Leave demo' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
