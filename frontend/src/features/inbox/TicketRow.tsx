import { Mail, UserRound } from 'lucide-react'
import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

import { RelativeTime } from '@/components/common'
import { AiSpark, Avatar, SolidChip } from '@/components/ds'
import { cn } from '@/lib/utils'
import type { StaffTicket } from '@/lib/types'

import { NewTag } from './NewTag'
import { SelectBox } from './SelectBox'
import { attentionOf, categoryHue, PRIORITY_HUE, PRIORITY_LOOK, STATUS_CHIP, STATUS_HUE, TONE_HUE } from './model'

/**
 * Column template shared by the header row and every ticket row (lg and up). Category and owner appear from xl.
 * Literal strings, so Tailwind can see them.
 */
export const GRID = 'lg:grid lg:grid-cols-[1.75rem_minmax(0,1fr)_9rem_6.5rem_9.5rem_5rem] xl:grid-cols-[1.75rem_minmax(0,1fr)_9rem_6.5rem_9.5rem_9rem_6rem_5rem] lg:items-center lg:gap-x-4'

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

export const TicketRow = forwardRef<HTMLLIElement, TicketRowProps>(function TicketRow(
  { ticket, to, cursor, checked, selecting, fresh, meId, onToggle },
  ref,
) {
  const closed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
  const attn = attentionOf(ticket)
  const prio = PRIORITY_LOOK[ticket.priority]
  const status = STATUS_CHIP[ticket.status]
  const showPriority = !closed && (ticket.priority === 'CRITICAL' || ticket.priority === 'HIGH')
  const mine = !!meId && ticket.assigned_to?.id === meId
  const owner = ticket.assigned_to ? (mine ? 'You' : ticket.assigned_to.full_name.split(' ')[0]) : null
  const summary = ticket.ai_summary
  const AttnIcon = attn?.icon
  const spin = attn?.working ? '[&>svg]:animate-spin motion-reduce:[&>svg]:animate-none' : undefined
  // The one chip that matters most: what needs attention, else the plain status.
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
    <li
      ref={ref}
      data-ticket-id={ticket.id}
      className={cn(
        'group relative rounded-panel border bg-surface shadow-card transition-colors',
        checked ? 'border-line bg-violet-soft/50' : 'border-line hover:border-line-strong',
        cursor && 'ring-2 ring-violet ring-inset',
        closed && 'opacity-80',
      )}
    >
      <Link
        to={to}
        aria-label={`${ticket.reference}: ${ticket.subject}`}
        className={cn('block rounded-control px-4 outline-none focus-visible:ring-2 focus-visible:ring-violet', GRID, 'py-5')}
      >
        {/* ---------- table row (lg+) ---------- */}
        <span className="hidden lg:block" aria-hidden />
        <span className="hidden min-w-0 lg:block">
          <span className="flex items-center gap-2">
            {ticket.has_unread && <span className="size-2 shrink-0 rounded-full bg-violet" role="img" aria-label="Unread" />}
            <span className={cn('line-clamp-2 text-[15px] leading-5 text-ink', ticket.has_unread ? 'font-semibold' : 'font-medium')}>{ticket.subject}</span>
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-2">
            {summary && <AiSpark className="size-3.5" label="AI summary" />}
            <span className="truncate">{summary || ticket.description}</span>
          </span>
        </span>
        <span className="hidden lg:block">{lead}</span>
        <span className="hidden lg:block">
          {prio && (
            <SolidChip hue={closed ? 'slate' : (PRIORITY_HUE[ticket.priority] ?? 'slate')} icon={prio.icon} size="sm">
              {prio.label}
            </SolidChip>
          )}
        </span>
        <span className="hidden min-w-0 items-center gap-2 lg:flex">
          <Avatar name={ticket.requester.name} size="xs" />
          <span className="truncate text-[13px] text-ink-2">{ticket.requester.name}</span>
        </span>
        <span className="hidden min-w-0 xl:block">
          {ticket.category ? (
            <SolidChip hue={categoryHue(ticket.category.name)} size="sm" className="max-w-full truncate">
              {ticket.category.name}
            </SolidChip>
          ) : (
            <span className="text-ink-3">—</span>
          )}
        </span>
        <span className={cn('hidden min-w-0 items-center gap-1.5 text-[13px] xl:flex', mine ? 'font-medium text-violet' : 'text-ink-2')}>
          <UserRound className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{owner ?? <span className="italic text-ink-3">Unassigned</span>}</span>
        </span>
        <span className="hidden flex-col items-end text-xs text-ink-3 lg:flex">
          <RelativeTime value={ticket.updated_at} />
          <span className="font-mono">{ticket.reference}</span>
        </span>

        {/* ---------- card row (below lg) ---------- */}
        <span className="flex min-w-0 items-start gap-3 lg:hidden">
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
              {summary && <AiSpark className="size-3.5" label="AI summary" />}
              <span className="truncate">{summary || ticket.description}</span>
            </span>
            <span className={cn('flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-3', 'mt-2')}>
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
      <span
        className={cn(
          'absolute left-4 flex size-8 items-center justify-center',
          'top-5 lg:top-1/2 lg:-translate-y-1/2',
          !(selecting || checked) && 'opacity-0 focus-within:opacity-100 group-hover:opacity-100 lg:opacity-100',
        )}
      >
        <SelectBox checked={checked} onChange={() => onToggle(ticket.id)} label={`Select ${ticket.reference}`} className="size-6" />
      </span>
    </li>
  )
})

/** A table-row-shaped placeholder: select circle, two text lines, then chip, customer and date blocks, softly shimmering. */
export function TicketRowSkeleton() {
  const bar = 'sk rounded-md bg-sunken'
  return (
    <div className="rounded-panel bg-surface px-4 py-5 shadow-card" aria-hidden>
      <div className={cn('items-center gap-x-4', GRID, 'flex')}>
        <div className="size-6 shrink-0 rounded-full bg-sunken sk lg:size-6" />
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className={`${bar} h-4 w-3/5`} />
          <div className={`${bar} h-3.5 w-4/5`} />
        </div>
        <div className="sk hidden h-6 w-28 rounded-chip bg-sunken lg:block" />
        <div className="sk hidden h-6 w-20 rounded-chip bg-sunken lg:block" />
        <div className={`${bar} hidden h-4 w-28 lg:block`} />
        <div className="sk hidden h-6 w-24 rounded-chip bg-sunken xl:block" />
        <div className={`${bar} hidden h-4 w-16 xl:block`} />
        <div className={`${bar} hidden h-4 w-14 lg:block`} />
      </div>
    </div>
  )
}
