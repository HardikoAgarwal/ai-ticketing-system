import { UserRound } from 'lucide-react'
import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

import { RelativeTime } from '@/components/common'
import { AiSpark, Avatar, Chip } from '@/components/ds'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { StaffTicket } from '@/lib/types'

import { attentionOf, PRIORITY_LOOK, STATUS_CHIP } from './model'

/**
 * Column template shared by the header row and every ticket row (lg and up). Category and owner appear from xl.
 * Literal strings, so Tailwind can see them.
 */
export const GRID = 'lg:grid lg:grid-cols-[1.75rem_minmax(0,1fr)_9.5rem_5.5rem_9.5rem_5rem] xl:grid-cols-[1.75rem_minmax(0,1fr)_9.5rem_5.5rem_9.5rem_8rem_7rem_5rem] lg:items-center lg:gap-x-4'

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
    <Chip tone={attn.tone} icon={AttnIcon} size="sm" className={spin}>
      {attn.label}
    </Chip>
  ) : (
    <Chip tone={status.tone} icon={status.icon} size="sm">
      {status.label}
    </Chip>
  )

  return (
    <li
      ref={ref}
      data-ticket-id={ticket.id}
      className={cn(
        'group relative rounded-control border border-transparent transition-colors',
        checked ? 'bg-violet-soft/60' : 'hover:bg-surface-2',
        cursor && 'ring-2 ring-violet ring-inset',
        fresh && 'bg-lav motion-safe:animate-pulse',
        closed && 'opacity-80',
      )}
    >
      <Link
        to={to}
        aria-label={`${ticket.reference}: ${ticket.subject}`}
        className={cn('block rounded-control px-3 outline-none focus-visible:ring-2 focus-visible:ring-violet', GRID, compact ? 'py-2' : 'py-3')}
      >
        {/* ---------- table row (lg+) ---------- */}
        <span className="hidden lg:block" aria-hidden />
        <span className="hidden min-w-0 lg:block">
          <span className="flex items-center gap-2">
            {ticket.has_unread && <span className="size-2 shrink-0 rounded-full bg-violet" role="img" aria-label="Unread" />}
            <span className={cn('truncate text-sm text-ink', ticket.has_unread ? 'font-semibold' : 'font-medium')}>{ticket.subject}</span>
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
            <span className={cn('inline-flex items-center gap-1 text-[13px] font-medium', closed ? 'text-ink-3' : prio.cls)}>
              <prio.icon className="size-3.5" aria-hidden />
              {prio.label}
            </span>
          )}
        </span>
        <span className="hidden min-w-0 items-center gap-2 lg:flex">
          <Avatar name={ticket.requester.name} size="xs" />
          <span className="truncate text-[13px] text-ink-2">{ticket.requester.name}</span>
        </span>
        <span className="hidden min-w-0 truncate text-[13px] text-ink-2 xl:block">{ticket.category?.name ?? <span className="text-ink-3">—</span>}</span>
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
                <Chip tone={ticket.priority === 'CRITICAL' ? 'red' : 'peach'} icon={prio.icon} size="sm">
                  {prio.label}
                </Chip>
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
          'absolute left-3 flex size-8 items-center justify-center',
          compact ? 'top-2.5 size-6 lg:top-1/2 lg:-translate-y-1/2' : 'top-3.5 lg:top-1/2 lg:-translate-y-1/2',
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
