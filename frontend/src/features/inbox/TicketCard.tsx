import { Frown, Meh, Smile, Sparkles, Tag, TriangleAlert, type LucideIcon } from 'lucide-react'
import { forwardRef, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'

import { RelativeTime } from '@/components/common'
import { AiSpark, Avatar, fill, on, SolidChip } from '@/components/ds'
import { Checkbox } from '@/components/ui/checkbox'
import type { Sentiment, StaffTicket } from '@/lib/types'
import { cn } from '@/lib/utils'

import { attentionOf, categoryHue, PRIORITY_HUE, PRIORITY_LOOK, STATUS_CHIP, STATUS_HUE, TONE_HUE } from './model'
import type { TicketRowProps } from './TicketRow'

const SENTIMENT_ICON: Record<Sentiment, LucideIcon> = { NEGATIVE: Frown, NEUTRAL: Meh, POSITIVE: Smile }
const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()

/** A chip drawn on the solid AI strip: a translucent version of the strip's own text colour, so it works in light and dark. */
function AiTag({ icon: Icon, children }: { icon?: LucideIcon; children: string }) {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-chip border px-2 text-xs font-semibold whitespace-nowrap" style={{ background: 'color-mix(in srgb, var(--on-lav) 16%, transparent)', borderColor: 'color-mix(in srgb, var(--on-lav) 34%, transparent)' }}>
      {Icon && <Icon className="size-3.5 shrink-0" aria-hidden />}
      {children}
    </span>
  )
}

/** The AI part of a card: a solid violet strip tucked under the ticket with the summary and what the AI decided, or its current state. */
function AiStrip({ ticket }: { ticket: StaffTicket }) {
  const working = ticket.ai_status === 'PENDING' && ticket.category_source !== 'STAFF'
  const failed = ticket.ai_status === 'FAILED' || ticket.ai_status === 'DISABLED'
  if (!working && !failed && ticket.ai_status !== 'COMPLETED' && !ticket.ai_summary) return null
  const conf = ticket.ai_confidence !== null ? Math.round(ticket.ai_confidence * 100) : null
  const prio = ticket.ai_priority ? PRIORITY_LOOK[ticket.ai_priority] : null
  const edited = ticket.category_source === 'STAFF' || ticket.priority_source === 'STAFF'
  const style: CSSProperties = { background: fill('lav'), color: on('lav') }
  return (
    <div className="-mt-6 rounded-b-panel px-5 pt-9 pb-4 sm:px-6" style={style}>
      <div className="flex items-start gap-3">
        <AiSpark working={working} className="mt-0.5 size-4 text-current" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.1em] uppercase opacity-80">AI triage</p>
          {working ? (
            <p className="mt-0.5 text-sm">Reading the ticket and picking a category, priority and tone…</p>
          ) : failed && !ticket.ai_summary ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm">
              <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
              {ticket.ai_status === 'DISABLED' ? 'AI triage is turned off for this workspace.' : 'The AI could not triage this one; keyword rules were used.'}
            </p>
          ) : (
            <p className="mt-0.5 line-clamp-2 text-sm leading-5 font-medium">{ticket.ai_summary || 'Triaged, no summary was written.'}</p>
          )}
          {!working && (ticket.ai_category || prio || ticket.sentiment || conf !== null || ticket.ai_draft_status === 'COMPLETED' || edited) && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {ticket.ai_category && <AiTag icon={Tag}>{ticket.ai_category.name}</AiTag>}
              {prio && ticket.ai_priority && <AiTag icon={prio.icon}>{`${prio.label} priority`}</AiTag>}
              {ticket.sentiment && <AiTag icon={SENTIMENT_ICON[ticket.sentiment]}>{cap(ticket.sentiment)}</AiTag>}
              {conf !== null && <AiTag icon={Sparkles}>{`${conf}% sure`}</AiTag>}
              {ticket.ai_draft_status === 'COMPLETED' && <AiTag icon={Sparkles}>Draft ready</AiTag>}
              {edited && <AiTag>Adjusted by staff</AiTag>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  )
}

/**
 * One ticket as a full-width card. A solid band in the priority colour carries the reference and urgency; below it sit the
 * status, attention and category badges, the subject and the customer's words, and a details panel (customer, owner, opened).
 * The AI triage hangs under the card as a solid strip.
 */
