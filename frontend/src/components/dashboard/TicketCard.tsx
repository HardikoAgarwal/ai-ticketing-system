import { CheckCheck, Inbox, Loader2, MessageCircleReply, Sparkles, TriangleAlert, UserCheck, UserX } from 'lucide-react'
import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

import { CategoryBadge, PriorityBadge, SentimentBadge, SlaBadge, StatusBadge } from '@/components/badges'
import { RelativeTime } from '@/components/common'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { initials } from '@/lib/format'
import type { StaffTicket } from '@/lib/types'
import { cn } from '@/lib/utils'

type Theme = { edge: string; surface: string; label: string }

/** State -> card theme. Order matters: closed work is muted, urgency beats unread, unread beats "due soon". */
export function ticketTheme(t: StaffTicket): Theme {
  if (t.status === 'RESOLVED' || t.status === 'CLOSED') {
    return { edge: 'bg-emerald-300', surface: 'bg-emerald-50/40 hover:bg-emerald-50/70', label: 'Resolved' }
  }
  if (t.sla_state === 'overdue' || t.priority === 'CRITICAL') {
    return { edge: 'bg-red-500', surface: 'bg-red-50/50 hover:bg-red-50/80', label: 'Urgent' }
  }
  if (t.unread_kind === 'requester_reply') {
    return { edge: 'bg-blue-500', surface: 'bg-blue-50/60 hover:bg-blue-50/90', label: 'New message' }
  }
  if (t.unread_kind === 'new_ticket') {
    return { edge: 'bg-indigo-500', surface: 'bg-indigo-50/50 hover:bg-indigo-50/80', label: 'New ticket' }
  }
  if (t.sla_state === 'at_risk') {
    return { edge: 'bg-amber-400', surface: 'bg-amber-50/50 hover:bg-amber-50/80', label: 'Due soon' }
  }
  return { edge: 'bg-slate-300', surface: 'bg-card hover:bg-muted/40', label: '' }
}

function UnreadBadge({ kind }: { kind: StaffTicket['unread_kind'] }) {
  if (kind === 'requester_reply') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-xs">
        <MessageCircleReply className="size-3" /> New message from customer
      </span>
    )
  }
  if (kind === 'new_ticket') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-xs">
        <Inbox className="size-3" /> New ticket
      </span>
    )
  }
  return null
}

function AiState({ ticket }: { ticket: StaffTicket }) {
  const triaging = ticket.ai_status === 'PENDING' && ticket.category_source !== 'STAFF'
  if (triaging) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-600/20 ring-inset">
        <Loader2 className="size-3 animate-spin" /> AI triaging
      </span>
    )
  }
  if (ticket.ai_status === 'FAILED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-600/20 ring-inset">
        <TriangleAlert className="size-3" /> Needs triage
      </span>
    )
  }
  if (ticket.ai_status === 'COMPLETED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50/70 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-600/15 ring-inset">
        <Sparkles className="size-3" /> AI triaged{ticket.ai_confidence !== null ? ` · ${Math.round(ticket.ai_confidence * 100)}%` : ''}
      </span>
    )
  }
  return null
}

export const TicketCard = forwardRef<HTMLAnchorElement, { ticket: StaffTicket; to: string; selected?: boolean; meId?: number }>(function TicketCard(
  { ticket, to, selected, meId },
  ref,
) {
  const theme = ticketTheme(ticket)
  const mine = !!meId && ticket.assigned_to?.id === meId
  const closed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
  const unread = ticket.has_unread
  const triaging = ticket.ai_status === 'PENDING' && ticket.category_source !== 'STAFF'
  return (
    <Link
      ref={ref}
      to={to}
      aria-label={`${ticket.reference}: ${ticket.subject}`}
      className={cn(
        'group relative block overflow-hidden rounded-2xl border pr-4 pl-5 transition-all duration-150 outline-none sm:pr-6 sm:pl-7',
        'hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50',
        theme.surface,
        selected && 'ring-2 ring-primary/50',
        closed && 'opacity-90',
      )}
    >
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1.5', theme.edge)} />

      <div className="py-4 sm:py-5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <span className="font-mono text-xs font-semibold text-muted-foreground">{ticket.reference}</span>
          <UnreadBadge kind={ticket.unread_kind} />
          {closed && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
              <CheckCheck className="size-3.5" /> {ticket.status === 'CLOSED' ? 'Closed' : 'Resolved, awaiting confirmation'}
            </span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            <RelativeTime value={ticket.created_at} />
          </span>
        </div>

        <h3 className={cn('mt-2 line-clamp-1 text-base tracking-tight sm:text-[1.05rem]', unread ? 'font-bold' : 'font-semibold')}>{ticket.subject}</h3>
        <p className="mt-1 line-clamp-2 max-w-4xl text-sm leading-relaxed text-muted-foreground">{ticket.description}</p>

        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={ticket.status} size="sm" />
          <PriorityBadge priority={ticket.priority} source={ticket.priority_source} size="sm" />
          {triaging ? null : <CategoryBadge category={ticket.category} source={ticket.category_source} size="sm" />}
          <SentimentBadge sentiment={ticket.sentiment} />
          <SlaBadge state={ticket.sla_state} dueAt={ticket.sla_due_at} size="sm" />
          <AiState ticket={ticket} />
        </div>

        <div className="mt-4 flex items-center gap-3 border-t border-black/[0.06] pt-3.5 text-sm">
          <Avatar className="size-7">
            <AvatarFallback className="bg-muted text-[10px] font-semibold">{initials(ticket.requester.name)}</AvatarFallback>
          </Avatar>
          <p className="min-w-0 truncate">
            <span className="font-medium">{ticket.requester.name}</span>
            {ticket.record && <span className="text-muted-foreground"> · {ticket.record.title}</span>}
          </p>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {ticket.assigned_to ? (
              <>
                {mine && (
                  <span className="hidden items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary sm:inline-flex">
                    <UserCheck className="size-3" /> You
                  </span>
                )}
                <span className="hidden text-xs text-muted-foreground sm:inline">{mine ? '' : ticket.assigned_to.full_name.split(' ')[0]}</span>
                <Avatar className="size-7">
                  <AvatarFallback className={cn('text-[10px] font-semibold', mine ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground')}>
                    {initials(ticket.assigned_to.full_name)}
                  </AvatarFallback>
                </Avatar>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed px-2.5 py-1 text-xs text-muted-foreground">
                <UserX className="size-3.5" /> Unassigned
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
})

export function TicketCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card p-5 pl-7">
      <span className="absolute inset-y-0 left-0 w-1.5 bg-muted" />
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-5 w-2/3" />
      <Skeleton className="mt-2.5 h-3.5 w-full" />
      <Skeleton className="mt-1.5 h-3.5 w-3/4" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="mt-5 h-7 w-48" />
    </div>
  )
}
