import { Clock, Flame, Inbox, UserCheck, UserX, type LucideIcon } from 'lucide-react'

import { Skeleton } from '@/components/ds'
import type { QueueStats } from '@/lib/types'
import { cn } from '@/lib/utils'

import type { ViewKey } from './model'

interface Tile {
  key: string
  icon: LucideIcon
  label: string
  value: number
  foot: string
  /** True when a non-zero value is a problem, which turns the tile red. */
  alarm?: boolean
  active: boolean
  onPick: () => void
}

/**
 * The basic queue numbers as five tiles: open, overdue, unassigned, critical, mine. Each one is also a shortcut that sets
 * the list to exactly those tickets; the tile for the current view is marked as selected.
 */
export function QueueStrip({ stats, view, params, onPick }: { stats?: QueueStats; view: ViewKey; params: URLSearchParams; onPick: (view: ViewKey, filters?: Record<string, string>) => void }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-panel" />
        ))}
      </div>
    )
  }
  const sla = params.get('sla')
  const prio = params.get('priority')
  const tiles: Tile[] = [
    { key: 'open', icon: Inbox, label: 'Open now', value: stats.open + stats.in_progress, foot: `${stats.in_progress} in progress`, active: view === 'attention' && !sla && !prio, onPick: () => onPick('attention') },
    { key: 'overdue', icon: Clock, label: 'Overdue', value: stats.overdue, foot: stats.overdue ? 'Past the reply target' : 'All within target', alarm: true, active: view === 'attention' && sla === 'overdue', onPick: () => onPick('attention', { sla: 'overdue' }) },
    { key: 'unassigned', icon: UserX, label: 'Unassigned', value: stats.unassigned, foot: stats.unassigned ? 'Waiting for an owner' : 'Everyone has an owner', active: view === 'unassigned', onPick: () => onPick('unassigned') },
    { key: 'critical', icon: Flame, label: 'Critical', value: stats.critical, foot: stats.critical ? 'Highest priority' : 'None open', alarm: true, active: view === 'attention' && prio === 'CRITICAL', onPick: () => onPick('attention', { priority: 'CRITICAL' }) },
    { key: 'mine', icon: UserCheck, label: 'Assigned to me', value: stats.mine, foot: stats.mine ? 'Your open tickets' : 'Nothing assigned to you', active: view === 'mine', onPick: () => onPick('mine') },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5" role="group" aria-label="Queue summary. Select one to filter the list">
      {tiles.map((t) => {
        const bad = t.alarm && t.value > 0
        return (
          <button
            key={t.key}
            type="button"
            aria-pressed={t.active}
            onClick={t.onPick}
            className={cn(
              'flex items-center gap-3.5 rounded-panel border bg-surface p-4 text-left max-sm:gap-2.5 max-sm:p-3 shadow-card transition-colors focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none',
              t.active ? 'border-violet ring-1 ring-violet' : 'border-line hover:border-line-strong',
              'max-lg:last:col-span-2',
            )}
          >
            <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-control ring-1 ring-inset max-sm:size-9', bad ? 'bg-rose text-rose-ink ring-rose-line' : 'bg-violet-soft text-violet ring-violet/20')}>
              <t.icon className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-ink-2">{t.label}</span>
              <span className={cn('block text-[28px] leading-8 font-semibold tracking-tight tabular-nums max-sm:text-2xl', bad ? 'text-rose-ink' : 'text-ink')}>{t.value}</span>
              <span className="block truncate text-xs text-ink-3 max-sm:hidden">{t.foot}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
