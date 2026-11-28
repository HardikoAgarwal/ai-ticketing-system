import { CheckCircle2, MessageCircleReply, Star, type LucideIcon } from 'lucide-react'

import type { Hue } from '@/components/ds'
import type { RequesterTicket, TicketStatus } from '@/lib/types'

/** The solid colour each status wears on the customer side (same as the agent side). */
export const REQUESTER_HUE: Record<TicketStatus, Hue> = { OPEN: 'sky', IN_PROGRESS: 'lav', RESOLVED: 'mint', CLOSED: 'slate' }

export interface PortalBadge {
  kind: 'reply' | 'confirm' | 'rated'
  hue: Hue
  icon: LucideIcon
  label: string
}

/**
 * What needs the customer's eye on a request, as badges that hang off the card's top edge. A team reply first, then a
 * resolution waiting for their confirmation; a closed and rated request shows its score.
 */
export function portalBadges(ticket: RequesterTicket): PortalBadge[] {
  const out: PortalBadge[] = []
  if (ticket.has_unread) out.push({ kind: 'reply', hue: 'mint', icon: MessageCircleReply, label: 'New reply from our team' })
  if (ticket.status === 'RESOLVED') out.push({ kind: 'confirm', hue: 'butter', icon: CheckCircle2, label: 'Please confirm' })
  if (ticket.status === 'CLOSED' && ticket.csat_score) out.push({ kind: 'rated', hue: 'slate', icon: Star, label: `You rated ${ticket.csat_score}/5` })
  return out
}

/** The list views, which the stat tiles on the home page also select. */
export type PortalView = 'active' | 'replies' | 'confirm' | 'all'
export const PORTAL_VIEWS: PortalView[] = ['active', 'replies', 'confirm', 'all']

export function inView(ticket: RequesterTicket, view: PortalView) {
  if (view === 'active') return ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS'
  if (view === 'replies') return ticket.has_unread
  if (view === 'confirm') return ticket.status === 'RESOLVED'
  return true
}
