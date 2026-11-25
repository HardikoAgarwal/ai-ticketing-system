import { ArrowRight, MessageCircleReply, Package, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'

import { StatusBadge } from '@/components/badges'
import { RelativeTime } from '@/components/common'
import { StateBadge } from '@/components/dashboard/badges'
import { STATUS_META } from '@/lib/constants'
import type { RequesterTicket } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Customer-facing ticket card: same card language as the agent queue (header row, title, badges, footer), friendlier copy. */
export function TicketRow({ ticket, slug }: { ticket: RequesterTicket; slug: string }) {
  const meta = STATUS_META[ticket.status]
  const closed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
  return (
    <Link
      to={`/w/${slug}/help/tickets/${ticket.id}`}
      className={cn(
        'group block rounded-2xl border border-border bg-card p-5 shadow-card transition-all outline-none hover:-translate-y-0.5 hover:border-ring/40 hover:shadow-pop focus-visible:ring-3 focus-visible:ring-ring/40 sm:p-6',
        ticket.has_unread && 'border-primary/30 bg-accent/40',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
          <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs font-semibold text-foreground/80">{ticket.reference}</span>
          <span>
            Updated <RelativeTime value={ticket.updated_at} />
          </span>
        </div>
        {ticket.has_unread ? (
          <StateBadge kind="message" label="New reply" pulse />
        ) : ticket.status === 'RESOLVED' ? (
          <StateBadge kind="resolved" label="Please confirm" />
        ) : null}
      </div>

      <h3 className={cn('mt-3 text-[17px] leading-snug tracking-tight text-balance sm:text-lg', ticket.has_unread ? 'font-semibold' : 'font-medium')}>{ticket.subject}</h3>
      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{ticket.description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-border pt-4">
        <StatusBadge status={ticket.status} audience="requester" size="card" />
        <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
          {ticket.record ? <Package className="size-4 shrink-0" /> : <UserRound className="size-4 shrink-0" />}
          <span className="truncate">{ticket.record ? ticket.record.title : 'General question'}</span>
        </span>
        <span className="ml-auto hidden text-[13px] text-muted-foreground md:inline">{closed ? meta.requesterHint : ticket.first_response_at ? 'Our team has replied' : meta.requesterHint}</span>
        <span className="flex items-center gap-1 text-sm font-medium text-primary">
          Open <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
      {ticket.has_unread && <MessageCircleReply className="sr-only" />}
    </Link>
  )
}
