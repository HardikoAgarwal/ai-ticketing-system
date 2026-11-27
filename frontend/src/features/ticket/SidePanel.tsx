import { ChevronRight, CopyCheck, History } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Avatar, Chip, ErrorState, SkeletonRows, SolidChip, TabPanel, Tabs } from '@/components/ds'
import { STATUS_CHIP, STATUS_HUE } from '@/features/inbox/model'
import type { StaffTicketDetail } from '@/lib/types'
import { cn } from '@/lib/utils'

import { CustomerMood, FACT_LABEL, ResponseClock, TicketFields, Fact, type FieldsProps } from './TicketFields'
import { Timeline } from './Timeline'
import type { TicketState } from './use-ticket'

export type SideTab = 'timeline' | 'similar'
const TABS = 'ticket-side'

/**
 * What sits beside the conversation: the ticket's timeline and tickets that look like this one, one tab each. Team notes live in the
 * conversation's Notes tab. On small screens it opens as a drawer and also carries the editable fields and the customer, which the short
 * header has no room for.
 */
export function SidePanel({ ticket, t, tab, onTab, inDrawer = false, fields, onCustomer }: {
  ticket: StaffTicketDetail
  t: TicketState
  tab: SideTab
  onTab: (tab: SideTab) => void
  /** Inside the drawer: the whole drawer scrolls, and the fields and the customer are listed first. */
  inDrawer?: boolean
  fields: FieldsProps
  onCustomer: () => void
}) {
  const similar = t.similar.data ?? []
  const rp = ticket.requester_profile
  const panel = cn('px-5 pt-5', inDrawer ? 'pb-6' : 'scroll-quiet min-h-0 flex-1 overflow-y-auto pb-16')

  return (
    <div className={cn('flex flex-col', !inDrawer && 'h-full min-h-0')}>
      {inDrawer && (
        <div className="space-y-4 border-b border-line px-4 pb-5">
          <button type="button" onClick={onCustomer} aria-haspopup="dialog" className="flex w-full min-w-0 items-center gap-3 rounded-control border border-line bg-surface-2 p-3 text-left transition-colors hover:bg-sunken focus-visible:outline-2 focus-visible:outline-violet">
            <Avatar name={rp.name} size="lg" />
            <span className="min-w-0 flex-1">
              <span className={cn(FACT_LABEL, 'block')}>Customer</span>
              <span className="block truncate text-[15px] leading-5 font-semibold text-ink">{rp.name}</span>
              <span className="block truncate text-[13px] leading-5 text-ink-2">{rp.company ? `${rp.company} · ` : ''}{rp.tickets_count} {rp.tickets_count === 1 ? 'ticket' : 'tickets'}</span>
              <CustomerMood ticket={ticket} className="mt-1.5" />
            </span>
            <ChevronRight className="size-4 shrink-0 text-ink-3" aria-hidden />
          </button>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-4">
            <TicketFields ticket={ticket} {...fields} />
            <Fact label="First response" className="col-span-2"><ResponseClock ticket={ticket} /></Fact>
          </dl>
        </div>
      )}

      <Tabs<SideTab>
        idPrefix={TABS}
        ariaLabel="More about this ticket"
        value={tab}
        onChange={onTab}
        className="shrink-0 px-3 pt-1"
        items={[
          { value: 'timeline', label: 'Timeline', icon: History },
          { value: 'similar', label: 'Similar', icon: CopyCheck, count: similar.length },
        ]}
      />

      <TabPanel idPrefix={TABS} value="timeline" current={tab} className={panel}>
        <Timeline ticket={ticket} />
      </TabPanel>

      <TabPanel idPrefix={TABS} value="similar" current={tab} className={panel}>
        {t.similar.isLoading ? (
          <SkeletonRows rows={2} />
        ) : t.similar.isError ? (
          <ErrorState error={t.similar.error} title="Couldn't look for similar tickets" onRetry={() => t.similar.refetch()} />
        ) : similar.length === 0 ? (
          <p className="text-[13px] leading-relaxed text-ink-3">Nothing similar, so this is probably not a duplicate.</p>
        ) : (
          <>
            <p className="mb-3 text-[13px] leading-relaxed text-ink-3">Tickets the AI found close to this one. A high match usually means a duplicate or a known issue.</p>
            <ul className="space-y-2">
              {similar.map((s) => (
                <li key={s.id}>
                  <Link to={`/w/${t.slug}/agent/tickets/${s.id}`} className="block rounded-control border border-line bg-surface p-3 text-sm transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-violet">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-ink-2">{s.reference}</span>
                      <span className="flex items-center gap-1.5">
                        <SolidChip hue={STATUS_HUE[s.status]} icon={STATUS_CHIP[s.status].icon} size="sm">{STATUS_CHIP[s.status].label}</SolidChip>
                        <Chip tone="ai" size="sm">{Math.round(s.similarity * 100)}% match</Chip>
                      </span>
                    </span>
                    <span className="mt-1.5 line-clamp-2 block font-medium [overflow-wrap:anywhere] text-ink">{s.subject}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </TabPanel>

    </div>
  )
}
