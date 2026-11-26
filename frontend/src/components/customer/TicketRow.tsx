import { ChevronRight, Package, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'

import { RelativeTime } from '@/components/common'
import { Chip } from '@/components/ds'
import { NewReplyChip, RequesterStatusChip } from '@/features/portal/status'
import { REQUESTER_STATUS } from '@/features/portal/status-meta'
import type { RequesterTicket } from '@/lib/types'
import { cn } from '@/lib/utils'

/** One request in the customer's list. Whole row is the link; state is always icon + text. */
export function TicketRow({ ticket, slug }: { ticket: RequesterTicket; slug: string }) {
  const awaitingConfirm = ticket.status === 'RESOLVED'
  const hint = ticket.has_unread ? 'Our team replied' : REQUESTER_STATUS[ticket.status].hint
  return (
    <li>
      <Link
        to={`/w/${slug}/help/tickets/${ticket.id}`}
        className={cn(
          'group flex flex-col gap-3 px-4 py-4 outline-none transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-inset sm:flex-row sm:items-center sm:gap-5 sm:px-5',
          ticket.has_unread && 'bg-lav/40',
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-3">
            <span className="font-mono font-semibold text-ink-2">{ticket.reference}</span>
            <span aria-hidden>·</span>
            <span>
              Updated <RelativeTime value={ticket.updated_at} />
            </span>
          </div>
          <h3 className={cn('mt-1 text-[15px] leading-snug text-balance text-ink sm:text-base', ticket.has_unread ? 'font-semibold' : 'font-medium')}>{ticket.subject}</h3>
          <p className="mt-1 line-clamp-1 text-sm text-ink-3">{ticket.description}</p>
          <p className="mt-2 flex min-w-0 items-center gap-1.5 text-xs text-ink-3">
            {ticket.record ? <Package className="size-3.5 shrink-0" aria-hidden /> : <UserRound className="size-3.5 shrink-0" aria-hidden />}
            <span className="truncate">{ticket.record ? ticket.record.title : 'General question'}</span>
            <span aria-hidden>·</span>
            <span className="truncate">{hint}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {ticket.has_unread && <NewReplyChip />}
          {awaitingConfirm && !ticket.has_unread && (
            <Chip tone="amber" size="md">
              Please confirm
            </Chip>
          )}
          <RequesterStatusChip status={ticket.status} />
          <ChevronRight className="ml-auto hidden size-4 text-ink-3 transition-transform group-hover:translate-x-0.5 sm:block" aria-hidden />
        </div>
      </Link>
    </li>
  )
}
