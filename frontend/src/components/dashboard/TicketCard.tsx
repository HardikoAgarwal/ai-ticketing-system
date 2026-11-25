import { AlertTriangle, ChevronRight, CircleCheck, CircleDot, Clock, Flame, Loader2, MessageSquare, Minus, ArrowDown, ArrowUp, Sparkles, Timer, UserRound, type LucideIcon } from 'lucide-react'
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


const AVATAR_HUES = [
  'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
]

/** Soft tinted square with the customer's initials; the hue is derived from the name so it stays stable. */
function CustomerTile({ name }: { name: string }) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?'
  return (
    <span aria-hidden className={cn('flex size-11 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ring-1 ring-inset ring-black/5', AVATAR_HUES[h % AVATAR_HUES.length])}>
      {initials}
    </span>
  )
}

const PRIORITY_LOOK: Record<string, { icon: LucideIcon; cls: string }> = {
  CRITICAL: { icon: Flame, cls: 'text-red-600 dark:text-red-400' },
  HIGH: { icon: ArrowUp, cls: 'text-orange-600 dark:text-orange-400' },
  MEDIUM: { icon: Minus, cls: 'text-amber-600 dark:text-amber-400' },
  LOW: { icon: ArrowDown, cls: 'text-muted-foreground' },
}

export type TicketBucket = 'overdue' | 'reply' | 'progress' | 'open' | 'done'
export const BUCKETS: { key: TicketBucket; label: string; dot: string }[] = [
  { key: 'overdue', label: 'Overdue', dot: 'bg-red-500' },
  { key: 'reply', label: 'Needs reply', dot: 'bg-sky-500' },
  { key: 'progress', label: 'In progress', dot: 'bg-violet-500' },
  { key: 'open', label: 'Open', dot: 'bg-zinc-400' },
  { key: 'done', label: 'Resolved', dot: 'bg-emerald-500' },
]

/** Which urgency group a ticket belongs to in the grouped queue. */
export function ticketBucket(ticket: StaffTicket): TicketBucket {
  if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') return 'done'
  const states = ticketStates(ticket)
  if (states.some((s) => s.kind === 'overdue')) return 'overdue'
  if (ticket.has_unread || states.some((s) => s.kind === 'message')) return 'reply'
  if (ticket.status === 'IN_PROGRESS') return 'progress'
  return 'open'
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
  const attn = attention(ticket)
  const mood = ticket.sentiment && ticket.sentiment !== 'NEUTRAL' ? SENTIMENT_META[ticket.sentiment] : null

  const prio = PRIORITY_LOOK[ticket.priority] ?? PRIORITY_LOOK.LOW!
  const PrioIcon = prio.icon

  return (
    <Link
      ref={ref}
      to={to}
      aria-label={`${ticket.reference}: ${ticket.subject}`}
      className={cn(
        'group flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border sm:flex-nowrap border-border bg-card px-4 py-4 shadow-xs transition-all outline-none sm:px-5',
        'hover:-translate-y-px hover:border-foreground/20 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50',
        unread && 'bg-primary/[0.03]',
        closed && 'opacity-75',
        selected && 'ring-2 ring-primary/60 ring-offset-2 ring-offset-background',
      )}
    >
      <CustomerTile name={ticket.requester.name} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {unread && <span aria-label="Unread" className="size-2 shrink-0 rounded-full bg-primary" />}
          <h3 className={cn('line-clamp-1 text-[15px] leading-snug tracking-tight sm:text-base', unread ? 'font-bold' : 'font-semibold')}>{ticket.subject}</h3>
        </div>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{ticket.ai_summary || ticket.description}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
          <span className="font-mono text-xs font-medium">{ticket.reference}</span>
          <Meta icon={UserRound} className="min-w-0 text-foreground/80">
            <span className="truncate font-medium">{ticket.requester.name}</span>
          </Meta>
          {ticket.category && <Meta>{ticket.category.name}</Meta>}
          <Meta icon={PrioIcon} className={cn('font-medium', prio.cls)}>{ticket.priority_label}</Meta>
          {mood && <Meta icon={mood.icon}>{mood.label}</Meta>}
          <Meta icon={Clock}>
            <RelativeTime value={ticket.created_at} />
          </Meta>
        </div>
      </div>

      <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
        <div className="flex items-center gap-2">
          {attn && (
            <Chip tone={attn.tone} icon={attn.icon} className={attn.icon === Loader2 ? '[&>svg]:animate-spin' : undefined}>
              {attn.label}
            </Chip>
          )}
          <Chip tone={status.tone} icon={status.icon}>{status.label}</Chip>
        </div>
        <Meta className={cn('text-[13px]', mine ? 'font-medium text-primary' : ticket.assigned_to ? 'text-muted-foreground' : 'text-muted-foreground/70 italic')}>
          {ticket.assigned_to ? (mine ? 'Assigned to you' : ticket.assigned_to.full_name) : 'Unassigned'}
        </Meta>
      </div>
      <ChevronRight className="hidden size-4 shrink-0 -translate-x-1 text-muted-foreground/0 transition-all group-hover:translate-x-0 group-hover:text-muted-foreground sm:block" />

      <div className="flex w-full flex-wrap items-center gap-2 sm:hidden">
        {attn && <Chip tone={attn.tone} icon={attn.icon}>{attn.label}</Chip>}
        <Chip tone={status.tone} icon={status.icon}>{status.label}</Chip>
      </div>
    </Link>
  )
})

export function TicketCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-5 py-4 shadow-xs">
      <Skeleton className="size-11 rounded-lg" />
      <div className="flex flex-1 items-start justify-between gap-6">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-24 rounded-lg" />
          <Skeleton className="h-7 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
