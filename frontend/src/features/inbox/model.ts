import { AlertTriangle, ArrowDown, ArrowUp, CircleCheck, CircleDot, Clock, Flame, Loader2, Mail, MessageSquare, Minus, Sparkles, Timer, type LucideIcon } from 'lucide-react'

import { ticketStates } from '@/components/dashboard/badges'
import type { ChipTone, Hue } from '@/components/ds'
import type { TicketQuery } from '@/lib/endpoints'
import type { StaffTicket, TicketStatus } from '@/lib/types'

/* ---------- views, sort, filters (all state lives in the URL, so a filtered list is linkable and survives a reload) ---------- */

export const VIEWS = {
  attention: { label: 'Needs attention', query: { status: 'OPEN,IN_PROGRESS' } },
  mine: { label: 'Mine', query: { status: 'OPEN,IN_PROGRESS', assigned: 'me' } },
  unassigned: { label: 'Unassigned', query: { status: 'OPEN,IN_PROGRESS', assigned: 'unassigned' } },
  all: { label: 'All', query: { ordering: '-created_at' } },
} as const
export type ViewKey = keyof typeof VIEWS

export const SORT_OPTIONS = [
  { value: 'default', label: 'Urgency, then oldest', ordering: undefined },
  { value: 'newest', label: 'Newest first', ordering: '-created_at' },
  { value: 'oldest', label: 'Oldest first', ordering: 'created_at' },
  { value: 'updated', label: 'Recently updated', ordering: '-updated_at' },
  { value: 'sla', label: 'SLA due soonest', ordering: 'sla_due_at' },
] as const

export const FILTER_KEYS = ['status', 'priority', 'category', 'assigned', 'sla'] as const
export type FilterKey = (typeof FILTER_KEYS)[number]
/** URL params owned by the ticket list. Remembered with the queue so the ticket page can link back with the same filters. */
export const INBOX_PARAMS = ['view', 'q', 'sort', 'layout', ...FILTER_KEYS] as const

export const PAGE_SIZE = 25

export function viewFromParams(params: URLSearchParams): ViewKey {
  const v = params.get('view') as ViewKey | null
  return v && v in VIEWS ? v : 'attention'
}

export function buildQuery(params: URLSearchParams): TicketQuery {
  const q: TicketQuery = { ...VIEWS[viewFromParams(params)].query }
  for (const key of [...FILTER_KEYS, 'q'] as const) {
    const v = params.get(key)
    if (v) q[key] = v
  }
  const sort = SORT_OPTIONS.find((o) => o.value === (params.get('sort') ?? 'default'))
  if (sort?.ordering) q.ordering = sort.ordering
  return q
}

/** Keep only the params the list owns (drops anything unrelated), as a "?a=b" string or "". */
export function inboxSearch(params: URLSearchParams): string {
  const next = new URLSearchParams()
  for (const k of INBOX_PARAMS) {
    const v = params.get(k)
    if (v) next.set(k, v)
  }
  const s = next.toString()
  return s ? `?${s}` : ''
}

/* ---------- per-ticket presentation helpers (status/attention/grouping) ---------- */

export const STATUS_CHIP: Record<TicketStatus, { tone: ChipTone; icon: LucideIcon; label: string }> = {
  OPEN: { tone: 'blue', icon: CircleDot, label: 'Open' },
  IN_PROGRESS: { tone: 'violet', icon: Loader2, label: 'In progress' },
  RESOLVED: { tone: 'green', icon: CircleCheck, label: 'Resolved' },
  CLOSED: { tone: 'slate', icon: CircleCheck, label: 'Closed' },
}

export const PRIORITY_LOOK: Record<string, { icon: LucideIcon; cls: string; label: string }> = {
  CRITICAL: { icon: Flame, cls: 'text-rose-ink', label: 'Critical' },
  HIGH: { icon: ArrowUp, cls: 'text-peach-ink', label: 'High' },
  MEDIUM: { icon: Minus, cls: 'text-butter-ink', label: 'Medium' },
  LOW: { icon: ArrowDown, cls: 'text-ink-3', label: 'Low' },
}

