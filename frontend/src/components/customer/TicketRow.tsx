import { ChevronRight, MessageCircleReply, Package, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'

import { StatusBadge } from '@/components/badges'
import { RelativeTime } from '@/components/common'
import { STATUS_META } from '@/lib/constants'
import type { RequesterTicket } from '@/lib/types'
import { cn } from '@/lib/utils'

export function TicketRow({ ticket, slug }: { ticket: RequesterTicket; slug: string }) {
  const meta = STATUS_META[ticket.status]
  const Icon = meta.icon
  return (
    <Link
      to={`/w/${slug}/help/tickets/${ticket.id}`}
      className={cn(
        'group relative flex items-center gap-4 overflow-hidden rounded-2xl border bg-card py-4 pr-4 pl-5 shadow-xs transition-all hover:-translate-y-px hover:shadow-md sm:gap-5 sm:py-5 sm:pr-5 sm:pl-6',
        ticket.has_unread && 'border-primary/40 bg-primary/[0.03]',
      )}
    >
      <span className={cn('absolute inset-y-0 left-0 w-1.5', meta.dot)} />
      <span className={cn('hidden size-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset sm:flex', meta.pill)}>
        <Icon className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <p className={cn('truncate text-base', ticket.has_unread ? 'font-semibold' : 'font-medium')}>{ticket.subject}</p>
          {ticket.has_unread && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
              <MessageCircleReply className="size-3.5" /> New reply
            </span>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
          <span className="font-mono font-medium text-foreground/70">{ticket.reference}</span>
          <span className="flex min-w-0 items-center gap-1.5">
            {ticket.record ? <Package className="size-4 shrink-0" /> : <UserRound className="size-4 shrink-0" />}
            <span className="truncate">{ticket.record ? ticket.record.title : 'General question'}</span>
          </span>
          <span>
            Updated <RelativeTime value={ticket.updated_at} />
          </span>
        </div>
        <div className="mt-2 sm:hidden">
          <StatusBadge status={ticket.status} audience="requester" size="sm" />
        </div>
      </div>
      <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
        <StatusBadge status={ticket.status} audience="requester" size="lg" />
        <span className="text-xs text-muted-foreground">{meta.requesterHint}</span>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}
