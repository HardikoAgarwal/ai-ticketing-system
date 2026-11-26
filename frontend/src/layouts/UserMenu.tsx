import { Keyboard, LogOut, Monitor, Moon, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { Avatar } from '@/components/ds/Avatar'
import { SegmentedControl } from '@/components/ds/SegmentedControl'
import { openShortcutsHelp } from '@/components/shell/shortcuts'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useTheme, type ThemeChoice } from '@/theme/ThemeProvider'

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'Auto', icon: Monitor },
] as const

function ThemeSwitch() {
  const { choice, setChoice } = useTheme()
  return (
    <div className="px-2 py-1.5">
      <p className="mb-1.5 text-xs font-medium text-ink-3">Appearance</p>
      <SegmentedControl<ThemeChoice> ariaLabel="Theme" size="sm" fullWidth value={choice} onChange={setChoice} options={THEMES.map((t) => ({ ...t }))} />
    </div>
  )
}

/**
 * Account menu: identity, theme, shortcuts, sign out.
 * `avatar` = compact (top bar / customer header); `dock` = a full-width row for the agent dock (label text is hidden until the dock expands).
 */
export function UserMenu({ variant = 'avatar', rowClassName, labelClassName }: { variant?: 'avatar' | 'dock'; rowClassName?: string; labelClassName?: string }) {
  const { user, logout } = useAuth()
  const { brief, role } = useWorkspace()
  const navigate = useNavigate()
  if (!user) return null
  const roleLabel = role === 'REQUESTER' ? 'Customer' : (role ?? '').charAt(0) + (role ?? '').slice(1).toLowerCase()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'dock' ? (
          <button type="button" aria-label={`Account menu, ${user.full_name}`} className={cn('text-left', rowClassName)}>
            <Avatar name={user.full_name} size="md" />
            <span className={cn('flex-1 leading-tight', labelClassName)}>
              <span className="block truncate text-[13px] font-semibold">{user.full_name}</span>
              <span className="block truncate text-[11px] font-normal text-ink-3">{roleLabel}</span>
            </span>
          </button>
        ) : (
          <button type="button" className="rounded-control" aria-label={`Account menu, ${user.full_name}`}>
            <Avatar name={user.full_name} size="md" />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={variant === 'dock' ? 'end' : 'end'} side={variant === 'dock' ? 'right' : 'bottom'} className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-semibold text-ink">{user.full_name}</p>
          <p className="truncate text-xs text-ink-3">{user.is_demo ? 'Demo account' : user.email}</p>
          {brief && (
            <p className="mt-1 text-xs text-ink-3">
              {roleLabel} · {brief.name}
            </p>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ThemeSwitch />
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={openShortcutsHelp}>
          <Keyboard className="size-4" /> Keyboard shortcuts
        </DropdownMenuItem>
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
