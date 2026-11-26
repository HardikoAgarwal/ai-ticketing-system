import { differenceInHours, parseISO } from 'date-fns'
import { Hourglass } from 'lucide-react'
import { useMemo } from 'react'

import type { Paginated, StaffTicket } from '@/lib/types'

import { ChartPanel, Figure, PendingChart } from './chart-kit'
import { fill, on, type Hue } from './chart-tokens'

const BUCKETS: { key: string; label: string; range: string; hint: string; max: number; hue: Hue }[] = [
  { key: 'fresh', label: 'Under 1 day', range: '0 – 24 hours', hint: 'Fresh', max: 24, hue: 'mint' },
  { key: 'aging', label: '1 – 3 days', range: '24 – 72 hours', hint: 'Getting older', max: 72, hue: 'butter' },
  { key: 'nudge', label: '3 – 7 days', range: '3 – 7 days', hint: 'Needs a nudge', max: 168, hue: 'peach' },
  { key: 'stale', label: 'Over 7 days', range: 'A week or more', hint: 'Stale', max: Infinity, hue: 'rose' },
]

const duration = (h: number) => (h < 24 ? `${h}h` : `${Math.floor(h / 24)} ${Math.floor(h / 24) === 1 ? 'day' : 'days'}`)

/**
 * Open tickets split by how long they have waited, as four solid tiles from green (fresh) to red (stale).
 * Each tile is just the count, what it means, and its share of the queue. The headline is the single longest wait.
 */
export function TicketAging({ data, loading, error, onRetry, className }: { data?: Paginated<StaffTicket>; loading: boolean; error?: unknown; onRetry: () => void; className?: string }) {
  const tickets = data?.results
  const hours = useMemo(() => {
    const now = new Date()
    return (tickets ?? []).map((t) => ({ h: Math.max(0, differenceInHours(now, parseISO(t.created_at))), ref: t.reference }))
  }, [tickets])
  if (loading || error) return <PendingChart error={error} onRetry={onRetry} className={className} />

  const counts = BUCKETS.map((b, i) => hours.filter(({ h }) => h < b.max && h >= (BUCKETS[i - 1]?.max ?? 0)).length)
  const total = hours.length
  const oldest = hours.reduce<(typeof hours)[number] | null>((m, x) => (!m || x.h > m.h ? x : m), null)
  const sampled = data && data.count > data.results.length
  return (
    <ChartPanel
      icon={Hourglass}
      className={className}
      title="How long tickets have waited"
      description={sampled ? `Open tickets by age. The ${data.results.length} most urgent of ${data.count}.` : 'Open tickets by how long they have been waiting.'}
      figure={oldest ? <Figure value={duration(oldest.h)} label={`Longest wait · ${oldest.ref}`} tone={oldest.h >= 168 ? 'bad' : undefined} /> : undefined}
      summary={`Open tickets by age: ${BUCKETS.map((b, i) => `${counts[i]} ${b.label.toLowerCase()}`).join(', ')}.`}
      empty={!total}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {BUCKETS.map((b, i) => {
          const share = Math.round((counts[i] / total) * 100)
          return (
            <div key={b.key} className="flex flex-col rounded-panel p-5" style={{ background: fill(b.hue), color: on(b.hue) }}>
              <p className="text-sm font-semibold">{b.label}</p>
              <p className="text-xs opacity-85">{b.hint}</p>
              <p className="mt-5 text-5xl leading-none font-semibold tracking-tight tabular-nums">{counts[i]}</p>
              <p className="mt-1 text-xs font-medium opacity-90">{counts[i] === 1 ? 'ticket' : 'tickets'}</p>
              <div className="mt-5 h-1.5 overflow-hidden rounded-full" style={{ background: `color-mix(in srgb, ${on(b.hue)} 25%, transparent)` }} aria-hidden>
                <div className="h-full rounded-full" style={{ width: `${share}%`, background: on(b.hue) }} />
              </div>
              <p className="mt-1.5 text-xs font-medium tabular-nums opacity-90">{share}% of open tickets</p>
            </div>
          )
        })}
      </div>
    </ChartPanel>
  )
}
