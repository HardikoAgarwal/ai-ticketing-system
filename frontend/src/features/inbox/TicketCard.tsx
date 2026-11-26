import { Frown, Meh, Smile, Sparkles, Tag, TriangleAlert, type LucideIcon } from 'lucide-react'
import { forwardRef, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'

import { RelativeTime } from '@/components/common'
import { AiSpark, AiSurface, Avatar, fill, on, SolidChip } from '@/components/ds'
import { Checkbox } from '@/components/ui/checkbox'
import type { Sentiment, StaffTicket } from '@/lib/types'
import { cn } from '@/lib/utils'

import { attentionOf, categoryHue, PRIORITY_HUE, PRIORITY_LOOK, STATUS_CHIP, STATUS_HUE, TONE_HUE } from './model'
import type { TicketRowProps } from './TicketRow'

const SENTIMENT_ICON: Record<Sentiment, LucideIcon> = { NEGATIVE: Frown, NEUTRAL: Meh, POSITIVE: Smile }
const SENTIMENT_HUE = { NEGATIVE: 'rose', NEUTRAL: 'slate', POSITIVE: 'mint' } as const
const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()

/** A decorative barcode derived from the reference, for the ticket-stub look. */
function Barcode({ code }: { code: string }) {
  return (
    <span aria-hidden className="flex h-8 items-stretch opacity-90">
      {Array.from({ length: 30 }, (_, i) => {
        const c = code.charCodeAt(i % code.length) + i * 7
        return <span key={i} style={{ width: 1 + (c % 3), marginRight: 1 + ((c >> 2) % 3), background: 'currentColor' }} />
      })}
    </span>
  )
}

/** The AI part of a card. It hangs under the ticket inside a glowing, slowly turning aurora border, so it reads as "this is the AI". */
function AiStrip({ ticket }: { ticket: StaffTicket }) {
  const working = ticket.ai_status === 'PENDING' && ticket.category_source !== 'STAFF'
  const failed = ticket.ai_status === 'FAILED' || ticket.ai_status === 'DISABLED'
  if (!working && !failed && ticket.ai_status !== 'COMPLETED' && !ticket.ai_summary) return null
  const conf = ticket.ai_confidence !== null ? Math.round(ticket.ai_confidence * 100) : null
  const prio = ticket.ai_priority ? PRIORITY_LOOK[ticket.ai_priority] : null
  const edited = ticket.category_source === 'STAFF' || ticket.priority_source === 'STAFF'
  return (
    <div className="ai-halo -mt-7 rounded-panel">
      <AiSurface tone="quiet" animated working={working} className="px-5 pt-11 pb-5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <AiSpark working={working} className="size-[18px]" />
          <span className="ai-text text-xs font-bold tracking-[0.12em] uppercase">AI triage</span>
          {conf !== null && !working && (
            <span className="ml-auto flex items-center gap-2 text-xs font-semibold text-ink-2" title="How sure the AI is about its category and priority">
              <span className="h-1.5 w-20 overflow-hidden rounded-full bg-sunken" aria-hidden>
                <span className="block h-full rounded-full bg-gradient-to-r from-aurora-1 via-aurora-2 to-aurora-3" style={{ width: `${conf}%` }} />
              </span>
              <span className="tabular-nums">{conf}% sure</span>
            </span>
          )}
        </div>
        {working ? (
          <p className="mt-2.5 text-[15px] leading-6 text-ink-2">Reading the ticket and picking a category, priority and tone…</p>
        ) : failed && !ticket.ai_summary ? (
          <p className="mt-2.5 flex items-center gap-2 text-[15px] leading-6 text-ink-2">
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            {ticket.ai_status === 'DISABLED' ? 'AI triage is turned off for this workspace.' : 'The AI could not triage this one; keyword rules were used.'}
          </p>
        ) : (
          <p className="mt-2.5 line-clamp-3 text-[15px] leading-6 font-medium text-ink">{ticket.ai_summary || 'Triaged, no summary was written.'}</p>
        )}
        {!working && (ticket.ai_category || prio || ticket.sentiment || ticket.ai_draft_status === 'COMPLETED' || edited) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {ticket.ai_category && <SolidChip hue="lav" icon={Tag} size="sm">{ticket.ai_category.name}</SolidChip>}
            {prio && ticket.ai_priority && <SolidChip hue={PRIORITY_HUE[ticket.ai_priority] ?? 'slate'} icon={prio.icon} size="sm">{`${prio.label} priority`}</SolidChip>}
            {ticket.sentiment && <SolidChip hue={SENTIMENT_HUE[ticket.sentiment]} icon={SENTIMENT_ICON[ticket.sentiment]} size="sm">{cap(ticket.sentiment)}</SolidChip>}
            {ticket.ai_draft_status === 'COMPLETED' && <SolidChip hue="mint" icon={Sparkles} size="sm">Draft ready</SolidChip>}
            {edited && <SolidChip hue="slate" size="sm">Adjusted by staff</SolidChip>}
          </div>
        )}
      </AiSurface>
    </div>
  )
}

