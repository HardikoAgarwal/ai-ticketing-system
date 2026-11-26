import { Frown, Meh, Smile, Sparkles, Tag, TriangleAlert, UserRound, type LucideIcon } from 'lucide-react'
import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

import { RelativeTime } from '@/components/common'
import { AiChip, AiSpark, AiSurface, Avatar, Chip } from '@/components/ds'
import { Checkbox } from '@/components/ui/checkbox'
import { SENTIMENT_TONE } from '@/features/ticket/ticket-ui'
import type { Sentiment, StaffTicket } from '@/lib/types'
import { cn } from '@/lib/utils'

import { attentionOf, PRIORITY_LOOK, STATUS_CHIP } from './model'
import type { TicketRowProps } from './TicketRow'

const PRIORITY_TONE = { CRITICAL: 'red', HIGH: 'peach', MEDIUM: 'amber', LOW: 'slate' } as const
const SENTIMENT_ICON: Record<Sentiment, LucideIcon> = { NEGATIVE: Frown, NEUTRAL: Meh, POSITIVE: Smile }
const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()

/** The AI part of a card: a strip tucked under the ticket with the summary and what the AI decided, or its current state. */
function AiStrip({ ticket }: { ticket: StaffTicket }) {
  const working = ticket.ai_status === 'PENDING' && ticket.category_source !== 'STAFF'
  const failed = ticket.ai_status === 'FAILED' || ticket.ai_status === 'DISABLED'
  const done = ticket.ai_status === 'COMPLETED' || !!ticket.ai_summary
  if (!working && !failed && !done) return null
  const conf = ticket.ai_confidence !== null ? Math.round(ticket.ai_confidence * 100) : null
  const prio = ticket.ai_priority ? PRIORITY_LOOK[ticket.ai_priority] : null
  const edited = ticket.category_source === 'STAFF' || ticket.priority_source === 'STAFF'
  return (
    <AiSurface tone="quiet" working={working} className="-mt-5 bg-lav/50 px-4 pt-8 pb-3.5 sm:px-5">
      <div className="flex items-start gap-3">
        <AiSpark working={working} className="mt-0.5 size-4" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-ai uppercase">AI triage</p>
          {working ? (
            <p className="mt-0.5 text-sm text-ink-2">Reading the ticket and picking a category, priority and tone…</p>
          ) : failed && !ticket.ai_summary ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-2">
              <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
              {ticket.ai_status === 'DISABLED' ? 'AI triage is turned off for this workspace.' : 'The AI could not triage this one; keyword rules were used.'}
            </p>
          ) : (
            <p className="mt-0.5 line-clamp-2 text-sm leading-5 text-ink">{ticket.ai_summary || 'Triaged, no summary was written.'}</p>
          )}
          {(ticket.ai_category || prio || ticket.sentiment || conf !== null || ticket.ai_draft_status === 'COMPLETED' || edited) && !working && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {ticket.ai_category && (
                <Chip tone="ai" icon={Tag} size="sm">
                  {ticket.ai_category.name}
                </Chip>
              )}
              {prio && ticket.ai_priority && (
                <Chip tone={PRIORITY_TONE[ticket.ai_priority]} icon={prio.icon} size="sm">
                  {prio.label} priority
                </Chip>
              )}
              {ticket.sentiment && (
                <Chip tone={SENTIMENT_TONE[ticket.sentiment]} icon={SENTIMENT_ICON[ticket.sentiment]} size="sm">
                  {cap(ticket.sentiment)}
                </Chip>
              )}
              {conf !== null && <AiChip size="sm">{conf}% sure</AiChip>}
              {ticket.ai_draft_status === 'COMPLETED' && (
                <AiChip icon={Sparkles} size="sm">
                  Draft ready
                </AiChip>
              )}
              {edited && (
                <Chip tone="slate" icon={UserRound} size="sm">
                  Adjusted by staff
                </Chip>
              )}
            </div>
          )}
        </div>
      </div>
    </AiSurface>
  )
}

/**
 * One ticket as a card: a header block with everything about the ticket (reference, status, attention, priority, category, subject,
 * the customer's words, who asked, who owns it, when), and the AI triage tucked underneath as a strip that peeks out from under it.
 */
