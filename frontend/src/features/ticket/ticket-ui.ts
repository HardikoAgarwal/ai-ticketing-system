import { format, isToday, isYesterday, parseISO } from 'date-fns'

import type { ChipTone } from '@/components/ds'
import { slaLabel } from '@/components/badges'
import type { Sentiment, StaffTicketDetail, TicketPriority, TicketStatus } from '@/lib/types'

export const STATUS_TONE: Record<TicketStatus, ChipTone> = { OPEN: 'blue', IN_PROGRESS: 'violet', RESOLVED: 'green', CLOSED: 'slate' }
export const PRIORITY_TONE: Record<TicketPriority, ChipTone> = { CRITICAL: 'red', HIGH: 'peach', MEDIUM: 'blue', LOW: 'slate' }
export const SENTIMENT_TONE: Record<Sentiment, ChipTone> = { NEGATIVE: 'red', NEUTRAL: 'slate', POSITIVE: 'green' }

export const TABS = ['conversation', 'details', 'similar', 'activity', 'notes'] as const
export type TicketTab = (typeof TABS)[number]

export const isOpenStatus = (s: TicketStatus) => s === 'OPEN' || s === 'IN_PROGRESS'

export function dayLabel(iso: string): string {
  const d = parseISO(iso)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEEE, d MMM')
}

/** What the AI triage is doing right now, folded into one state the UI can switch on. */
export type AiState = 'working' | 'done' | 'failed' | 'limited' | 'off' | 'idle'
export function aiState(t: Pick<StaffTicketDetail, 'ai_status' | 'ai_error'>): AiState {
  if (t.ai_status === 'PENDING') return 'working'
  if (t.ai_status === 'DISABLED') return 'off'
  if (t.ai_status === 'FAILED') return /budget|quota|limit|rate/i.test(t.ai_error) ? 'limited' : 'failed'
  if (t.ai_status === 'COMPLETED') return 'done'
  return 'idle'
}

export function slaView(t: StaffTicketDetail) {
  const answered = !!t.first_response_at
  const open = isOpenStatus(t.status)
  const waiting = !answered && open && t.sla_state !== 'none'
  const tone: ChipTone = answered ? 'green' : t.sla_state === 'overdue' ? 'red' : t.sla_state === 'at_risk' ? 'amber' : 'slate'
  const text = answered ? 'Responded' : slaLabel(t.sla_state, t.sla_due_at)
  return { answered, waiting, tone, text }
}

/** One practical suggestion derived from the ticket state. */
export function nextAction(t: StaffTicketDetail, draftReady: boolean, meId?: number): { text: string; tone: ChipTone } {
  if (t.status === 'RESOLVED') return { text: 'Waiting for the customer to confirm the fix. Reopen if they reply.', tone: 'green' }
  if (t.status === 'CLOSED') return { text: 'This ticket is closed. Reopen it to reply.', tone: 'slate' }
  if (t.sla_state === 'overdue' && !t.first_response_at) return { text: 'The first-response target has passed. Reply now.', tone: 'red' }
  if (!t.assigned_to) return { text: 'Nobody owns this yet. Take it, then review the suggested reply.', tone: 'amber' }
  if (t.unread_kind === 'requester_reply') return { text: 'The customer wrote back. Read their message and answer.', tone: 'amber' }
  if (draftReady && t.assigned_to.id === meId) return { text: 'An AI draft is ready. Check the facts, then send.', tone: 'violet' }
  if (draftReady) return { text: 'An AI draft is ready for whoever picks this up.', tone: 'slate' }
  return { text: 'Reply to the customer or leave an internal note for the team.', tone: 'slate' }
}
