import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'

import { RelativeTime } from '@/components/common'
import { fill, on, SolidChip } from '@/components/ds'
import { Barcode } from '@/features/inbox/TicketCard'
import { portalBadges, REQUESTER_HUE } from '@/features/portal/model'
import { REQUESTER_STATUS } from '@/features/portal/status-meta'
import type { RequesterTicket } from '@/lib/types'
import { cn } from '@/lib/utils'

const LABEL = 'text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase'

/**
 * A request drawn like the agent's ticket card, trimmed for the customer. Main part: the subject and their own words, then
 * status, what it is about, and the times. Stub (tinted by status, behind a dashed perforation with notches): the reference
 * with its barcode and the line that says what happens next. What needs their eye hangs off the top edge as solid badges.
 */
export function TicketCard({ ticket, slug }: { ticket: RequesterTicket; slug: string }) {
  const meta = REQUESTER_STATUS[ticket.status]
  const hue = REQUESTER_HUE[ticket.status]
  const badges = portalBadges(ticket)
  const stub: CSSProperties = { background: `color-mix(in srgb, ${fill(hue)} 22%, var(--surface))`, borderColor: `color-mix(in srgb, ${fill(hue)} 60%, transparent)` }
  return (
    <li className={cn('relative', badges.length > 0 && 'mt-9')}>
      {badges.length > 0 && (
        <span className="absolute bottom-full left-6 z-0 flex items-end gap-1.5 sm:left-8">
          {badges.map((b) => (
            <span
              key={b.kind}
              className="inline-flex h-8 items-center gap-1.5 rounded-t-xl px-3 text-[13px] font-semibold whitespace-nowrap"
              style={{ background: fill(b.hue), color: on(b.hue) }}
            >
              <b.icon className="size-3.5" aria-hidden />
              {b.label}
            </span>
          ))}
        </span>
      )}
      <div className="relative z-10 drop-shadow-[0_1px_2px_rgb(60_40_20/0.10)] drop-shadow-[0_12px_20px_rgb(60_40_20/0.09)]">
        <article className="ticket-notch overflow-hidden rounded-panel bg-surface [--stub-w:17rem]">
          <Link
            to={`/w/${slug}/help/tickets/${ticket.id}`}
            aria-label={`${ticket.reference}: ${ticket.subject}${badges.length ? `. ${badges.map((b) => b.label).join(', ')}` : ''}`}
            className="group grid outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-inset lg:grid-cols-[minmax(0,1fr)_var(--stub-w)]"
          >
            <span className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
              <span className="block">
                <span className={cn('line-clamp-2 block text-xl leading-7 tracking-tight text-ink transition-colors group-hover:text-brand', ticket.has_unread ? 'font-bold' : 'font-semibold')}>
                  {ticket.subject}
                </span>
                <span className="mt-1.5 line-clamp-2 block max-w-[68ch] text-[15px] leading-6 text-ink-2">{ticket.description}</span>
              </span>
              <span className="mt-auto grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-4 sm:grid-cols-4">
                <span className="block">
                  <span className={LABEL}>Status</span>
                  <span className="mt-1.5 block">
                    <SolidChip hue={hue} icon={meta.icon}>
                      {meta.label}
                    </SolidChip>
                  </span>
                </span>
                <span className="block min-w-0">
                  <span className={LABEL}>About</span>
                  <span className="mt-1.5 block truncate text-[15px] leading-7 font-semibold text-ink">{ticket.record ? ticket.record.title : 'General question'}</span>
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

            <span className="flex flex-col justify-between gap-4 border-t-2 border-dashed p-5 sm:p-6 lg:border-t-0 lg:border-l-2" style={stub}>
              <span className="block">
                <span className={LABEL}>Request</span>
                <span className="block font-mono text-xl leading-6 font-bold tracking-tight text-ink">{ticket.reference}</span>
                <span className="mt-2 block" style={{ color: fill(hue) }}>
                  <Barcode code={ticket.reference} />
                </span>
              </span>
              <span className="block text-[13px] leading-5 font-medium text-ink-2">{ticket.has_unread ? 'Our team replied. Open it to read.' : meta.hint}</span>
            </span>
          </Link>
        </article>
      </div>
    </li>
  )
}

const tint = (pct: number) => `color-mix(in srgb, ${fill('sky')} ${pct}%, var(--surface))`

/** Card-shaped placeholder while requests load. */
export function TicketCardSkeleton() {
  const bar = 'sk rounded-md bg-sunken'
  return (
    <div className="overflow-hidden rounded-panel bg-surface shadow-card" aria-hidden>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="space-y-2.5">
            <div className={`${bar} h-6 w-3/5`} />
            <div className={`${bar} h-4 w-11/12`} />
            <div className={`${bar} h-4 w-2/3`} />
          </div>
          <div className="mt-2 grid grid-cols-4 gap-6 border-t border-line pt-4">
            {[28, 24, 16, 16].map((w, i) => (
              <div key={i} className="space-y-2">
                <div className={`${bar} h-2.5 w-12`} />
                <div className={`${bar} h-5`} style={{ width: `${w * 3}px`, maxWidth: '100%' }} />
              </div>
            ))}
          </div>
        </div>
        <div className="sk flex flex-col justify-between gap-5 p-5 sm:p-6" style={{ background: tint(18) }}>
          <div className="space-y-2">
            <div className="h-2.5 w-14 rounded-md" style={{ background: tint(34) }} />
            <div className="h-6 w-28 rounded-md" style={{ background: tint(34) }} />
            <div className="h-7 w-24 rounded-md" style={{ background: tint(28) }} />
          </div>
          <div className="h-4 w-40 rounded-md" style={{ background: tint(30) }} />
        </div>
      </div>
    </div>
  )
}
