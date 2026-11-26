import { Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Avatar } from '@/components/ds'

import { ChartPanel, Figure, PendingChart } from './chart-kit'
import { fill } from './chart-tokens'
import type { WorkloadRow } from './useHomeData'

const MAX_DOTS = 36

/**
 * Open tickets per person as one tile each, with one dot per ticket: red for overdue (first), dark for on time.
 * You can count them, and a tile with red dots is visibly behind. "Unassigned" always comes first (dashed): tickets nobody owns are the ones that slip.
 */
export function Workload({ rows, loading, error, onRetry, inbox, className }: { rows: WorkloadRow[]; loading: boolean; error?: unknown; onRetry: () => void; inbox: (qs: string) => string; className?: string }) {
  if (loading || error) return <PendingChart error={error} onRetry={onRetry} className={className} />
  const total = rows.reduce((n, r) => n + r.count, 0)
  const overdue = rows.reduce((n, r) => n + r.overdue, 0)
  return (
    <ChartPanel
      icon={Users}
      className={className}
      title="Workload by owner"
      description="One dot per open ticket. Red dots are overdue. Select a tile to open that list."
      figure={
        <div className="flex gap-6">
          <Figure value={total} label="Open" />
          <Figure value={overdue} label="Overdue" tone={overdue ? 'bad' : undefined} />
        </div>
      }
      summary={`Open tickets by owner: ${rows.map((r) => `${r.name} ${r.count}${r.overdue ? `, ${r.overdue} overdue` : ''}`).join('; ')}.`}
    >
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-3">
        {rows.map((r) => {
          const unassigned = r.id === null
          const onTime = r.count - r.overdue
          const dots = [...Array.from({ length: r.overdue }, () => 'late'), ...Array.from({ length: onTime }, () => 'ok')]
          return (
            <li key={r.id ?? 'none'}>
              <Link
                to={inbox(`view=${unassigned ? 'unassigned' : 'all'}&status=OPEN,IN_PROGRESS${unassigned ? '' : `&assigned=${r.id}`}`)}
                className={`group flex h-full flex-col rounded-panel border p-4 transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none ${unassigned ? 'border-dashed border-line-strong' : 'border-line'}`}
              >
                <span className="flex items-center gap-3">
                  {unassigned ? (
                    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-control border border-dashed border-line-strong text-sm text-ink-3">
                      ?
                    </span>
                  ) : (
                    <Avatar name={r.name} size="lg" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-semibold text-ink group-hover:underline ${unassigned ? 'italic' : ''}`}>{r.name}</span>
                    <span className="block text-xs text-ink-2" style={r.overdue ? { color: fill('rose') } : undefined}>
                      {r.overdue ? `${r.overdue} overdue` : r.count ? 'All on time' : unassigned ? 'Everything has an owner' : 'Nothing open'}
                    </span>
                  </span>
                  <span className="text-3xl leading-8 font-semibold tracking-tight text-ink tabular-nums">{r.count}</span>
                </span>
                <span className="mt-4 flex min-h-3.5 flex-wrap gap-1.5" aria-hidden>
                  {dots.slice(0, MAX_DOTS).map((kind, i) => (
                    <span key={i} className="size-3.5 rounded-full" style={{ background: kind === 'late' ? fill('rose') : 'var(--ink)' }} />
                  ))}
                  {dots.length > MAX_DOTS && <span className="text-xs font-semibold text-ink-2">+{dots.length - MAX_DOTS}</span>}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </ChartPanel>
  )
}
