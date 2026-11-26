import { Check, type LucideIcon } from 'lucide-react'

import { fill, on, type Hue } from '@/components/ds'
import { cn } from '@/lib/utils'

/** One solid-colour stat tile that doubles as a filter button. The selected one shows a check and a ring. */
export function StatTile({ icon: Icon, hue, label, value, foot, active, onPick }: { icon: LucideIcon; hue: Hue; label: string; value: number; foot: string; active: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onPick}
      style={{ background: fill(hue), color: on(hue) }}
      className={cn(
        'relative flex flex-col rounded-panel p-5 text-left shadow-card transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink max-sm:p-3.5 sm:p-6',
        active ? 'ring-2 ring-ink ring-offset-2 ring-offset-canvas' : 'hover:-translate-y-0.5',
      )}
    >
      <span className="flex items-center gap-2 text-base font-semibold max-sm:text-sm">
        <Icon className="size-5 max-sm:hidden" aria-hidden />
        {label}
        {active && <Check className="ml-auto size-4" aria-label="Showing" />}
      </span>
      <span className="mt-3 text-5xl leading-[52px] font-semibold tracking-tight tabular-nums max-sm:mt-1.5 max-sm:text-3xl max-sm:leading-9">{value}</span>
      <span className="mt-1.5 text-sm font-medium opacity-90 max-sm:hidden">{foot}</span>
    </button>
  )
}
