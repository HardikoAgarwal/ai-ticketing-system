import { ArrowRight, PartyPopper, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Avatar, Chip, EmptyState, ErrorState, Panel, PanelHeader, ProgressRing, SkeletonRows } from '@/components/ds'
import { attentionOf, PRIORITY_LOOK } from '@/features/inbox/model'
import { relativeTime } from '@/lib/format'
import type { Analytics, QueueStats, StaffTicket } from '@/lib/types'
import { cn } from '@/lib/utils'

/** The five tickets to look at first. The API already returns open tickets most-urgent first, so we just take the top of that. */
export function NeedsAttention({ tickets, loading, error, onRetry, slug, inbox }: {
  tickets?: StaffTicket[]
  loading: boolean
  error?: unknown
  onRetry: () => void
  slug: string
  inbox: (qs: string) => string
}) {
  const top = (tickets ?? []).filter((t) => attentionOf(t) || t.priority === 'CRITICAL' || t.priority === 'HIGH').slice(0, 5)
  const rows = top.length ? top : (tickets ?? []).slice(0, 5)
  return (
    <Panel aria-labelledby="home-attention">
      <PanelHeader
        title={<span id="home-attention">Needs attention now</span>}
        description="Most urgent first. Open one to reply."
        actions={
          <Link to={inbox('view=attention')} className="inline-flex items-center gap-1 rounded-chip px-1 text-[13px] font-medium text-violet hover:underline focus-visible:ring-2 focus-visible:ring-violet/40 focus-visible:outline-none">
            All open tickets <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        }
      />
      {error ? (
        <div className="p-5">
          <ErrorState error={error} onRetry={onRetry} />
        </div>
      ) : loading ? (
        <div className="p-5" role="status" aria-label="Loading tickets">
          <SkeletonRows rows={5} />
        </div>
      ) : !rows.length ? (
        <EmptyState icon={PartyPopper} title="Nothing needs you right now" description="No open tickets. New ones will show up here the moment they arrive." className="border-0" />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((t) => {
            const att = attentionOf(t)
            const pr = PRIORITY_LOOK[t.priority]
            return (
              <li key={t.id}>
                <Link
                  to={`/w/${slug}/agent/tickets/${t.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none focus-visible:ring-inset"
                >
                  <Avatar name={t.requester.name} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      {t.has_unread && <span className="size-2 shrink-0 rounded-full bg-violet" aria-label="Unread" />}
                      <span className={cn('truncate text-sm text-ink', t.has_unread ? 'font-semibold' : 'font-medium')}>{t.subject}</span>
                    </span>
                    <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-ink-3">
                      {t.ai_summary && <Sparkles className="size-3 shrink-0 text-ai" aria-label="AI summary" />}
                      <span className="truncate">{t.ai_summary || `${t.requester.name} · ${t.reference}`}</span>
                    </span>
                  </span>
                  <span className="hidden shrink-0 items-center gap-2 sm:flex">
                    {att && (
                      <Chip tone={att.tone} icon={att.icon} size="sm">
                        {att.label}
                      </Chip>
                    )}
                    {pr && (t.priority === 'CRITICAL' || t.priority === 'HIGH') && (
                      <Chip tone={t.priority === 'CRITICAL' ? 'red' : 'peach'} icon={pr.icon} size="sm">
                        {pr.label}
                      </Chip>
                    )}
                  </span>
                  <span className="hidden w-20 shrink-0 text-right text-xs text-ink-3 md:block">{relativeTime(t.created_at)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

/** Are we answering people in time? The ring is the share of first replies that met the target, plus what is due soon and overdue now. */
export function SlaHealth({ analytics, stats, open, inbox }: { analytics?: Analytics; stats?: QueueStats; open?: StaffTicket[]; inbox: (qs: string) => string }) {
  const sla = analytics?.sla
  const total = sla ? sla.met + sla.breached + sla.overdue : 0
  const onTime = sla && total ? sla.met / total : null
  const dueSoon = open ? open.filter((t) => t.sla_state === 'at_risk').length : undefined
  return (
    <Panel aria-labelledby="home-sla">
      <PanelHeader title={<span id="home-sla">Response-time health</span>} description="First replies against your response targets." icon={ShieldCheck} />
      <div className="flex flex-col items-center gap-5 p-5 sm:flex-row lg:flex-col xl:flex-row">
        <ProgressRing
          value={(onTime ?? 0) * 100}
          size={112}
          stroke={10}
          tone={onTime === null ? 'ink' : onTime >= 0.9 ? 'green' : onTime >= 0.7 ? 'amber' : 'red'}
          label={onTime === null ? 'On-time rate: no replies yet' : `On-time rate: ${Math.round(onTime * 100)} percent`}
        >
          <span className="text-xl font-semibold">{onTime === null ? '—' : `${Math.round(onTime * 100)}%`}</span>
        </ProgressRing>
        <dl className="w-full space-y-2.5 text-sm">
          <Row label="Answered on time" value={sla?.met} tone="text-mint-ink" />
          <Row label="Answered late" value={sla?.breached} tone="text-butter-ink" />
          <Row label="Overdue right now" value={stats?.overdue} tone="text-rose-ink" to={inbox('view=attention&sla=overdue')} />
          <Row label="Due soon" value={dueSoon} tone="text-peach-ink" to={inbox('view=attention&sla=at_risk')} />
        </dl>
      </div>
      {onTime === null && <p className="px-5 pb-5 text-[13px] text-ink-3">No first replies in this period yet, so there is no rate to show.</p>}
    </Panel>
  )
}

function Row({ label, value, tone, to }: { label: string; value?: number; tone: string; to?: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <dt className="flex items-center gap-2 text-ink-2">
        <span className={cn('size-2 rounded-full bg-current', tone)} aria-hidden />
        {label}
      </dt>
      <dd className="font-semibold text-ink tabular-nums">
        {to && value ? (
          <Link to={to} className="rounded-chip px-1.5 py-0.5 text-violet underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none">
            {value}
            <span className="sr-only"> (view tickets)</span>
          </Link>
        ) : (
          (value ?? '–')
        )}
      </dd>
    </div>
  )
}
