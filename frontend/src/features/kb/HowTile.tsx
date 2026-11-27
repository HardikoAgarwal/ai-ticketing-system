import { ArrowRight, CircleHelp } from 'lucide-react'

/**
 * The small fourth tile beside the visibility tiles: a dark button that opens the "How it works" walkthrough. It is much narrower than the
 * others and a different colour so it reads as a button, not as another count.
 */
export function HowTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col justify-between rounded-panel bg-ink p-5 text-left text-canvas shadow-card transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink max-sm:col-span-3 max-sm:flex-row max-sm:items-center max-sm:p-4 sm:p-6 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <span className="flex size-11 items-center justify-center rounded-control bg-canvas/15 max-sm:size-9" aria-hidden>
        <CircleHelp className="size-5" />
      </span>
      <span className="mt-4 block max-sm:mt-0 max-sm:flex-1 max-sm:px-3">
        <span className="block text-base leading-5 font-semibold">How it works</span>
        <span className="mt-1 hidden text-[13px] leading-5 opacity-70 sm:block">How the AI uses your articles</span>
      </span>
      <ArrowRight className="absolute top-6 right-5 size-4 opacity-70 transition-transform group-hover:translate-x-0.5 max-sm:static" aria-hidden />
    </button>
  )
}
