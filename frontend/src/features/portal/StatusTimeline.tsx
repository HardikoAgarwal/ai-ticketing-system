import { Check, Circle } from 'lucide-react'

import { RelativeTime } from '@/components/common'
import type { RequesterTicketDetail } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Four-step progress for the customer: Sent → Team replied → Resolved → Confirmed. Text labels carry the state, colour only reinforces it. */
export function StatusTimeline({ ticket }: { ticket: RequesterTicketDetail }) {
  const closed = ticket.status === 'CLOSED'
  const steps = [
    { label: 'Sent', at: ticket.created_at, done: true },
    { label: 'Replied', at: ticket.first_response_at, done: !!ticket.first_response_at },
    { label: 'Resolved', at: ticket.resolved_at, done: !!ticket.resolved_at || closed },
    { label: 'Closed', at: closed ? ticket.updated_at : null, done: closed },
  ]
  const current = steps.findIndex((s) => !s.done)
  return (
    <ol aria-label="Request progress" className="grid grid-cols-4 gap-2">
      {steps.map((s, i) => (
        <li key={s.label} aria-current={i === current ? 'step' : undefined} className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full border',
                s.done ? 'border-mint-line bg-mint text-mint-ink' : i === current ? 'border-violet bg-lav text-violet' : 'border-line bg-surface-2 text-ink-3',
              )}
            >
              {s.done ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-2.5" aria-hidden />}
            </span>
            <span aria-hidden className={cn('h-px flex-1', i === steps.length - 1 ? 'bg-transparent' : s.done ? 'bg-mint-line' : 'bg-line')} />
          </div>
          <p className={cn('mt-1.5 truncate text-xs font-semibold', s.done || i === current ? 'text-ink' : 'text-ink-3')}>
            {s.label}
            <span className="sr-only">{s.done ? ' (done)' : i === current ? ' (next)' : ' (not yet)'}</span>
          </p>
          <p className="truncate text-[11px] text-ink-3">{s.at && s.done ? <RelativeTime value={s.at} /> : '—'}</p>
        </li>
      ))}
    </ol>
  )
}
