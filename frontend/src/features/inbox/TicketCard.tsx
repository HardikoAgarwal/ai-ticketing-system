import { forwardRef, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'

import { RelativeTime } from '@/components/common'
import { Avatar, fill, SolidChip } from '@/components/ds'
import { cn } from '@/lib/utils'

import { attentionOf, PRIORITY_HUE, PRIORITY_LOOK, STATUS_CHIP, STATUS_HUE, TONE_HUE } from './model'
import { NewMessageBadge } from './NewMessageBadge'
import { SelectBox } from './SelectBox'
import type { TicketRowProps } from './TicketRow'

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

const LABEL = 'text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase'

/**
 * A ticket drawn like a ticket. Main part: two big badges top right (what needs attention, and the priority), the subject, the
 * customer's words and the plain facts. Stub: a tinted side with the status badge, reference, barcode, customer and owner,
 * divided from the main part by a dashed perforation with notches. The select box sits in the stub's top-right corner.
 */
export const TicketCard = forwardRef<HTMLLIElement, TicketRowProps>(function TicketCard({ ticket, to, cursor, checked, fresh, meId, onToggle }, ref) {
  const closed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
  const attn = attentionOf(ticket)
  const status = STATUS_CHIP[ticket.status]
  const prio = PRIORITY_LOOK[ticket.priority]
  const band = closed ? STATUS_HUE[ticket.status] : (PRIORITY_HUE[ticket.priority] ?? 'slate')
  const mine = !!meId && ticket.assigned_to?.id === meId
  const AttnIcon = attn?.icon
  const stub: CSSProperties = { background: `color-mix(in srgb, ${fill(band)} 24%, var(--surface))`, borderColor: `color-mix(in srgb, ${fill(band)} 65%, transparent)` }
  return (
    <li ref={ref} data-ticket-id={ticket.id} className="group relative">
      <div className={cn('relative rounded-panel transition-shadow', checked && 'ring-2 ring-ink ring-offset-2 ring-offset-canvas', cursor && 'ring-2 ring-violet ring-offset-2 ring-offset-canvas', fresh && 'ring-2 ring-ai ring-offset-2 ring-offset-canvas motion-safe:animate-pulse')}>
        <div className="drop-shadow-[0_10px_14px_rgb(60_40_20/0.10)]">
          <article className="ticket-notch overflow-hidden rounded-panel border border-line bg-surface [--stub-w:17rem]">
            <Link to={to} aria-label={`${ticket.reference}: ${ticket.subject}`} className="grid outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-inset lg:grid-cols-[minmax(0,1fr)_var(--stub-w)]">
              <span className="flex min-w-0 flex-col p-5 sm:p-6">
                <span className="flex flex-wrap items-center justify-end gap-2 pl-10 lg:pl-0">
                  {ticket.has_unread && <span className="mr-auto size-2.5 rounded-full bg-violet lg:hidden" role="img" aria-label="Unread" />}
                  {attn && AttnIcon && (attn.kind === 'message' ? (
                    <NewMessageBadge label={attn.label} />
                  ) : (
                    <SolidChip hue={TONE_HUE[attn.tone]} icon={AttnIcon} size="lg" className={attn.working ? '[&>svg]:animate-spin motion-reduce:[&>svg]:animate-none' : undefined}>
                      {attn.label}
                    </SolidChip>
                  ))}
                  {prio && !closed && (
                    <SolidChip hue={PRIORITY_HUE[ticket.priority] ?? 'slate'} icon={prio.icon} size="lg">
                      {prio.label}
                    </SolidChip>
                  )}
                </span>
                <span className={cn('mt-4 block text-xl leading-7 tracking-tight text-ink', ticket.has_unread ? 'font-semibold' : 'font-medium')}>{ticket.subject}</span>
                <span className="mt-2 line-clamp-3 block text-[15px] leading-6 text-ink-2">{ticket.description}</span>
                <span className="mt-auto grid grid-cols-3 gap-x-6 gap-y-4 border-t border-line pt-5">
                  <span className="block min-w-0">
                    <span className={LABEL}>Category</span>
                    <span className="mt-1 block truncate text-sm font-semibold text-ink">{ticket.category?.name ?? '—'}</span>
                  </span>
                  <span className="block">
                    <span className={LABEL}>Opened</span>
                    <span className="mt-1 block text-sm font-semibold text-ink">
                      <RelativeTime value={ticket.created_at} />
                    </span>
                  </span>
                  <span className="block">
                    <span className={LABEL}>Updated</span>
                    <span className="mt-1 block text-sm font-semibold text-ink">
                      <RelativeTime value={ticket.updated_at} />
                    </span>
                  </span>
                </span>
              </span>

              <span className="flex flex-col justify-between gap-5 border-t-2 border-dashed p-5 sm:p-6 lg:border-t-0 lg:border-l-2" style={stub}>
                <span className="block">
                  <span className="flex items-center gap-2 pr-10">
                    {ticket.has_unread && <span className="hidden size-2.5 shrink-0 rounded-full bg-violet lg:block" role="img" aria-label="Unread" />}
                    <span className={LABEL}>Ticket</span>
                  </span>
                  <span className="mt-0.5 block font-mono text-xl font-bold tracking-tight text-ink">{ticket.reference}</span>
                  <span className="mt-2 block" style={{ color: fill(band) }}>
                    <Barcode code={ticket.reference} />
                  </span>
                  <span className="mt-4 block">
                    <SolidChip hue={STATUS_HUE[ticket.status]} icon={status.icon} size="lg">
                      {status.label}
                    </SolidChip>
                  </span>
                </span>
                <span className="grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-1">
                  <span className="block min-w-0">
                    <span className={LABEL}>Customer</span>
                    <span className="mt-1.5 flex min-w-0 items-center gap-2.5">
                      <Avatar name={ticket.requester.name} size="md" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">{ticket.requester.name}</span>
                        <span className="block truncate text-xs text-ink-2">{ticket.requester.email}</span>
                      </span>
                    </span>
                  </span>
                  <span className="block min-w-0">
                    <span className={LABEL}>Owner</span>
                    <span className="mt-1.5 flex items-center gap-2.5 text-sm font-semibold text-ink">
                      {ticket.assigned_to ? (
                        <>
                          <Avatar name={ticket.assigned_to.full_name} size="md" />
                          <span className={cn('truncate', mine && 'text-violet')}>{mine ? 'You' : ticket.assigned_to.full_name}</span>
                        </>
                      ) : (
                        <>
                          <span aria-hidden className="flex size-8 items-center justify-center rounded-control border border-dashed border-line-strong text-xs text-ink-3">
                            ?
                          </span>
                          <span className="font-medium text-ink-2 italic">Unassigned</span>
                        </>
                      )}
                    </span>
                  </span>
                </span>
              </span>
            </Link>
          </article>
        </div>
        <SelectBox checked={checked} onChange={() => onToggle(ticket.id)} label={`Select ${ticket.reference}`} className="absolute top-5 left-5 sm:top-6 sm:left-6 lg:top-5 lg:right-5 lg:left-auto" />
      </div>
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