export const TicketCard = forwardRef<HTMLLIElement, Omit<TicketRowProps, 'compact'>>(function TicketCard({ ticket, to, cursor, checked, selecting, fresh, meId, onToggle }, ref) {
  const closed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
  const attn = attentionOf(ticket)
  const status = STATUS_CHIP[ticket.status]
  const prio = PRIORITY_LOOK[ticket.priority]
  const band = closed ? STATUS_HUE[ticket.status] : (PRIORITY_HUE[ticket.priority] ?? 'slate')
  const mine = !!meId && ticket.assigned_to?.id === meId
  const AttnIcon = attn?.icon
  const PrioIcon = prio?.icon
  return (
    <li ref={ref} data-ticket-id={ticket.id} className="group relative">
      <article className={cn('relative z-10 overflow-hidden rounded-panel border bg-surface shadow-card transition-shadow hover:shadow-panel', checked ? 'border-ink' : 'border-line', cursor && 'ring-2 ring-violet ring-offset-2 ring-offset-canvas', fresh && 'ring-2 ring-ai ring-offset-2 ring-offset-canvas motion-safe:animate-pulse')}>
        <div className="flex items-center gap-3 px-5 py-2.5 text-[13px] font-semibold sm:px-6" style={{ background: fill(band), color: on(band) }}>
          <span className={cn('flex size-6 items-center justify-center rounded-md bg-surface', !(selecting || checked) && 'opacity-90')}>
            <Checkbox checked={checked} onCheckedChange={() => onToggle(ticket.id)} aria-label={`Select ${ticket.reference}`} />
          </span>
          {closed ? <span>{status.label}</span> : prio && PrioIcon && <span className="inline-flex items-center gap-1.5"><PrioIcon className="size-4" aria-hidden />{prio.label} priority</span>}
          <span className="font-mono text-xs font-medium opacity-90">{ticket.reference}</span>
          {ticket.has_unread && <span className="rounded-chip px-1.5 py-0.5 text-[11px]" style={{ background: on(band), color: fill(band) }}>Unread</span>}
          <span className="ml-auto text-xs font-medium opacity-90">
            Updated <RelativeTime value={ticket.updated_at} />
          </span>
        </div>

        <Link to={to} aria-label={`${ticket.reference}: ${ticket.subject}`} className="grid gap-x-8 gap-y-5 p-5 outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-inset sm:p-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <span className="block min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <SolidChip hue={STATUS_HUE[ticket.status]} icon={status.icon}>{status.label}</SolidChip>
              {attn && AttnIcon && (
                <SolidChip hue={TONE_HUE[attn.tone]} icon={AttnIcon} className={attn.working ? '[&>svg]:animate-spin motion-reduce:[&>svg]:animate-none' : undefined}>
                  {attn.label}
                </SolidChip>
              )}
              {ticket.category && (
                <SolidChip hue={categoryHue(ticket.category.name)} icon={Tag}>
                  {ticket.category.name}
                </SolidChip>
              )}
            </span>
            <span className={cn('mt-4 block text-xl leading-7 tracking-tight text-ink', ticket.has_unread ? 'font-semibold' : 'font-medium')}>{ticket.subject}</span>
            <span className="mt-2 line-clamp-3 block text-[15px] leading-6 text-ink-2">{ticket.description}</span>
          </span>
          <dl className="grid h-fit grid-cols-2 gap-x-4 gap-y-4 rounded-control bg-surface-2 p-4 text-sm lg:grid-cols-1">
            <Detail label="Customer">
              <span className="flex min-w-0 items-center gap-2.5">
                <Avatar name={ticket.requester.name} size="md" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{ticket.requester.name}</span>
                  <span className="block truncate text-xs text-ink-2">{ticket.requester.email}</span>
                </span>
              </span>
            </Detail>
            <Detail label="Owner">
              {ticket.assigned_to ? (
                <span className={cn('flex items-center gap-2.5 font-semibold', mine ? 'text-violet' : 'text-ink')}>
                  <Avatar name={ticket.assigned_to.full_name} size="md" />
                  {mine ? 'You' : ticket.assigned_to.full_name}
                </span>
              ) : (
                <span className="flex items-center gap-2.5 text-ink-2 italic">
                  <span aria-hidden className="flex size-8 items-center justify-center rounded-control border border-dashed border-line-strong text-xs text-ink-3">?</span>
                  Unassigned
                </span>
              )}
            </Detail>
            <Detail label="Opened">
              <span className="text-ink">
                <RelativeTime value={ticket.created_at} />
              </span>
            </Detail>
          </dl>
        </Link>
      </article>
      <AiStrip ticket={ticket} />
    </li>
  )
})

export function TicketCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-panel border border-line bg-surface" aria-hidden>
      <div className="h-10 animate-pulse bg-sunken" />
      <div className="space-y-3 p-6">
        <div className="flex gap-2">
          <div className="h-7 w-20 animate-pulse rounded-chip bg-sunken" />
          <div className="h-7 w-24 animate-pulse rounded-chip bg-sunken" />
        </div>
        <div className="h-6 w-2/3 animate-pulse rounded bg-sunken" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-sunken" />
      </div>
    </div>
  )
}