export const TicketCard = forwardRef<HTMLLIElement, Omit<TicketRowProps, 'compact'>>(function TicketCard({ ticket, to, cursor, checked, selecting, fresh, meId, onToggle }, ref) {
  const closed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
  const attn = attentionOf(ticket)
  const status = STATUS_CHIP[ticket.status]
  const prio = PRIORITY_LOOK[ticket.priority]
  const mine = !!meId && ticket.assigned_to?.id === meId
  const AttnIcon = attn?.icon
  return (
    <li ref={ref} data-ticket-id={ticket.id} className={cn('group relative', closed && 'opacity-85')}>
      <div
        className={cn(
          'relative z-10 rounded-panel border bg-surface shadow-card transition-[border-color,box-shadow]',
          checked ? 'border-violet bg-violet-soft/30' : 'border-line hover:border-line-strong hover:shadow-panel',
          cursor && 'ring-2 ring-violet',
          fresh && 'ring-2 ring-ai/60 motion-safe:animate-pulse',
        )}
      >
        <Link to={to} aria-label={`${ticket.reference}: ${ticket.subject}`} className="block rounded-panel p-4 outline-none focus-visible:ring-2 focus-visible:ring-violet sm:p-5">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pl-8">
            <span className="font-mono text-xs font-medium text-ink-3">{ticket.reference}</span>
            {ticket.has_unread && <span className="size-2 rounded-full bg-violet" role="img" aria-label="Unread" />}
            <Chip tone={status.tone} icon={status.icon} size="sm">
              {status.label}
            </Chip>
            {attn && AttnIcon && (
              <Chip tone={attn.tone} icon={AttnIcon} size="sm" className={attn.working ? '[&>svg]:animate-spin motion-reduce:[&>svg]:animate-none' : undefined}>
                {attn.label}
              </Chip>
            )}
            {prio && (
              <Chip tone={PRIORITY_TONE[ticket.priority]} icon={prio.icon} size="sm">
                {prio.label}
              </Chip>
            )}
            {ticket.category && (
              <Chip tone="slate" icon={Tag} size="sm">
                {ticket.category.name}
              </Chip>
            )}
            <span className="ml-auto text-xs text-ink-3">
              <RelativeTime value={ticket.updated_at} />
            </span>
          </span>

          <span className={cn('mt-3 block line-clamp-2 text-base leading-6 text-ink', ticket.has_unread ? 'font-semibold' : 'font-medium')}>{ticket.subject}</span>
          <span className="mt-1 block line-clamp-2 text-sm leading-5 text-ink-2">{ticket.description}</span>

          <span className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-2">
              <Avatar name={ticket.requester.name} size="sm" />
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{ticket.requester.name}</span>
              </span>
            </span>
            <span className={cn('ml-auto flex items-center gap-2', mine ? 'font-medium text-violet' : 'text-ink-2')}>
              {ticket.assigned_to ? (
                <>
                  <Avatar name={ticket.assigned_to.full_name} size="xs" />
                  <span>{mine ? 'You' : ticket.assigned_to.full_name}</span>
                </>
              ) : (
                <>
                  <span aria-hidden className="flex size-5 items-center justify-center rounded-md border border-dashed border-line-strong text-[10px] text-ink-3">
                    ?
                  </span>
                  <span className="italic text-ink-3">Unassigned</span>
                </>
              )}
            </span>
          </span>
        </Link>
        <span className={cn('absolute top-4 left-4 flex size-6 items-center justify-center sm:top-5 sm:left-5', !(selecting || checked) && 'opacity-60 focus-within:opacity-100 group-hover:opacity-100')}>
          <Checkbox checked={checked} onCheckedChange={() => onToggle(ticket.id)} aria-label={`Select ${ticket.reference}`} />
        </span>
      </div>
      <AiStrip ticket={ticket} />
    </li>
  )
})

export function TicketCardSkeleton() {
  return (
    <div className="rounded-panel border border-line bg-surface p-5" aria-hidden>
      <div className="flex gap-2">
        <div className="h-6 w-20 animate-pulse rounded-chip bg-sunken" />
        <div className="h-6 w-16 animate-pulse rounded-chip bg-sunken" />
      </div>
      <div className="mt-4 h-5 w-3/4 animate-pulse rounded bg-sunken" />
      <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-sunken" />
      <div className="mt-6 h-10 animate-pulse rounded-control bg-sunken" />
    </div>
  )
}
