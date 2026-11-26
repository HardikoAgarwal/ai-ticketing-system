import { Clock, Inbox, UserCheck, UserX, type LucideIcon } from 'lucide-react'

import { fill, type Hue } from '@/components/ds'
import type { QueueStats } from '@/lib/types'

import { TILE_HUE, type ViewKey } from './model'
import { StatTile } from './StatTile'

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
 * The queue numbers as four solid tiles. They are also the list's filters: select one to show exactly those tickets
 * (select it again, or another, to change). The tile for what is on screen shows a check and a ring.
 */
export function QueueStrip({ stats, view, params, onPick }: { stats?: QueueStats; view: ViewKey; params: URLSearchParams; onPick: (view: ViewKey, filters?: Record<string, string>) => void }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="status" aria-label="Loading queue summary">
        {Object.values(TILE_HUE).map((hue, i) => (
          <div key={i} className="sk flex h-[158px] flex-col rounded-panel p-5 sm:p-6" style={{ background: `color-mix(in srgb, ${fill(hue)} 26%, var(--surface))` }} aria-hidden>
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
    { key: 'open', icon: Inbox, hue: TILE_HUE.open, label: 'Open now', value: stats.open + stats.in_progress, foot: `${stats.in_progress} in progress`, active: view === 'attention' && !sla && !prio, onPick: () => onPick('attention') },
    { key: 'overdue', icon: Clock, hue: TILE_HUE.overdue, label: 'Overdue', value: stats.overdue, foot: stats.overdue ? 'Past the reply target' : 'All within target', active: view === 'attention' && sla === 'overdue', onPick: () => onPick('attention', { sla: 'overdue' }) },
    { key: 'unassigned', icon: UserX, hue: TILE_HUE.unassigned, label: 'Unassigned', value: stats.unassigned, foot: stats.unassigned ? 'Waiting for an owner' : 'Everyone has an owner', active: view === 'unassigned', onPick: () => onPick('unassigned') },
    { key: 'mine', icon: UserCheck, hue: TILE_HUE.mine, label: 'Assigned to me', value: stats.mine, foot: stats.mine ? 'Your open tickets' : 'Nothing assigned to you', active: view === 'mine', onPick: () => onPick('mine') },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="group" aria-label="Queue summary. Select one to filter the list">
      {tiles.map((t) => (
        <StatTile key={t.key} icon={t.icon} hue={t.hue} label={t.label} value={t.value} foot={t.foot} active={t.active} onPick={t.onPick} />
      ))}
    </div>
  )
}