export interface Attention {
  /** What kind of attention it is, so a view can draw a reply differently from an overdue ticket. */
  kind: 'overdue' | 'message' | 'atrisk' | 'new' | 'aifailed' | 'triaging' | 'draft'
  tone: ChipTone
  icon: LucideIcon
  label: string
  /** Spoken equivalent for assistive tech, since the chip colour alone must not carry meaning. */
  working?: boolean
}

/** The single most important thing about this ticket right now, or null when nothing needs attention. */
export function attentionOf(ticket: StaffTicket): Attention | null {
  if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') return null
  const states = ticketStates(ticket)
  const find = (kind: string) => states.find((s) => s.kind === kind)
  const overdue = find('overdue')
  if (overdue) return { kind: 'overdue', tone: 'red', icon: Timer, label: overdue.label }
  const msg = find('message')
  if (msg) return { kind: 'message', tone: 'blue', icon: MessageSquare, label: msg.label }
  const risk = find('atrisk')
  if (risk) return { kind: 'atrisk', tone: 'amber', icon: Clock, label: risk.label }
  const fresh = find('ticket')
  if (fresh) return { kind: 'new', tone: 'green', icon: CircleDot, label: fresh.label }
  const failed = find('aifailed')
  if (failed) return { kind: 'aifailed', tone: 'amber', icon: AlertTriangle, label: failed.label }
  if (ticket.ai_status === 'PENDING' && ticket.category_source !== 'STAFF') return { kind: 'triaging', tone: 'ai', icon: Loader2, label: 'AI triaging', working: true }
  if (ticket.ai_draft_status === 'COMPLETED') return { kind: 'draft', tone: 'ai', icon: Sparkles, label: 'Draft ready' }
  return null
}

/**
 * What to show as the tabs above a card: "New message" (green) and "Overdue" (red) when they apply, side by side; otherwise the single
 * most important state, if any.
 */
export function attentionTabs(ticket: StaffTicket): Attention[] {
  if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') return []
  const states = ticketStates(ticket)
  const out: Attention[] = []
  const msg = states.find((s) => s.kind === 'message')
  if (msg) out.push({ kind: 'message', tone: 'green', icon: Mail, label: msg.label })
  const overdue = states.find((s) => s.kind === 'overdue')
  if (overdue) out.push({ kind: 'overdue', tone: 'red', icon: Timer, label: overdue.label })
  if (!out.length) {
    const one = attentionOf(ticket)
    if (one) out.push(one)
  }
  return out
}

/* ---------- solid colours for this page (the faded pastel chips are not used here) ---------- */

export const STATUS_HUE: Record<TicketStatus, Hue> = { OPEN: 'sky', IN_PROGRESS: 'lav', RESOLVED: 'mint', CLOSED: 'slate' }
export const PRIORITY_HUE: Record<string, Hue> = { CRITICAL: 'rose', HIGH: 'peach', MEDIUM: 'butter', LOW: 'slate' }
/** Maps the attention chip's pastel tone onto the solid hue with the same meaning. */
export const TONE_HUE: Record<ChipTone, Hue> = { red: 'rose', blue: 'sky', amber: 'butter', green: 'mint', ai: 'lav', violet: 'lav', peach: 'peach', slate: 'slate' }
const CATEGORY_HUES: Hue[] = ['mint', 'lav', 'sky', 'peach', 'rose', 'butter']
/** A stable colour per category name, so the same category always looks the same. */
export function categoryHue(name: string): Hue {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return CATEGORY_HUES[h % CATEGORY_HUES.length]
}

/** The colour a filter value wears: status, priority and category use the colours the tickets themselves wear. */
export function hueFor(key: string, value: string, label: string): Hue {
  if (key === 'status') return STATUS_HUE[value as TicketStatus] ?? 'slate'
  if (key === 'priority') return PRIORITY_HUE[value] ?? 'slate'
  return categoryHue(label)
}

/**
 * The colour of each stat tile, taken from the same maps the ticket badges use, so a tile and its badge always match:
 * Open = the Open status colour, Overdue = the overdue tab colour, Critical = the Critical priority colour.
 */
export const TILE_HUE: Record<'open' | 'overdue' | 'unassigned' | 'critical' | 'mine', Hue> = {
  open: STATUS_HUE.OPEN,
  overdue: TONE_HUE.red,
  unassigned: 'lav',
  critical: PRIORITY_HUE.CRITICAL,
  mine: 'mint',
}
