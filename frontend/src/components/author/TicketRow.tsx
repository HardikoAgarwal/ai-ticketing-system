import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { StatusBadge } from '@/components/badges'
import { RelativeTime } from '@/components/common'
import type { AuthorTicket } from '@/lib/types'
import { cn } from '@/lib/utils'

export function TicketRow({ ticket }: { ticket: AuthorTicket }) {
  return (
    <Link
      to={`/author/tickets/${ticket.id}`}
      className={cn(
        'group flex items-center gap-4 rounded-xl border bg-card px-4 py-3 transition-colors hover:border-primary/40 hover:bg-accent/30',
        ticket.has_unread && 'border-primary/40',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {ticket.has_unread && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="New reply" />}
          <p className={cn('truncate text-sm', ticket.has_unread ? 'font-semibold' : 'font-medium')}>{ticket.subject}</p>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {ticket.reference} · {ticket.book ? ticket.book.title : 'General / Account'} · updated <RelativeTime value={ticket.updated_at} />
        </p>
      </div>
      {ticket.has_unread && (
        <span className="hidden rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary sm:inline">New reply</span>
      )}
      <StatusBadge status={ticket.status} audience="author" />
      <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}
