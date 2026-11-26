import { Check, Clock, Flame, Inbox, UserCheck, UserX, type LucideIcon } from 'lucide-react'

import { fill, on, type Hue } from '@/components/ds'
import type { QueueStats } from '@/lib/types'
import { cn } from '@/lib/utils'

import type { ViewKey } from './model'

interface Tile {
  key: string
  icon: LucideIcon
  hue: Hue
  label: string
  value: number
  foot: string
  active: boolean
  onPick: () => void
}

/**
 * The queue numbers as five solid tiles. They are also the list's filters: select one to show exactly those tickets
 * (select it again, or another, to change). The tile for what is on screen shows a check and a ring.
 */
export function QueueStrip({ stats, view, params, onPick }: { stats?: QueueStats; view: ViewKey; params: URLSearchParams; onPick: (view: ViewKey, filters?: Record<string, string>) => void }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5" role="status" aria-label="Loading queue summary">
        {(['sky', 'rose', 'lav', 'peach', 'mint'] as const).map((hue) => (
          <div key={hue} className="sk flex h-[158px] flex-col rounded-panel p-5 sm:p-6 max-lg:last:col-span-2" style={{ background: `color-mix(in srgb, ${fill(hue)} 26%, var(--surface))` }} aria-hidden>
            <div className="h-5 w-28 rounded-md" style={{ background: `color-mix(in srgb, ${fill(hue)} 42%, transparent)` }} />
            <div className="mt-4 h-11 w-16 rounded-md" style={{ background: `color-mix(in srgb, ${fill(hue)} 50%, transparent)` }} />
            <div className="mt-3 h-3.5 w-32 rounded-md" style={{ background: `color-mix(in srgb, ${fill(hue)} 36%, transparent)` }} />
          </div>
        ))}
      </div>
    )
  }
  const sla = params.get('sla')
  const prio = params.get('priority')
  const tiles: Tile[] = [
    { key: 'open', icon: Inbox, hue: 'sky', label: 'Open now', value: stats.open + stats.in_progress, foot: `${stats.in_progress} in progress`, active: view === 'attention' && !sla && !prio, onPick: () => onPick('attention') },
    { key: 'overdue', icon: Clock, hue: 'rose', label: 'Overdue', value: stats.overdue, foot: stats.overdue ? 'Past the reply target' : 'All within target', active: view === 'attention' && sla === 'overdue', onPick: () => onPick('attention', { sla: 'overdue' }) },
    { key: 'unassigned', icon: UserX, hue: 'lav', label: 'Unassigned', value: stats.unassigned, foot: stats.unassigned ? 'Waiting for an owner' : 'Everyone has an owner', active: view === 'unassigned', onPick: () => onPick('unassigned') },
    { key: 'critical', icon: Flame, hue: 'peach', label: 'Critical', value: stats.critical, foot: stats.critical ? 'Highest priority' : 'None open', active: view === 'attention' && prio === 'CRITICAL', onPick: () => onPick('attention', { priority: 'CRITICAL' }) },
    { key: 'mine', icon: UserCheck, hue: 'mint', label: 'Assigned to me', value: stats.mine, foot: stats.mine ? 'Your open tickets' : 'Nothing assigned to you', active: view === 'mine', onPick: () => onPick('mine') },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5" role="group" aria-label="Queue summary. Select one to filter the list">
      {tiles.map((t) => (
        <button
          key={t.key}
          type="button"
          aria-pressed={t.active}
          onClick={t.onPick}
          style={{ background: fill(t.hue), color: on(t.hue) }}
          className={cn(
            'relative flex flex-col rounded-panel p-5 text-left shadow-card transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:p-6 max-lg:last:col-span-2',
            t.active ? 'ring-2 ring-ink ring-offset-2 ring-offset-canvas' : 'hover:-translate-y-0.5',
          )}
        >
          <span className="flex items-center gap-2 text-base font-semibold">
            <t.icon className="size-5" aria-hidden />
            {t.label}
            {t.active && <Check className="ml-auto size-4" aria-label="Showing" />}
          </span>
          <span className="mt-3 text-5xl leading-[52px] font-semibold tracking-tight tabular-nums">{t.value}</span>
          <span className="mt-1.5 truncate text-sm font-medium opacity-90">{t.foot}</span>
        </button>
      ))}
    </div>
  )
}
