import { forwardRef, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'

import { RelativeTime } from '@/components/common'
import { Avatar, CHIP_TONES, fill, SolidChip, type Hue } from '@/components/ds'
import { cn } from '@/lib/utils'

import { attentionTabs, PRIORITY_HUE, PRIORITY_LOOK, STATUS_CHIP, STATUS_HUE } from './model'
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
  const tabs = attentionTabs(ticket)
  const status = STATUS_CHIP[ticket.status]
  const prio = PRIORITY_LOOK[ticket.priority]
  const band = closed ? STATUS_HUE[ticket.status] : (PRIORITY_HUE[ticket.priority] ?? 'slate')
  const mine = !!meId && ticket.assigned_to?.id === meId
  const stub: CSSProperties = { background: `color-mix(in srgb, ${fill(band)} 24%, var(--surface))`, borderColor: `color-mix(in srgb, ${fill(band)} 65%, transparent)` }
  const main: CSSProperties | undefined = checked ? { background: 'color-mix(in srgb, var(--violet) 7%, var(--surface))' } : undefined
  return (
    <li ref={ref} data-ticket-id={ticket.id} className={cn('group relative', tabs.length > 0 && 'mt-10')}>
      <div className={cn('relative rounded-panel [--stub-w:23rem]', cursor && 'ring-2 ring-ink ring-offset-2 ring-offset-canvas', fresh && 'ring-2 ring-ai ring-offset-2 ring-offset-canvas motion-safe:animate-pulse')}>
        <div className="drop-shadow-[0_1px_2px_rgb(60_40_20/0.10)] drop-shadow-[0_14px_22px_rgb(60_40_20/0.10)]">
          <article className={cn('ticket-notch overflow-hidden rounded-panel bg-surface')}>
            <Link to={to} aria-label={`${ticket.reference}: ${ticket.subject}`} className="grid outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-inset lg:grid-cols-[minmax(0,1fr)_var(--stub-w)]">
              <span className="flex min-w-0 flex-col gap-4 p-5 pt-6 pl-9 sm:pl-10" style={main}>
                <span className="block">
                  <span className={cn('line-clamp-2 block text-[22px] leading-7 tracking-tight text-ink', ticket.has_unread ? 'font-bold' : 'font-semibold')}>
                    {ticket.subject}
                  </span>
                  <span className="mt-1.5 line-clamp-2 block max-w-[68ch] text-[15px] leading-6 text-ink-2">{ticket.description}</span>
                </span>
                <span className="mt-auto grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-4 sm:grid-cols-4">
                  <span className="block">
                    <span className={LABEL}>Status</span>
                    <span className="mt-1.5 block">
                      <SolidChip hue={STATUS_HUE[ticket.status]} icon={status.icon}>{status.label}</SolidChip>
                    </span>
                  </span>
                  <span className="block min-w-0">
                    <span className={LABEL}>Category</span>
                    <span className="mt-1.5 block truncate text-[15px] leading-7 font-semibold text-ink">{ticket.category?.name ?? '—'}</span>
                  </span>
                  <span className="block">
                    <span className={LABEL}>Opened</span>
                    <span className="mt-1.5 block text-[15px] leading-7 font-semibold text-ink">
                      <RelativeTime value={ticket.created_at} />
                    </span>
                  </span>
                  <span className="block">
                    <span className={LABEL}>Updated</span>
                    <span className="mt-1.5 block text-[15px] leading-7 font-semibold text-ink">
                      <RelativeTime value={ticket.updated_at} />
                    </span>
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
                <span className="grid grid-cols-2 gap-x-3">
                  <span className="block min-w-0">
                    <span className={LABEL}>Customer</span>
                    <span className="mt-1.5 flex min-w-0 items-center gap-2">
                      <Avatar name={ticket.requester.name} size="md" />
                      <span className="block min-w-0 truncate text-[15px] font-semibold text-ink">{ticket.requester.name}</span>
                    </span>
                  </span>
                  <span className="block min-w-0">
                    <span className={LABEL}>Owner</span>
                    <span className="mt-1.5 flex min-w-0 items-center gap-2 text-[15px] font-semibold text-ink">
                      {ticket.assigned_to ? (
                        <>
                          <Avatar name={ticket.assigned_to.full_name} size="md" />
                          <span className={cn('truncate', mine && 'text-violet')}>{mine ? 'You' : ticket.assigned_to.full_name}</span>
                        </>
                      ) : (
                        <>
                          <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-control border border-dashed border-line-strong text-xs text-ink-3">
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

        {tabs.length > 0 && (
          <span className="absolute bottom-full left-8 z-0 flex items-end gap-1.5">
            {tabs.map((t) => (
              <span key={t.kind} className={cn('inline-flex h-9 items-center gap-2 rounded-t-xl border border-b-0 px-4 text-sm font-semibold whitespace-nowrap', CHIP_TONES[t.tone])}>
                <t.icon className={cn('size-4', t.working && 'animate-spin motion-reduce:animate-none')} aria-hidden />
                {t.label}
              </span>
            ))}
          </span>
        )}
        <SelectBox checked={checked} onChange={() => onToggle(ticket.id)} label={`Select ${ticket.reference}`} className="absolute top-1/2 -left-3.5 z-10 -translate-y-1/2" />
      </div>
    </li>
  )
})

const tint = (hue: Hue, pct: number) => `color-mix(in srgb, ${fill(hue)} ${pct}%, var(--surface))`

/** A card-shaped placeholder: attention tab, title and text lines, the facts row, and a tinted stub, all softly shimmering. */
export function TicketCardSkeleton({ hue = 'slate' }: { hue?: Hue }) {
  const bar = 'sk rounded-md bg-sunken'
  return (
    <div className="relative mt-10" aria-hidden>
      <span className="absolute bottom-full left-8 h-9 w-32 rounded-t-xl sk" style={{ background: tint(hue, 22) }} />
      <div className="overflow-hidden rounded-panel bg-surface shadow-card">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="flex flex-col gap-4 p-5 pt-6 pl-9 sm:pl-10">
            <div className="space-y-2.5">
              <div className={`${bar} h-6 w-3/5`} />
              <div className={`${bar} h-4 w-11/12`} />
              <div className={`${bar} h-4 w-2/3`} />
            </div>
            <div className="mt-2 grid grid-cols-4 gap-6 border-t border-line pt-4">
              {[28, 20, 16, 16].map((w, i) => (
                <div key={i} className="space-y-2">
                  <div className={`${bar} h-2.5 w-12`} />
                  <div className={`${bar} h-5`} style={{ width: `${w * 3}px`, maxWidth: '100%' }} />
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-between gap-5 p-5 sk" style={{ background: tint(hue, 22) }}>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-2.5 w-12 rounded-md" style={{ background: tint(hue, 38) }} />
                <div className="h-6 w-28 rounded-md" style={{ background: tint(hue, 38) }} />
                <div className="h-7 w-24 rounded-md" style={{ background: tint(hue, 30) }} />
              </div>
              <div className="h-8 w-20 rounded-chip" style={{ background: tint(hue, 48) }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[0, 1].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-2.5 w-14 rounded-md" style={{ background: tint(hue, 38) }} />
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-control" style={{ background: tint(hue, 44) }} />
                    <div className="h-4 w-16 rounded-md" style={{ background: tint(hue, 38) }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
