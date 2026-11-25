import { CircleCheck, Clock, Loader2, Sparkles, UserCheck, UserX } from 'lucide-react'
import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

import { CategoryBadge, Pill, PriorityBadge, SentimentBadge, slaLabel, StatusBadge } from '@/components/badges'
import { RelativeTime } from '@/components/common'
import { StateBadge, ticketStates } from '@/components/dashboard/badges'
import { surface } from '@/components/dashboard/surface'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { initials } from '@/lib/format'
import type { StaffTicket } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Footer line for the SLA: plain text, because urgent SLA states are already shouted by the state badges up top. */
function SlaText({ ticket }: { ticket: StaffTicket }) {
  const { sla_state: s } = ticket
  // overdue / at-risk are already shouted by the state badges in the header, so don't repeat them here
  if (s === 'none' || s === 'overdue' || s === 'at_risk') return null
  const label = slaLabel(s, ticket.sla_due_at)
  const tone = s === 'breached' ? 'text-orange-700' : s === 'met' ? 'text-emerald-700' : 'text-muted-foreground'
  const Icon = s === 'met' ? CircleCheck : Clock
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap', tone)}>
      <Icon className="size-4" /> {label}
    </span>
  )
}

export const TicketCard = forwardRef<HTMLAnchorElement, { ticket: StaffTicket; to: string; selected?: boolean; meId?: number }>(function TicketCard(
  { ticket, to, selected, meId },
  ref,
) {
  const mine = !!meId && ticket.assigned_to?.id === meId
  const closed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
  const unread = ticket.has_unread
  const triaging = ticket.ai_status === 'PENDING' && ticket.category_source !== 'STAFF'
  const states = ticketStates(ticket)
  const hasCritical = states.some((s) => s.kind === 'critical')

  return (
    <Link
      ref={ref}
      to={to}
      aria-label={`${ticket.reference}: ${ticket.subject}`}
      className={cn(
        surface,
        'group block px-5 py-5 transition-all duration-150 outline-none sm:px-6',
        'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50',
        unread && 'border-blue-200 bg-blue-50/60 hover:border-blue-300',
        closed && 'bg-card/80',
        selected && 'ring-2 ring-primary/60 ring-offset-2 ring-offset-slate-50',
      )}
    >
      {/* header: reference + age on the left, the state that needs attention on the right */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-600">{ticket.reference}</span>
        <RelativeTime value={ticket.created_at} className="text-[13px] text-muted-foreground" />
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {states.map((s) => (
            <StateBadge key={s.kind} kind={s.kind} label={s.label} pulse={s.pulse} />
          ))}
        </div>
      </div>

      <h3 className={cn('mt-3.5 line-clamp-1 text-lg tracking-tight sm:text-[1.1rem]', unread ? 'font-bold' : 'font-semibold')}>{ticket.subject}</h3>
      <p className="mt-1.5 line-clamp-2 max-w-4xl text-[15px] leading-relaxed text-muted-foreground">{ticket.description}</p>

      {/* meta: calm info badges */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={ticket.status} size="card" />
        {!hasCritical && <PriorityBadge priority={ticket.priority} source={ticket.priority_source} size="card" />}
        {!triaging && <CategoryBadge category={ticket.category} source={ticket.category_source} size="card" />}
        <SentimentBadge sentiment={ticket.sentiment} size="card" />
        {triaging && (
          <Pill tone={{ label: 'AI triaging', icon: Loader2, pill: 'bg-violet-50 text-violet-700 ring-violet-600/20', tint: '', iconClass: '', dot: '' }} size="card" />
        )}
        {ticket.ai_status === 'COMPLETED' && (
          <Pill
            tone={{ label: `AI triaged${ticket.ai_confidence !== null ? ` · ${Math.round(ticket.ai_confidence * 100)}%` : ''}`, icon: Sparkles, pill: 'bg-violet-50 text-violet-700 ring-violet-600/20', tint: '', iconClass: '', dot: '' }}
            size="card"
          />
        )}
      </div>

      {/* footer: who it's from, who owns it, how long they have */}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2.5 border-t border-slate-200/80 pt-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-700">{initials(ticket.requester.name)}</AvatarFallback>
          </Avatar>
          <p className="min-w-0 truncate text-sm leading-tight">
            <span className="font-semibold">{ticket.requester.name}</span>
            {ticket.record && (
              <span className="block truncate text-[13px] text-muted-foreground sm:inline">
                <span className="hidden sm:inline"> · </span>
                {ticket.record.title}
              </span>
            )}
          </p>
        </div>
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-x-4 gap-y-2">
          <SlaText ticket={ticket} />
          {ticket.assigned_to ? (
            <span className="inline-flex items-center gap-2">
              {mine && (
                <span className="hidden items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary sm:inline-flex">
                  <UserCheck className="size-3.5" /> Yours
                </span>
              )}
              {!mine && <span className="hidden text-[13px] text-muted-foreground sm:inline">{ticket.assigned_to.full_name.split(' ')[0]}</span>}
              <Avatar className="size-8">
                <AvatarFallback className={cn('text-[11px] font-semibold', mine ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground')}>{initials(ticket.assigned_to.full_name)}</AvatarFallback>
              </Avatar>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-3 py-1 text-[13px] text-muted-foreground">
              <UserX className="size-4" /> Unassigned
            </span>
          )}
        </div>
      </div>
    </Link>
  )
})

export function TicketCardSkeleton() {
  return (
    <div className={cn(surface, 'p-6')}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="ml-auto h-7 w-28 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-5 w-2/3" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-3/4" />
      <div className="mt-5 flex gap-2">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <Skeleton className="mt-6 h-9 w-52" />
    </div>
  )
}
