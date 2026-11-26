import { Mail, UserRound } from 'lucide-react'
import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

import { RelativeTime } from '@/components/common'
import { AiSpark, Avatar, SolidChip } from '@/components/ds'
import { cn } from '@/lib/utils'
import type { StaffTicket } from '@/lib/types'

import { NewTag } from './NewTag'
import { SelectBox } from './SelectBox'
import { attentionOf, PRIORITY_HUE, PRIORITY_LOOK, STATUS_CHIP, STATUS_HUE, TONE_HUE } from './model'

export interface TicketRowProps {
  ticket: StaffTicket
  to: string
  /** The keyboard cursor (J/K). */
  cursor: boolean
  checked: boolean
  selecting: boolean
  fresh: boolean
  meId?: number
  onToggle: (id: number) => void
}

/**
 * One ticket as a compact card row, used below the large breakpoint where the table does not fit: avatar, subject, one line of AI
 * summary, then the lead badge, priority, reference, customer, category and owner.
 */
export const TicketRow = forwardRef<HTMLLIElement, TicketRowProps>(function TicketRow({ ticket, to, cursor, checked, selecting, fresh, meId, onToggle }, ref) {
  const attn = attentionOf(ticket)
  const prio = PRIORITY_LOOK[ticket.priority]
  const status = STATUS_CHIP[ticket.status]
  const showPriority = ticket.priority === 'CRITICAL' || ticket.priority === 'HIGH'
  const mine = !!meId && ticket.assigned_to?.id === meId
  const owner = ticket.assigned_to ? (mine ? 'You' : ticket.assigned_to.full_name.split(' ')[0]) : null
  const AttnIcon = attn?.icon
  const spin = attn?.working ? '[&>svg]:animate-spin motion-reduce:[&>svg]:animate-none' : undefined
  const lead = attn && AttnIcon ? (
    <SolidChip hue={attn.kind === 'message' ? 'mint' : TONE_HUE[attn.tone]} icon={attn.kind === 'message' ? Mail : AttnIcon} size="sm" className={spin}>
      {attn.label}
    </SolidChip>
  ) : (
    <SolidChip hue={STATUS_HUE[ticket.status]} icon={status.icon} size="sm">
      {status.label}
    </SolidChip>
  )
  return (
    <li ref={ref} data-ticket-id={ticket.id} className={cn('group relative rounded-panel bg-surface shadow-card transition-colors', checked && 'bg-violet-soft/50', cursor && 'ring-2 ring-violet ring-inset')}>
      <Link to={to} aria-label={`${ticket.reference}: ${ticket.subject}`} className="block rounded-panel px-4 py-4 outline-none focus-visible:ring-2 focus-visible:ring-violet">
        <span className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 shrink-0">
            <Avatar name={ticket.requester.name} size="md" className={cn(selecting || checked ? 'opacity-0' : 'group-hover:opacity-0 group-focus-within:opacity-0')} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              {ticket.has_unread && <span className="relative top-[-1px] size-2 shrink-0 self-center rounded-full bg-violet" role="img" aria-label="Unread" />}
              <span className={cn('min-w-0 flex-1 truncate text-sm text-ink', ticket.has_unread ? 'font-semibold' : 'font-medium')}>{ticket.subject}</span>
              <span className="shrink-0 text-xs text-ink-3">
                <RelativeTime value={ticket.updated_at} />
              </span>
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-2">
              {ticket.ai_summary && <AiSpark className="size-3.5" label="AI summary" />}
              <span className="truncate">{ticket.ai_summary || ticket.description}</span>
            </span>
            <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-3">
              {lead}
              {showPriority && prio && (
                <SolidChip hue={PRIORITY_HUE[ticket.priority] ?? 'slate'} icon={prio.icon} size="sm">
                  {prio.label}
                </SolidChip>
              )}
              <span className="font-mono">{ticket.reference}</span>
              <span className="max-w-[10rem] truncate text-ink-2">{ticket.requester.name}</span>
              {ticket.category && <span className="max-w-[9rem] truncate">{ticket.category.name}</span>}
              <span className={cn('ml-auto inline-flex items-center gap-1', mine && 'font-medium text-violet')}>
                <UserRound className="size-3" aria-hidden />
                {owner ?? <span className="italic">Unassigned</span>}
              </span>
            </span>
          </span>
        </span>
      </Link>
      {fresh && <NewTag size="sm" className="absolute -top-3 right-4" />}
      <span className={cn('absolute top-4 left-4 flex size-8 items-center justify-center', !(selecting || checked) && 'opacity-0 focus-within:opacity-100 group-hover:opacity-100')}>
        <SelectBox checked={checked} onChange={() => onToggle(ticket.id)} label={`Select ${ticket.reference}`} className="size-6" />
      </span>
    </li>
  )
})
