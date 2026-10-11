import { useQuery } from '@tanstack/react-query'
import { LifeBuoy } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'

import { Logo } from '@/components/common'
import { NotificationBell } from '@/components/NotificationBell'
import { Button } from '@/components/ui/button'
import { booksApi } from '@/lib/endpoints'
import { cn } from '@/lib/utils'

import { UserMenu } from './UserMenu'

const NAV = [
  { to: '/author', label: 'Dashboard', end: true },
  { to: '/author/books', label: 'My Books' },
  { to: '/author/tickets', label: 'My Tickets' },
]

export function AuthorLayout() {
  const { data: summary } = useQuery({ queryKey: ['summary'], queryFn: booksApi.summary })

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link to="/author" aria-label="BookLeaf home">
            <Logo subtitle="Author Portal" />
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'relative rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground',
                    isActive && 'bg-accent font-medium text-accent-foreground',
                  )
                }
              >
                {item.label}
                {item.to === '/author/tickets' && !!summary?.unread_tickets && (
                  <span className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {summary.unread_tickets}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />
            <Button asChild size="sm">
              <Link to="/author/tickets/new">
                <LifeBuoy /> Get help
              </Link>
            </Button>
            <UserMenu />
          </div>
        </div>
        <nav className="flex gap-1 border-t px-4 py-1.5 sm:hidden">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn('rounded-md px-3 py-1 text-sm text-muted-foreground', isActive && 'bg-accent font-medium text-accent-foreground')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
