import { AlertTriangle, CircleCheck, CircleDot, Clock, Flame, Loader2, MessageSquare, Sparkles, Timer, UserRound, type LucideIcon } from 'lucide-react'
import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

import { RelativeTime } from '@/components/common'
import { Chip, type ChipTone } from '@/components/dashboard/Chip'
import { ticketStates } from '@/components/dashboard/badges'
import { Skeleton } from '@/components/ui/skeleton'
import { SENTIMENT_META } from '@/lib/constants'
import type { StaffTicket, TicketStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const STATUS_CHIP: Record<TicketStatus, { tone: ChipTone; icon: LucideIcon; label: string }> = {
  OPEN: { tone: 'blue', icon: CircleDot, label: 'Open' },
  IN_PROGRESS: { tone: 'violet', icon: Loader2, label: 'In progress' },
  RESOLVED: { tone: 'green', icon: CircleCheck, label: 'Resolved' },
  CLOSED: { tone: 'slate', icon: CircleCheck, label: 'Closed' },
}

/** The single most important thing about this ticket right now, or null when nothing needs attention. */
function attention(ticket: StaffTicket): { tone: ChipTone; icon: LucideIcon; label: string } | null {
  if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') return null
  const states = ticketStates(ticket)
  const find = (kind: string) => states.find((s) => s.kind === kind)
  const overdue = find('overdue')
  if (overdue) return { tone: 'red', icon: Timer, label: overdue.label }
  const msg = find('message')
  if (msg) return { tone: 'blue', icon: MessageSquare, label: msg.label }
  const risk = find('atrisk')
  if (risk) return { tone: 'amber', icon: Clock, label: risk.label }
  const fresh = find('ticket')
  if (fresh) return { tone: 'blue', icon: CircleDot, label: fresh.label }
  const failed = find('aifailed')
  if (failed) return { tone: 'amber', icon: AlertTriangle, label: failed.label }
  if (ticket.ai_status === 'PENDING' && ticket.category_source !== 'STAFF') return { tone: 'violet', icon: Loader2, label: 'AI triaging' }
  if (ticket.ai_draft_status === 'COMPLETED') return { tone: 'violet', icon: Sparkles, label: 'AI draft ready' }
  return null
}

function Meta({ icon: Icon, children, className }: { icon?: LucideIcon; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap', className)}>
      {Icon && <Icon className="size-3.5 shrink-0" />}
      {children}
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
  const status = STATUS_CHIP[ticket.status]
  const urgent = ticket.priority === 'CRITICAL' || ticket.priority === 'HIGH'
  const attn = attention(ticket)
  const mood = ticket.sentiment && ticket.sentiment !== 'NEUTRAL' ? SENTIMENT_META[ticket.sentiment] : null

  return (
    <Link
      ref={ref}
      to={to}
      aria-label={`${ticket.reference}: ${ticket.subject}`}
      className={cn(
        'group block rounded-lg border border-border bg-card px-4 py-3.5 shadow-xs transition-colors outline-none sm:px-5',
        'hover:border-foreground/25 hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50',
        closed && 'opacity-80',
        selected && 'ring-2 ring-primary/60 ring-offset-2 ring-offset-background',
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1">
          <h3 className={cn('line-clamp-1 text-base tracking-tight', unread ? 'font-bold' : 'font-semibold')}>{ticket.subject}</h3>
          <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{ticket.ai_summary || ticket.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:max-w-[55%] sm:shrink-0 sm:justify-end">
          {attn && (
            <Chip tone={attn.tone} icon={attn.icon} className={attn.icon === Loader2 ? '[&>svg]:animate-spin' : undefined}>
              {attn.label}
            </Chip>
          )}
          {urgent && (
            <Chip tone={ticket.priority === 'CRITICAL' ? 'red' : 'amber'} icon={ticket.priority === 'CRITICAL' ? Flame : AlertTriangle}>
              {ticket.priority === 'CRITICAL' ? 'Critical' : 'High'}
            </Chip>
          )}
          <Chip tone={status.tone} icon={status.icon}>{status.label}</Chip>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
        <span className="font-mono text-xs font-medium">{ticket.reference}</span>
        {ticket.category && <Meta>{ticket.category.name}</Meta>}
        <Meta icon={UserRound} className="min-w-0 text-foreground/80">
          <span className="truncate font-medium">{ticket.requester.name}</span>
        </Meta>
        {!urgent && <Meta>{ticket.priority_label} priority</Meta>}
        {mood && <Meta icon={mood.icon}>{mood.label}</Meta>}
        <span className="ml-auto flex items-center gap-4">
          <Meta className={cn(mine && 'font-medium text-primary')}>
            {ticket.assigned_to ? (mine ? 'Assigned to you' : ticket.assigned_to.full_name) : 'Unassigned'}
          </Meta>
          <Meta icon={Clock}>
            <RelativeTime value={ticket.created_at} />
          </Meta>
        </span>
      </div>
    </Link>
  )
})

export function TicketCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4 shadow-xs">
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-24 rounded-lg" />
          <Skeleton className="h-7 w-20 rounded-lg" />
        </div>
      </div>
      <Skeleton className="mt-3 h-4 w-72" />
    </div>
  )
}
