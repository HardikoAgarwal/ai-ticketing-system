import { CheckCircle2, CircleDot, Lock, Timer, type LucideIcon } from 'lucide-react'

import type { ChipTone } from '@/components/ds'
import type { TicketStatus } from '@/lib/types'

/** Customer-facing wording for each ticket status. Icon + text always, never colour alone. */
export const REQUESTER_STATUS: Record<TicketStatus, { label: string; hint: string; tone: ChipTone; icon: LucideIcon }> = {
  OPEN: { label: 'Received', hint: 'Waiting for our team to pick it up', tone: 'blue', icon: CircleDot },
  IN_PROGRESS: { label: "We're on it", hint: 'Our team is working on this', tone: 'violet', icon: Timer },
  RESOLVED: { label: 'Resolved', hint: 'Please confirm it solved your issue', tone: 'green', icon: CheckCircle2 },
  CLOSED: { label: 'Closed', hint: 'This request is closed', tone: 'slate', icon: Lock },
}
