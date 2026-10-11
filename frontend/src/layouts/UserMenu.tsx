import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
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

export function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  if (!user) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account menu">
          <Avatar className="size-8">
            <AvatarFallback className="bg-accent text-xs font-medium text-accent-foreground">{initials(user.full_name)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">{user.full_name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          {user.author_profile && (
            <p className="mt-1 text-xs text-muted-foreground">
              Author ID {user.author_profile.author_code} · {user.author_profile.city}
            </p>
          )}
          {user.role === 'ADMIN' && <p className="mt-1 text-xs text-muted-foreground">BookLeaf Support Team</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            logout()
            navigate('/login')
          }}
        >
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
