import { Check, CheckCircle2, Lock, MessageCircleReply, Send, type LucideIcon } from 'lucide-react'

import { RelativeTime } from '@/components/common'
import type { RequesterTicketDetail } from '@/lib/types'
import { cn } from '@/lib/utils'

type State = 'done' | 'next' | 'later'

const STATE: Record<State, string> = { done: 'Done', next: 'Up next', later: 'Not yet' }

/**
 * Four-step progress for the customer: Sent, Replied, Resolved, Closed. Nodes sit on one connected track that fills green
 * as steps complete, with a dashed stretch leading to the step that is next. Each step also says its state in words.
 */
export function StatusTimeline({ ticket }: { ticket: RequesterTicketDetail }) {
  const closed = ticket.status === 'CLOSED'
  const steps: { label: string; icon: LucideIcon; at: string | null; done: boolean }[] = [
    { label: 'Sent', icon: Send, at: ticket.created_at, done: true },
    { label: 'Replied', icon: MessageCircleReply, at: ticket.first_response_at, done: !!ticket.first_response_at },
    { label: 'Resolved', icon: CheckCircle2, at: ticket.resolved_at, done: !!ticket.resolved_at || closed },
    { label: 'Closed', icon: Lock, at: closed ? ticket.updated_at : null, done: closed },
  ]
  const next = steps.findIndex((s) => !s.done)
  const stateOf = (i: number): State => (steps[i].done ? 'done' : i === next ? 'next' : 'later')

  return (
    <ol aria-label="Request progress" className="grid grid-cols-4">
      {steps.map((s, i) => {
        const state = stateOf(i)
        const after = i < steps.length - 1 ? stateOf(i + 1) : null
        return (
          <li key={s.label} aria-current={state === 'next' ? 'step' : undefined} className="relative flex min-w-0 flex-col items-center px-1 text-center">
            {after && (
              <span
                aria-hidden
                className={cn(
                  'absolute top-[19px] right-[calc(-50%+26px)] left-[calc(50%+26px)] h-0 sm:top-[21px]',
                  after === 'done' && 'border-t-[3px] border-brand',
                  after === 'next' && 'border-t-[3px] border-dashed border-brand/50',
                  after === 'later' && 'border-t-2 border-line',
                )}
              />
            )}
            <span className="relative flex size-10 items-center justify-center sm:size-11">
              {state === 'next' && <span className="absolute inset-0 animate-ping rounded-full bg-brand/20 [animation-duration:2s] motion-reduce:hidden" aria-hidden />}
              <span
                className={cn(
                  'relative flex size-full items-center justify-center rounded-full',
                  state === 'done' && 'bg-brand text-on-brand shadow-[0_0_0_4px_var(--violet-soft)]',
                  state === 'next' && 'border-2 border-brand bg-surface text-brand shadow-[0_0_0_4px_var(--violet-soft)]',
                  state === 'later' && 'border border-line bg-surface-2 text-ink-3',
                )}
              >
                {state === 'done' ? <Check className="size-5" strokeWidth={2.75} aria-hidden /> : <s.icon className="size-[18px]" aria-hidden />}
              </span>
            </span>
            <span className={cn('mt-3 max-w-full truncate text-sm font-semibold', state === 'later' ? 'text-ink-3' : 'text-ink')}>{s.label}</span>
            <span
              className={cn(
                'mt-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-[0.04em] whitespace-nowrap uppercase sm:px-2 sm:tracking-[0.08em]',
                state === 'done' && 'bg-violet-soft text-brand',
                state === 'next' && 'border border-dashed border-brand/60 text-brand',
                state === 'later' && 'bg-sunken text-ink-3',
              )}
            >
              {STATE[state]}
            </span>
            <span className="mt-1 max-w-full truncate text-xs text-ink-3">{s.at && s.done ? <RelativeTime value={s.at} /> : state === 'next' ? 'Waiting' : '—'}</span>
          </li>
        )
      })}
    </ol>
  )
}
