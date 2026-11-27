import { formatDistanceStrict, parseISO } from 'date-fns'
import { ArrowRight, CheckCheck, Clock, Hourglass, MessageSquare, Star, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { RelativeTime } from '@/components/common'
import { Chip, fill, on, type Hue } from '@/components/ds'
import { PRIORITY_META, STATUS_META } from '@/lib/constants'
import { relativeTime } from '@/lib/format'
import type { StaffTicketDetail, TicketPriority, TicketStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

import { activityLook, isOpenStatus, PRIORITY_TONE, slaView, STATUS_TONE, waitingOnUs } from './ticket-ui'

const took = (from: string, to: string) => formatDistanceStrict(parseISO(to), parseISO(from))

function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-control border border-line bg-surface-2 px-3 py-2.5">
      <dt className="truncate text-[11px] font-medium text-ink-3">{label}</dt>
      <dd className="mt-0.5 truncate text-[13px] font-semibold text-ink tabular-nums">{children}</dd>
    </div>
  )
}

const byLabel = <K extends string>(meta: Record<K, { label: string }>) =>
  Object.fromEntries(Object.entries<{ label: string }>(meta).map(([k, v]) => [v.label.toLowerCase(), k])) as Record<string, K | undefined>
const STATUS_BY_LABEL = byLabel<TicketStatus>(STATUS_META)
const PRIORITY_BY_LABEL = byLabel<TicketPriority>(PRIORITY_META)

/** One side of a change. Status and priority values become their coloured badge; anything else stays plain text. */
function StepValue({ action, value, faded }: { action: string; value: string; faded?: boolean }) {
  const status = action === 'STATUS_CHANGED' ? STATUS_BY_LABEL[value.toLowerCase()] : undefined
  const priority = action === 'PRIORITY_CHANGED' ? PRIORITY_BY_LABEL[value.toLowerCase()] : undefined
  const cls = faded ? 'opacity-60' : undefined
  if (status) return <Chip tone={STATUS_TONE[status]} icon={STATUS_META[status].icon} size="sm" className={cls}>{STATUS_META[status].label}</Chip>
  if (priority) return <Chip tone={PRIORITY_TONE[priority]} icon={PRIORITY_META[priority].icon} size="sm" className={cls}>{PRIORITY_META[priority].label}</Chip>
  return <span className={faded ? 'text-ink-3 line-through decoration-line-strong' : 'font-medium text-ink'}>{value}</span>
}

/** What the ticket is waiting on right now: drawn as a hollow step at the top of the timeline. */
function waitingFor(ticket: StaffTicketDetail): { icon: LucideIcon; hue: Hue; title: string; detail?: string } | null {
  const sla = slaView(ticket)
  if (ticket.status === 'CLOSED') return null
  if (ticket.status === 'RESOLVED') return { icon: CheckCheck, hue: 'mint', title: 'Waiting for the customer to confirm' }
  if (sla.waiting) return { icon: Clock, hue: ticket.sla_state === 'overdue' ? 'rose' : ticket.sla_state === 'at_risk' ? 'butter' : 'slate', title: 'First response due', detail: sla.text }
  if (waitingOnUs(ticket)) return { icon: MessageSquare, hue: 'sky', title: 'Waiting for your reply' }
  return { icon: Hourglass, hue: 'slate', title: 'Waiting for the customer' }
}

/**
 * The ticket's life in order, newest first: three figures up top (how old it is, how fast the first reply was, how long it took to resolve),
 * the customer's rating when there is one, what the ticket is waiting on now, then every recorded step with who did it and when.
 */
export function Timeline({ ticket }: { ticket: StaffTicketDetail }) {
  const steps = [...ticket.activities].reverse()
  const waiting = waitingFor(ticket)
  const open = isOpenStatus(ticket.status)

  return (
    <div>
      <dl className="grid grid-cols-3 gap-2.5">
        <Figure label="Opened">{relativeTime(ticket.created_at)}</Figure>
        <Figure label="First reply in">{ticket.first_response_at ? took(ticket.created_at, ticket.first_response_at) : open ? 'Waiting' : '—'}</Figure>
        <Figure label="Resolved in">{ticket.resolved_at ? took(ticket.created_at, ticket.resolved_at) : 'Not yet'}</Figure>
      </dl>

      {ticket.csat_score ? (
        <div className="mt-3 rounded-control border border-butter-line bg-butter px-3 py-2.5 text-butter-ink">
          <p className="flex items-center gap-2 text-[13px] font-semibold">
            <span className="flex items-center gap-0.5" aria-hidden>
              {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn('size-3.5', n <= ticket.csat_score! ? 'fill-current' : 'opacity-35')} />)}
            </span>
            Rated {ticket.csat_score} out of 5
          </p>
          {ticket.csat_comment && <p className="mt-1 text-[13px] leading-relaxed [overflow-wrap:anywhere]">“{ticket.csat_comment}”</p>}
        </div>
      ) : null}

      <ol className="mt-7">
        {waiting && (
          <li className="relative flex gap-3.5 pb-6">
            {steps.length > 0 && <span aria-hidden className="absolute top-9 bottom-1 left-[15px] w-px border-l border-dashed border-line-strong" />}
            <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-control border border-dashed bg-surface" style={{ borderColor: fill(waiting.hue), color: fill(waiting.hue) }}>
              <waiting.icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-[13px] leading-5 font-semibold text-ink">{waiting.title}</p>
              <p className="text-xs text-ink-3">{waiting.detail ?? 'Now'}</p>
            </div>
          </li>
        )}
        {steps.map((a, i) => {
          const look = activityLook(a.action)
          const last = i === steps.length - 1
          return (
            <li key={a.id} className={cn('relative flex gap-3.5', !last && 'pb-6')}>
              {!last && <span aria-hidden className="absolute top-9 bottom-1 left-[15px] w-px bg-line-strong" />}
              <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-control" style={{ background: fill(look.hue), color: on(look.hue) }}>
                <look.icon className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1 pt-1">
                <p className="text-[13px] leading-5 font-semibold [overflow-wrap:anywhere] text-ink">{a.label}</p>
                {(a.from_value || a.to_value) && (
                  <div className="mt-1 mb-0.5 flex flex-wrap items-center gap-1.5 text-[13px] leading-5 [overflow-wrap:anywhere] text-ink-2">
                    {a.from_value && (
                      <>
                        <StepValue action={a.action} value={a.from_value} faded />
                        <ArrowRight className="size-3.5 shrink-0 text-ink-3" aria-hidden /><span className="sr-only">changed to</span>
                      </>
                    )}
                    {a.to_value && <StepValue action={a.action} value={a.to_value} />}
                  </div>
                )}
                <p className="text-xs text-ink-3">{a.actor_name ?? 'System'} · <RelativeTime value={a.created_at} /></p>
              </div>
            </li>
          )
        })}
        {steps.length === 0 && !waiting && <li className="text-[13px] text-ink-3">Assignments, status changes and AI triage will appear here.</li>}
      </ol>
    </div>
  )
}
