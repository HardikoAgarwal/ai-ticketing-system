import { differenceInMinutes, parseISO } from 'date-fns'
import { Archive, CheckCheck, Clock, Flame, Inbox, MessageCircleReply, TriangleAlert, type LucideIcon } from 'lucide-react'

import { CHIP_TONES, type ChipTone } from '@/components/dashboard/Chip'
import { cn } from '@/lib/utils'
import type { StaffTicket } from '@/lib/types'

export type StateKind = 'message' | 'ticket' | 'overdue' | 'atrisk' | 'critical' | 'resolved' | 'closed' | 'aifailed'

const VARIANTS: Record<StateKind, { tone: ChipTone; icon: LucideIcon }> = {
  message: { tone: 'blue', icon: MessageCircleReply },
  ticket: { tone: 'green', icon: Inbox },
  overdue: { tone: 'red', icon: TriangleAlert },
  critical: { tone: 'red', icon: Flame },
  atrisk: { tone: 'amber', icon: Clock },
  resolved: { tone: 'green', icon: CheckCheck },
  closed: { tone: 'slate', icon: Archive },
  aifailed: { tone: 'amber', icon: TriangleAlert },
}

/** Strong, filled badge for the state that needs attention. Bigger and louder than the calm info badges. */
export function StateBadge({ kind, label, pulse, className }: { kind: StateKind; label: string; pulse?: boolean; className?: string }) {
  const v = VARIANTS[kind]
  const Icon = v.icon
  return (
    <span className={cn('inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold whitespace-nowrap', CHIP_TONES[v.tone], className)}>
      {pulse ? (
        <span className="relative flex size-2.5 items-center justify-center" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-40" />
          <span className="relative size-1.5 rounded-full bg-current" />
        </span>
      ) : (
        <Icon className="size-3.5 shrink-0" />
      )}
      {label}
    </span>
  )
}

function humanize(minutes: number): string {
  const abs = Math.abs(minutes)
  if (abs < 60) return `${abs}m`
  if (abs < 48 * 60) return `${Math.round(abs / 60)}h`
  return `${Math.round(abs / 60 / 24)}d`
}

export interface TicketState {
  kind: StateKind
  label: string
  pulse?: boolean
}

/** The badges that should be loudly highlighted for a ticket, in priority order. Closed work gets only its closed marker. */
export function ticketStates(t: Pick<StaffTicket, 'status' | 'unread_kind' | 'sla_state' | 'sla_due_at' | 'priority' | 'ai_status' | 'category_source'>): TicketState[] {
  if (t.status === 'CLOSED') return [{ kind: 'closed', label: 'Closed' }]
  if (t.status === 'RESOLVED') return [{ kind: 'resolved', label: 'Resolved' }]
  const out: TicketState[] = []
  if (t.unread_kind === 'requester_reply') out.push({ kind: 'message', label: 'New message', pulse: true })
  else if (t.unread_kind === 'new_ticket') out.push({ kind: 'ticket', label: 'New ticket', pulse: true })
  const mins = t.sla_due_at ? differenceInMinutes(parseISO(t.sla_due_at), new Date()) : null
  if (t.sla_state === 'overdue') out.push({ kind: 'overdue', label: mins !== null ? `Overdue ${humanize(mins)}` : 'Overdue' })
  else if (t.sla_state === 'at_risk') out.push({ kind: 'atrisk', label: mins !== null ? `Due in ${humanize(mins)}` : 'Due soon' })
  if (t.priority === 'CRITICAL') out.push({ kind: 'critical', label: 'Critical' })
  if (t.ai_status === 'FAILED') out.push({ kind: 'aifailed', label: 'Needs triage' })
  return out
}
