import { ArrowRight, CircleHelp, type LucideIcon } from 'lucide-react'

/**
 * The small fourth tile beside the visibility tiles: a dark button that opens the "How it works" walkthrough. It is thin and a different
 * colour from the others so it reads as a button, not as another count.
 */
export function HowTile({ onClick, label = 'How it works', icon: Icon = CircleHelp }: { onClick: () => void; label?: string; icon?: LucideIcon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col justify-between rounded-panel bg-ink p-4 text-left text-canvas shadow-card transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink max-sm:col-span-3 max-sm:flex-row max-sm:items-center max-sm:p-4 sm:p-4 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <span className="flex size-11 items-center justify-center rounded-control bg-canvas/15 max-sm:size-9" aria-hidden>
        <Icon className="size-5" />
      </span>
      <span className="mt-4 block max-sm:mt-0 max-sm:flex-1 max-sm:px-3">
        <span className="block text-base leading-5 font-semibold">{label}</span>
      </span>
      <ArrowRight className="absolute top-4 right-4 size-4 opacity-70 transition-transform group-hover:translate-x-0.5 max-sm:static" aria-hidden />
    </button>
  )
}
