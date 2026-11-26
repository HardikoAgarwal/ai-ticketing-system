import { CheckCheck, CornerDownLeft, Inbox, MessageSquare, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { EmptyState, ErrorState, Panel, PanelHeader, SkeletonRows } from '@/components/ds'
import { relativeTime } from '@/lib/format'
import type { AppNotification, NotificationFeed, NotificationKind } from '@/lib/types'

const KIND: Record<NotificationKind, { icon: LucideIcon; tone: string; verb: (n: AppNotification) => string }> = {
  requester_reply: { icon: MessageSquare, tone: 'bg-sky text-sky-ink', verb: (n) => `${n.actor_name} replied` },
  new_ticket: { icon: Inbox, tone: 'bg-lav text-lav-ink', verb: (n) => `${n.actor_name} opened a ticket` },
  staff_reply: { icon: CornerDownLeft, tone: 'bg-mint text-mint-ink', verb: (n) => `${n.actor_name} replied to the customer` },
  resolved: { icon: CheckCheck, tone: 'bg-mint text-mint-ink', verb: (n) => `${n.actor_name} resolved it` },
}

/** Latest things that happened across tickets, newest first. Each row opens the ticket. */
export function ActivityFeed({ feed, loading, error, onRetry, slug }: { feed?: NotificationFeed; loading: boolean; error?: unknown; onRetry: () => void; slug: string }) {
  const items = (feed?.items ?? []).slice(0, 6)
  return (
    <Panel aria-labelledby="home-activity">
      <PanelHeader title={<span id="home-activity">Recent activity</span>} description="Replies, new tickets and resolutions as they happen." />
      {error ? (
        <div className="p-5">
          <ErrorState error={error} onRetry={onRetry} />
        </div>
      ) : loading ? (
        <div className="p-5" role="status" aria-label="Loading activity">
          <SkeletonRows rows={5} />
        </div>
      ) : !items.length ? (
        <EmptyState icon={MessageSquare} title="Nothing yet" description="Activity appears here as customers write in and your team replies." className="border-0" />
      ) : (
        <ol className="divide-y divide-line">
          {items.map((n) => {
            const k = KIND[n.kind] ?? KIND.requester_reply
            return (
              <li key={n.id}>
                <Link to={`/w/${slug}/agent/tickets/${n.ticket_id}`} className="flex gap-3 px-5 py-3 transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none focus-visible:ring-inset">
                  <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-control ${k.tone}`}>
                    <k.icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{n.subject}</span>
                    <span className="mt-0.5 block text-xs text-ink-3">
                      {k.verb(n)} · <time>{relativeTime(n.at)}</time>
                    </span>
                    {n.preview && <span className="mt-1 line-clamp-1 text-[13px] text-ink-2">{n.preview}</span>}
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </Panel>
  )
}