const STUB_LABEL = 'text-[10px] font-bold tracking-[0.14em] uppercase opacity-75'

/**
 * A ticket drawn like a ticket: a main part (reference, badges top right, subject, the customer's words) and a stub in the
 * priority colour (reference + barcode, customer, owner, times) divided by a dashed perforation with notches cut into the edges.
 * The AI triage hangs underneath in a glowing aurora frame.
 */
export const TicketCard = forwardRef<HTMLLIElement, TicketRowProps>(function TicketCard({ ticket, to, cursor, checked, selecting, fresh, meId, onToggle }, ref) {
  const closed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
  const attn = attentionOf(ticket)
  const status = STATUS_CHIP[ticket.status]
  const prio = PRIORITY_LOOK[ticket.priority]
  const band = closed ? STATUS_HUE[ticket.status] : (PRIORITY_HUE[ticket.priority] ?? 'slate')
  const mine = !!meId && ticket.assigned_to?.id === meId
  const AttnIcon = attn?.icon
  const stub: CSSProperties = { background: fill(band), color: on(band), borderColor: `color-mix(in srgb, ${on(band)} 45%, transparent)` }
  return (
    <li ref={ref} data-ticket-id={ticket.id} className="group relative">
      <div className={cn('relative z-10 rounded-panel', checked && 'ring-2 ring-ink ring-offset-2 ring-offset-canvas', cursor && 'ring-2 ring-violet ring-offset-2 ring-offset-canvas', fresh && 'ring-2 ring-ai ring-offset-2 ring-offset-canvas motion-safe:animate-pulse')}>
        <div className="drop-shadow-[0_10px_14px_rgb(60_40_20/0.10)]">
          <article className="ticket-notch overflow-hidden rounded-panel border border-line bg-surface [--stub-w:17rem]">
            <Link to={to} aria-label={`${ticket.reference}: ${ticket.subject}`} className="grid outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-inset lg:grid-cols-[minmax(0,1fr)_var(--stub-w)]">
              <span className="flex min-w-0 flex-col p-5 sm:p-6">
                <span className="flex flex-wrap items-center gap-x-3 gap-y-2 pl-8">
                  <span className="flex min-w-0 items-center gap-2 text-xs text-ink-3">
                    {ticket.has_unread && <span className="size-2 shrink-0 rounded-full bg-violet" role="img" aria-label="Unread" />}
                    <span className="truncate">
                      Updated <RelativeTime value={ticket.updated_at} />
                    </span>
                  </span>
                  <span className="ml-auto flex flex-wrap items-center justify-end gap-2">
                    {attn && AttnIcon && (
                      <SolidChip hue={TONE_HUE[attn.tone]} icon={AttnIcon} className={attn.working ? '[&>svg]:animate-spin motion-reduce:[&>svg]:animate-none' : undefined}>
                        {attn.label}
                      </SolidChip>
                    )}
                    {prio && !closed && <SolidChip hue={PRIORITY_HUE[ticket.priority] ?? 'slate'} icon={prio.icon}>{prio.label}</SolidChip>}
                  </span>
                </span>
                <span className={cn('mt-4 block text-xl leading-7 tracking-tight text-ink', ticket.has_unread ? 'font-semibold' : 'font-medium')}>{ticket.subject}</span>
                <span className="mt-2 line-clamp-3 block text-[15px] leading-6 text-ink-2">{ticket.description}</span>
                <span className="mt-auto flex flex-wrap items-center gap-2 pt-6">
                  <SolidChip hue={STATUS_HUE[ticket.status]} icon={status.icon}>{status.label}</SolidChip>
                  {ticket.category && <SolidChip hue={categoryHue(ticket.category.name)} icon={Tag}>{ticket.category.name}</SolidChip>}
                </span>
              </span>

              <dl className="flex flex-col justify-between gap-5 border-t-2 border-dashed p-5 sm:p-6 lg:border-t-0 lg:border-l-2" style={stub}>
                <span className="block">
                  <span className={STUB_LABEL}>Ticket</span>
                  <span className="mt-0.5 block font-mono text-xl font-bold tracking-tight">{ticket.reference}</span>
                  <span className="mt-1.5 block"><Barcode code={ticket.reference} /></span>
                </span>
                <span className="grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-1">
                  <span className="block min-w-0">
                    <dt className={STUB_LABEL}>Customer</dt>
                    <dd className="mt-1.5 flex min-w-0 items-center gap-2.5">
                      <Avatar name={ticket.requester.name} size="md" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{ticket.requester.name}</span>
                        <span className="block truncate text-xs opacity-80">{ticket.requester.email}</span>
                      </span>
                    </dd>
                  </span>
                  <span className="block min-w-0">
                    <dt className={STUB_LABEL}>Owner</dt>
                    <dd className="mt-1.5 flex items-center gap-2.5 text-sm font-semibold">
                      {ticket.assigned_to ? (
                        <>
                          <Avatar name={ticket.assigned_to.full_name} size="md" />
                          <span className="truncate">{mine ? 'You' : ticket.assigned_to.full_name}</span>
                        </>
                      ) : (
                        <>
                          <span aria-hidden className="flex size-8 items-center justify-center rounded-control border border-dashed text-xs" style={{ borderColor: 'currentColor' }}>?</span>
                          <span className="italic opacity-90">Unassigned</span>
                        </>
                      )}
                    </dd>
                  </span>
                </span>
                <span className="block">
                  <dt className={STUB_LABEL}>Opened</dt>
                  <dd className="mt-0.5 text-sm font-semibold">
                    <RelativeTime value={ticket.created_at} />
                  </dd>
                </span>
              </dl>
            </Link>
          </article>
        </div>
        <span className="absolute top-[22px] left-5 flex size-6 items-center justify-center sm:top-[26px] sm:left-6">
          <Checkbox checked={checked} onCheckedChange={() => onToggle(ticket.id)} aria-label={`Select ${ticket.reference}`} className={cn(!(selecting || checked) && 'opacity-70 group-hover:opacity-100')} />
        </span>
      </div>
      <AiStrip ticket={ticket} />
    </li>
  )
})

export function TicketCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-panel border border-line bg-surface" aria-hidden>
      <div className="grid lg:grid-cols-[1fr_17rem]">
        <div className="space-y-3 p-6">
          <div className="h-4 w-28 animate-pulse rounded bg-sunken" />
          <div className="h-6 w-2/3 animate-pulse rounded bg-sunken" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-sunken" />
          <div className="flex gap-2 pt-3">
            <div className="h-7 w-20 animate-pulse rounded-chip bg-sunken" />
            <div className="h-7 w-24 animate-pulse rounded-chip bg-sunken" />
          </div>
        </div>
        <div className="h-40 animate-pulse bg-sunken" />
      </div>
    </div>
  )
}
