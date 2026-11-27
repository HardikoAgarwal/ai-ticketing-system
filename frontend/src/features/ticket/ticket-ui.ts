import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { Activity as ActivityIcon, AlertTriangle, Archive, CheckCheck, CircleDot, Clock, Flame, Inbox, Lock, MessageSquare, RotateCcw, Send, Sparkles, Star, Tag, TriangleAlert, UserCheck, type LucideIcon } from 'lucide-react'

import type { ChipTone, Hue } from '@/components/ds'
import { slaLabel } from '@/components/badges'
import type { DraftResponse, Sentiment, StaffTicketDetail, TicketPriority, TicketStatus } from '@/lib/types'

export const STATUS_TONE: Record<TicketStatus, ChipTone> = { OPEN: 'blue', IN_PROGRESS: 'violet', RESOLVED: 'green', CLOSED: 'slate' }
export const PRIORITY_TONE: Record<TicketPriority, ChipTone> = { CRITICAL: 'red', HIGH: 'peach', MEDIUM: 'blue', LOW: 'slate' }
/** Mood colours, deliberately off the red/rose used by Critical and Overdue so mood reads as its own signal: ink classes for the customer stub, pastel chip tones for the compact header. */
export const SENTIMENT_INK: Record<Sentiment, string> = { NEGATIVE: 'text-peach-ink', NEUTRAL: 'text-sky-ink', POSITIVE: 'text-mint-ink' }
export const SENTIMENT_CHIP: Record<Sentiment, ChipTone> = { NEGATIVE: 'peach', NEUTRAL: 'blue', POSITIVE: 'green' }

/** The statuses a ticket can move to from each status. */
export const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['RESOLVED', 'IN_PROGRESS', 'CLOSED'],
  CLOSED: ['CLOSED', 'IN_PROGRESS'],
}

const ACTIVITY_LOOK: Record<string, { icon: LucideIcon; hue: Hue }> = {
  CREATED: { icon: Inbox, hue: 'sky' },
  AI_CLASSIFIED: { icon: Sparkles, hue: 'lav' },
  AI_FAILED: { icon: AlertTriangle, hue: 'butter' },
  STATUS_CHANGED: { icon: CircleDot, hue: 'sky' },
  CATEGORY_CHANGED: { icon: Tag, hue: 'slate' },
  PRIORITY_CHANGED: { icon: Flame, hue: 'peach' },
  ASSIGNED: { icon: UserCheck, hue: 'mint' },
  REPLIED: { icon: Send, hue: 'mint' },
  NOTE_ADDED: { icon: Lock, hue: 'butter' },
  REQUESTER_REPLIED: { icon: MessageSquare, hue: 'sky' },
  REQUESTER_CONFIRMED: { icon: CheckCheck, hue: 'mint' },
  REQUESTER_REOPENED: { icon: RotateCcw, hue: 'rose' },
  CSAT_RECEIVED: { icon: Star, hue: 'butter' },
  AUTO_CLOSED: { icon: Archive, hue: 'slate' },
}
/** The icon and colour of one activity, shared by the timeline and the events shown inside the conversation. */
export const activityLook = (action: string) => ACTIVITY_LOOK[action] ?? { icon: ActivityIcon, hue: 'slate' as Hue }

/** Which part of the conversation the thread shows: everything that happened (messages, notes, triage and other events), or only the team's notes. */
export type ThreadFilter = 'messages' | 'notes'

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

/**
 * Colour + icon + label for the header's "First response" chip, covering all six values `sla_state` can be:
 * - `none` — the ticket never had a first-response target (e.g. already closed when it arrived).
 * - `on_track` — not answered yet, still comfortably inside the window.
 * - `at_risk` — not answered yet, close to the deadline.
 * - `overdue` — not answered yet, past the deadline.
 * - `met` — answered inside the window.
 * - `breached` — answered, but after the deadline had passed.
 */
export function slaBadge(t: StaffTicketDetail): { hue: Hue; icon: LucideIcon; text: string; at: string | null } {
  switch (t.sla_state) {
    case 'none': return { hue: 'slate', icon: Clock, text: 'No SLA target', at: null }
    case 'met': return { hue: 'mint', icon: CheckCheck, text: 'Responded on time', at: t.first_response_at }
    case 'breached': return { hue: 'peach', icon: AlertTriangle, text: 'Responded late', at: t.first_response_at }
    case 'overdue': return { hue: 'rose', icon: TriangleAlert, text: slaLabel(t.sla_state, t.sla_due_at), at: null }
    case 'at_risk': return { hue: 'butter', icon: Clock, text: slaLabel(t.sla_state, t.sla_due_at), at: null }
    default: return { hue: 'sky', icon: Clock, text: slaLabel(t.sla_state, t.sla_due_at), at: null } // on_track
  }
}

/** True when the customer spoke last (or nobody has replied yet): the ball is in our court. */
export function waitingOnUs(t: Pick<StaffTicketDetail, 'messages'>): boolean {
  const last = [...t.messages].reverse().find((m) => !m.is_internal)
  return !last || last.sender_is_requester
}

/** True when the draft bar will draw something, so the composer can give the whole box the aurora treatment. */
export function draftBarVisible(draft: DraftResponse | undefined, loading: boolean) {
  return !loading && !!draft && draft.status !== 'disabled'
}
