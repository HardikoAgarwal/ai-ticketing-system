import { ChevronsUpDown, LogOut, Moon, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { Avatar } from '@/components/ds/Avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useTheme } from '@/theme/ThemeProvider'

/** Light / dark as a real switch: a track with a sun on one side and a moon on the other, and a knob that slides to the one in use. */
function ThemeToggle() {
  const { resolved, setChoice } = useTheme()
  const dark = resolved === 'dark'
  return (
    <div className="flex items-center gap-3 rounded-control px-3 py-2.5">
      {dark ? <Moon className="size-[18px] text-ink-2" aria-hidden /> : <Sun className="size-[18px] text-ink-2" aria-hidden />}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">Dark mode</p>
        <p className="text-xs text-ink-3">{dark ? 'On' : 'Off'}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={dark}
        aria-label="Dark mode"
        onClick={(e) => {
          e.stopPropagation()
          setChoice(dark ? 'light' : 'dark')
        }}
        className="relative inline-flex h-8 w-[3.75rem] shrink-0 items-center rounded-full border border-line-strong bg-sunken transition-colors focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none"
      >
        <Sun className="absolute left-2 size-3.5 text-ink-3" aria-hidden />
        <Moon className="absolute right-2 size-3.5 text-ink-3" aria-hidden />
        <span className={cn('absolute left-0.5 flex size-6 items-center justify-center rounded-full bg-ink text-canvas shadow-md transition-transform duration-200 ease-out motion-reduce:transition-none', dark ? 'translate-x-[28px]' : 'translate-x-0')} aria-hidden>
          {dark ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
        </span>
      </button>
    </div>
  )
}

/**
 * Account menu: who you are, light/dark, sign out.
 * `avatar` = compact (top bar / customer header); `dock` = a full-width profile button for the agent sidebar (its text and arrow appear once the sidebar is open).
 */
export function UserMenu({ variant = 'avatar', rowClassName, labelClassName, trailingClassName, status }: { variant?: 'avatar' | 'dock'; rowClassName?: string; labelClassName?: string; trailingClassName?: string; /** Live-update state, shown as a dot on the avatar and a line in the menu. */ status?: { label: string; dot: string } }) {
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
            <span className="relative shrink-0">
              <Avatar name={user.full_name} size="md" className="size-9 rounded-[10px] text-[13px]" />
              {status && <span className={cn('absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-surface-2', status.dot)} aria-hidden />}
            </span>
            <span className={cn('flex-1 leading-tight', labelClassName)}>
              <span className="block truncate text-sm font-semibold">{user.full_name}</span>
              <span className="block truncate text-xs font-normal text-ink-3">{roleLabel}</span>
            </span>
            <ChevronsUpDown className={cn('size-4 shrink-0 text-ink-3', trailingClassName)} aria-hidden />
          </button>
        ) : (
          <button type="button" className="rounded-control" aria-label={`Account menu, ${user.full_name}`}>
            <Avatar name={user.full_name} size="md" />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={variant === 'dock' ? 'end' : 'end'} side={variant === 'dock' ? 'right' : 'bottom'} sideOffset={12} className="w-80 p-2">
        <div className="flex items-center gap-3 px-3 py-3">
          <Avatar name={user.full_name} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-ink">{user.full_name}</p>
            <p className="truncate text-[13px] text-ink-2">{user.is_demo ? 'Demo account' : user.email}</p>
            {brief && (
              <p className="mt-0.5 truncate text-xs text-ink-3">
                {roleLabel} · {brief.name}
              </p>
            )}
          </div>
        </div>
        <DropdownMenuSeparator className="my-1.5" />
        <ThemeToggle />
        {status && (
          <div role="status" className="flex items-center gap-3 px-3 py-2.5 text-sm text-ink-2">
            <span className="flex size-[18px] items-center justify-center">
              <span className={cn('size-2.5 rounded-full', status.dot)} aria-hidden />
            </span>
            {status.label}
          </div>
        )}
        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuItem
          className="gap-3 px-3 py-2.5 text-sm"
          onClick={() => {
            logout()
            navigate('/')
          }}
        >
          <LogOut className="size-[18px]" /> {user.is_demo ? 'Leave demo' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
