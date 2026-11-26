import { UserRound } from 'lucide-react'
import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

import { RelativeTime } from '@/components/common'
import { AiSpark, Avatar, SolidChip } from '@/components/ds'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { StaffTicket } from '@/lib/types'

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
  compact: boolean
  meId?: number
  onToggle: (id: number) => void
}

export const TicketRow = forwardRef<HTMLLIElement, TicketRowProps>(function TicketRow(
  { ticket, to, cursor, checked, selecting, fresh, compact, meId, onToggle },
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
    <SolidChip hue={TONE_HUE[attn.tone]} icon={AttnIcon} size="sm" className={spin}>
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
        checked ? 'border-ink' : 'border-line hover:border-line-strong',
        cursor && 'ring-2 ring-violet ring-inset',
        fresh && 'ring-2 ring-ai motion-safe:animate-pulse',
        closed && 'opacity-80',
      )}
    >
      <Link
        to={to}
        aria-label={`${ticket.reference}: ${ticket.subject}`}
        className={cn('block rounded-control px-4 outline-none focus-visible:ring-2 focus-visible:ring-violet', GRID, compact ? 'py-3' : 'py-5')}
      >
        {/* ---------- table row (lg+) ---------- */}
        <span className="hidden lg:block" aria-hidden />
        <span className="hidden min-w-0 lg:block">
          <span className="flex items-center gap-2">
            {ticket.has_unread && <span className="size-2 shrink-0 rounded-full bg-violet" role="img" aria-label="Unread" />}
            <span className={cn('line-clamp-2 text-[15px] leading-5 text-ink', ticket.has_unread ? 'font-semibold' : 'font-medium')}>{ticket.subject}</span>
            {compact && <span className="hidden shrink-0 font-mono text-xs text-ink-3 xl:inline">{ticket.reference}</span>}
          </span>
          {!compact && (
            <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-2">
              {summary && <AiSpark className="size-3.5" label="AI summary" />}
              <span className="truncate">{summary || ticket.description}</span>
            </span>
          )}
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
          {!compact && <span className="font-mono">{ticket.reference}</span>}
        </span>

        {/* ---------- card row (below lg) ---------- */}
        <span className="flex min-w-0 items-start gap-3 lg:hidden">
          <span className="mt-0.5 shrink-0">
            <Avatar name={ticket.requester.name} size={compact ? 'sm' : 'md'} className={cn(selecting || checked ? 'opacity-0' : 'group-hover:opacity-0 group-focus-within:opacity-0')} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              {ticket.has_unread && <span className="relative top-[-1px] size-2 shrink-0 self-center rounded-full bg-violet" role="img" aria-label="Unread" />}
              <span className={cn('min-w-0 flex-1 truncate text-sm text-ink', ticket.has_unread ? 'font-semibold' : 'font-medium')}>{ticket.subject}</span>
              <span className="shrink-0 text-xs text-ink-3">
                <RelativeTime value={ticket.updated_at} />
              </span>
            </span>
            {!compact && (
              <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-2">
                {summary && <AiSpark className="size-3.5" label="AI summary" />}
                <span className="truncate">{summary || ticket.description}</span>
              </span>
            )}
            <span className={cn('flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-3', compact ? 'mt-0.5' : 'mt-2')}>
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

      <span
        className={cn(
          'absolute left-4 flex size-8 items-center justify-center',
          compact ? 'top-3 size-6 lg:top-1/2 lg:-translate-y-1/2' : 'top-5 lg:top-1/2 lg:-translate-y-1/2',
          !(selecting || checked) && 'opacity-0 focus-within:opacity-100 group-hover:opacity-100 lg:opacity-100',
        )}
      >
        <Checkbox checked={checked} onCheckedChange={() => onToggle(ticket.id)} aria-label={`Select ${ticket.reference}`} />
      </span>
    </li>
  )
})

export function TicketRowSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className={cn('flex items-start gap-3 px-3', compact ? 'py-2' : 'py-3')} aria-hidden>
      <div className={cn('animate-pulse rounded-control bg-sunken', compact ? 'size-6' : 'size-8')} />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 animate-pulse rounded bg-sunken" />
        {!compact && <div className="h-3.5 w-5/6 animate-pulse rounded bg-sunken" />}
        <div className="h-3 w-1/2 animate-pulse rounded bg-sunken" />
      </div>
    </div>
  )
}
