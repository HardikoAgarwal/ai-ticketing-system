import { Tag } from 'lucide-react'
import { forwardRef, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'

import { RelativeTime } from '@/components/common'
import { Avatar, fill, SolidChip } from '@/components/ds'
import { cn } from '@/lib/utils'

import { attentionOf, categoryHue, PRIORITY_HUE, PRIORITY_LOOK, STATUS_CHIP, STATUS_HUE, TONE_HUE } from './model'
import { NewMessageBadge } from './NewMessageBadge'
import { SelectBox } from './SelectBox'
import type { TicketRowProps } from './TicketRow'

/** A decorative barcode derived from the reference, for the ticket-stub look. */
function Barcode({ code }: { code: string }) {
  return (
    <span aria-hidden className="flex h-7 items-stretch opacity-90">
      {Array.from({ length: 26 }, (_, i) => {
        const c = code.charCodeAt(i % code.length) + i * 7
        return <span key={i} style={{ width: 1 + (c % 3), marginRight: 1 + ((c >> 2) % 3), background: 'currentColor' }} />
      })}
    </span>
  )
}

const LABEL = 'text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase'

/**
 * A ticket drawn like a ticket, kept short. Main part: the subject and the customer's words, then the status and category tags
 * with the times. Stub (wide, tinted, behind a dashed perforation with notches): reference, barcode, customer, owner.
 * Badges take no room: "New message" hangs off the top-left edge and the priority / attention badges off the top-right edge.
 * The round select button straddles the left edge.
 */
export const TicketCard = forwardRef<HTMLLIElement, TicketRowProps>(function TicketCard({ ticket, to, cursor, checked, fresh, meId, onToggle }, ref) {
  const closed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
  const attn = attentionOf(ticket)
  const status = STATUS_CHIP[ticket.status]
  const prio = PRIORITY_LOOK[ticket.priority]
  const band = closed ? STATUS_HUE[ticket.status] : (PRIORITY_HUE[ticket.priority] ?? 'slate')
  const mine = !!meId && ticket.assigned_to?.id === meId
  const AttnIcon = attn?.icon
  const isMessage = attn?.kind === 'message'
  const stub: CSSProperties = { background: `color-mix(in srgb, ${fill(band)} 24%, var(--surface))`, borderColor: `color-mix(in srgb, ${fill(band)} 65%, transparent)` }
  const main: CSSProperties | undefined = checked ? { background: 'color-mix(in srgb, var(--violet) 7%, var(--surface))' } : undefined
  return (
    <li ref={ref} data-ticket-id={ticket.id} className="group relative">
      <div className={cn('relative [--stub-w:21rem]', cursor && 'ring-2 ring-violet ring-offset-2 ring-offset-canvas', fresh && 'ring-2 ring-ai ring-offset-2 ring-offset-canvas motion-safe:animate-pulse')}>
        <div className="drop-shadow-[0_10px_14px_rgb(60_40_20/0.10)]">
          <article className={cn('ticket-notch overflow-hidden border-2 bg-surface transition-colors', checked ? 'border-violet' : 'border-line')}>
            <Link to={to} aria-label={`${ticket.reference}: ${ticket.subject}`} className="grid outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-inset lg:grid-cols-[minmax(0,1fr)_var(--stub-w)]">
              <span className="flex min-w-0 flex-col gap-4 p-5 pt-6 pl-9 sm:pl-10" style={main}>
                <span className="block">
                  <span className={cn('line-clamp-2 block text-[22px] leading-7 tracking-tight text-ink', ticket.has_unread ? 'font-bold' : 'font-semibold')}>
                    {ticket.has_unread && <span className="mr-2 inline-block size-2.5 rounded-full bg-violet align-middle" role="img" aria-label="Unread" />}
                    {ticket.subject}
                  </span>
                  <span className="mt-1.5 line-clamp-2 block max-w-[68ch] text-[15px] leading-6 text-ink-2">{ticket.description}</span>
                </span>
                <span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-2">
                  <SolidChip hue={STATUS_HUE[ticket.status]} icon={status.icon}>{status.label}</SolidChip>
                  {ticket.category && <SolidChip hue={categoryHue(ticket.category.name)} icon={Tag}>{ticket.category.name}</SolidChip>}
                  <span className="ml-auto text-xs text-ink-2">
                    Opened <RelativeTime value={ticket.created_at} /> · Updated <RelativeTime value={ticket.updated_at} />
                  </span>
                </span>
              </span>

              <span className="flex flex-col justify-between gap-4 border-t-2 border-dashed p-5 lg:border-t-0 lg:border-l-2" style={stub}>
                <span className="flex items-start justify-between gap-3">
                  <span className="block">
                    <span className={LABEL}>Ticket</span>
                    <span className="block font-mono text-xl leading-6 font-bold tracking-tight text-ink">{ticket.reference}</span>
                    <span className="mt-2 block" style={{ color: fill(band) }}>
                      <Barcode code={ticket.reference} />
                    </span>
                  </span>
                  {prio && !closed && (
                    <SolidChip hue={PRIORITY_HUE[ticket.priority] ?? 'slate'} icon={prio.icon} size="lg">
                      {prio.label}
                    </SolidChip>
                  )}
                </span>
                <span className="grid grid-cols-2 gap-x-4">
                  <span className="block min-w-0">
                    <span className={LABEL}>Customer</span>
                    <span className="mt-1.5 flex min-w-0 items-center gap-2">
                      <Avatar name={ticket.requester.name} size="sm" />
                      <span className="block min-w-0 truncate text-sm font-semibold text-ink">{ticket.requester.name}</span>
                    </span>
                  </span>
                  <span className="block min-w-0">
                    <span className={LABEL}>Owner</span>
                    <span className="mt-1.5 flex min-w-0 items-center gap-2 text-sm font-semibold text-ink">
                      {ticket.assigned_to ? (
                        <>
                          <Avatar name={ticket.assigned_to.full_name} size="sm" />
                          <span className={cn('truncate', mine && 'text-violet')}>{mine ? 'You' : ticket.assigned_to.full_name}</span>
                        </>
                      ) : (
                        <>
                          <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-md border border-dashed border-line-strong text-[10px] text-ink-3">
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

        {isMessage && attn && <NewMessageBadge label={attn.label} className="pointer-events-none absolute -top-4 left-12 z-10 sm:left-14" />}
        <span className="pointer-events-none absolute -top-4 right-6 z-10 flex items-center gap-2 lg:right-[calc(var(--stub-w)+1.5rem)]">
          {attn && AttnIcon && !isMessage && (
            <SolidChip hue={TONE_HUE[attn.tone]} icon={AttnIcon} size="lg" className={cn('shadow-sm', attn.working && '[&>svg]:animate-spin motion-reduce:[&>svg]:animate-none')}>
              {attn.label}
            </SolidChip>
          )}
        </span>
        <SelectBox checked={checked} onChange={() => onToggle(ticket.id)} label={`Select ${ticket.reference}`} className="absolute top-1/2 -left-3.5 z-10 -translate-y-1/2" />
      </div>
    </li>
  )
})

export function TicketCardSkeleton() {
  return (
    <div className="overflow-hidden border border-line bg-surface" aria-hidden>
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
