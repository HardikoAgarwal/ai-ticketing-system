import { Hourglass, Users } from 'lucide-react'
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { Avatar, ErrorState, Panel, PanelHeader, Skeleton } from '@/components/ds'
import type { Paginated, StaffTicket } from '@/lib/types'

import { BarRows } from './bars'
import { AXIS, SOLID, TOOLTIP, type Hue } from './chart-tokens'
import { AGING_BUCKETS, agingOf, type WorkloadRow } from './useHomeData'

const AGING_HUE: Record<string, Hue> = { green: 'mint', blue: 'sky', amber: 'butter', red: 'rose' }

function Frame({ id, title, description, icon, loading, error, onRetry, className, children }: { id: string; title: string; description: string; icon: typeof Users; loading: boolean; error?: unknown; onRetry: () => void; className?: string; children: React.ReactNode }) {
  return (
    <Panel aria-labelledby={id} className={className}>
      <PanelHeader title={<span id={id}>{title}</span>} description={description} icon={icon} divided={false} className="pb-2" />
      <div className="px-5 pb-5">{error ? <ErrorState error={error} onRetry={onRetry} /> : loading ? <Skeleton className="h-64" /> : children}</div>
    </Panel>
  )
}

/** How long open tickets have been waiting, as columns. A tall column on the right is the thing to act on. */
export function TicketAging({ data, loading, error, onRetry, className }: { data?: Paginated<StaffTicket>; loading: boolean; error?: unknown; onRetry: () => void; className?: string }) {
  const tickets = data?.results ?? []
  const aging = agingOf(tickets)
  const rows = AGING_BUCKETS.map((b) => ({ key: b.key, label: b.label, value: aging[b.key], hue: AGING_HUE[b.tone] }))
  const sampled = data && data.count > data.results.length
  return (
    <Frame id="home-aging" title="How long tickets have waited" description="Age of every open ticket, from the day it arrived." icon={Hourglass} loading={loading} error={error} onRetry={onRetry} className={className}>
      {!tickets.length ? (
        <p className="flex h-60 items-center justify-center rounded-control border border-dashed border-line-strong bg-surface-2 text-sm text-ink-3">No open tickets. Nothing is waiting.</p>
      ) : (
        <>
          <div role="img" aria-label={`Open ticket age: ${rows.map((r) => `${r.value} ${r.label}`).join(', ')}`}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={rows} margin={{ top: 28, right: 8, left: 8, bottom: 0 }}>
                <XAxis dataKey="label" {...AXIS} tickMargin={10} />
                <YAxis hide domain={[0, 'dataMax']} />
                <Tooltip {...TOOLTIP} />
                <Bar dataKey="value" name="Open tickets" radius={[10, 10, 4, 4]} maxBarSize={96} isAnimationActive={false} minPointSize={6}>
                  {rows.map((r) => (
                    <Cell key={r.key} fill={SOLID[r.hue]} />
                  ))}
                  <LabelList dataKey="value" position="top" offset={8} style={{ fill: 'var(--ink)', fontSize: 16, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {sampled && <p className="mt-2 text-xs text-ink-3">Based on the {data.results.length} most urgent of {data.count} open tickets.</p>}
        </>
      )}
    </Frame>
  )
}

/** Open tickets per person. "Unassigned" is always first so a pile-up with no owner stands out. */
export function Workload({ rows, loading, error, onRetry, inbox, className }: { rows: WorkloadRow[]; loading: boolean; error?: unknown; onRetry: () => void; inbox: (qs: string) => string; className?: string }) {
  return (
    <Frame id="home-workload" title="Workload by owner" description="Open tickets per person right now. Select a row to open that list." icon={Users} loading={loading} error={error} onRetry={onRetry} className={className}>
      <BarRows
        rowHeight={48}
        items={rows.map((r) => ({
          key: String(r.id ?? 'none'),
          label: r.name,
          value: r.count,
          hue: r.id === null ? 'butter' : 'mint',
          lead: r.id === null ? <span aria-hidden className="flex size-6 items-center justify-center rounded-md border border-dashed border-line-strong text-[10px] text-ink-3">?</span> : <Avatar name={r.name} size="sm" />,
          note: r.overdue ? <span className="text-rose-ink">{r.overdue} overdue</span> : undefined,
          to: inbox(`view=${r.id === null ? 'unassigned' : 'all'}&status=OPEN,IN_PROGRESS${r.id === null ? '' : `&assigned=${r.id}`}`),
        }))}
      />
    </Frame>
  )
}
