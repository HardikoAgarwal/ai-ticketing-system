import { CheckCheck, Inbox, RotateCcw, SearchX, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { fill, on, type Hue } from '@/components/ds'

/** A big icon tile with two soft rings around it, in one of the solid colours. */
function Badge({ icon: Icon, hue }: { icon: LucideIcon; hue: Hue }) {
  const ring = (pct: number) => `color-mix(in srgb, ${fill(hue)} ${pct}%, transparent)`
  return (
    <span className="relative flex size-32 items-center justify-center" aria-hidden>
      <span className="absolute inset-0 rounded-full" style={{ background: ring(10) }} />
      <span className="absolute inset-4 rounded-full" style={{ background: ring(18) }} />
      <span className="relative flex size-16 items-center justify-center rounded-panel shadow-card" style={{ background: fill(hue), color: on(hue) }}>
        <Icon className="size-8" />
      </span>
    </span>
  )
}

function Message({ icon, hue, title, children, actions }: { icon: LucideIcon; hue: Hue; title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-panel bg-surface px-6 py-14 text-center shadow-card sm:py-16">
      <Badge icon={icon} hue={hue} />
      <h2 className="mt-5 text-xl font-semibold tracking-tight text-ink">{title}</h2>
      <p className="mt-2 max-w-md text-[15px] leading-6 text-ink-2">{children}</p>
      {actions && <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{actions}</div>}
    </div>
  )
}

/** Filters or a search are applied and nothing matches. */
export function NoMatches({ onClear }: { onClear: () => void }) {
  return (
    <Message
      icon={SearchX}
      hue="butter"
      title="No tickets match these filters"
      actions={
        <button type="button" onClick={onClear} className="inline-flex h-10 items-center gap-2 rounded-control bg-ink px-5 text-sm font-semibold text-canvas transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:outline-none">
          <RotateCcw className="size-4" aria-hidden /> Clear all filters
        </button>
      }
    >
      Nothing fits that combination right now. Remove a filter, shorten your search, or clear everything to see the whole queue again.
    </Message>
  )
}

/** There are no tickets at all in the current view. */
export function NothingHere({ view }: { view: string }) {
  const copy =
    view === 'mine'
      ? { title: 'Nothing is assigned to you', text: 'When someone gives you a ticket, or you take one from the queue, it shows up here.', icon: CheckCheck }
      : view === 'unassigned'
        ? { title: 'Every ticket has an owner', text: 'Nothing is waiting for someone to pick it up. New unassigned tickets will appear here as they arrive.', icon: CheckCheck }
        : { title: 'Inbox zero', text: 'No open tickets. Enjoy the quiet; new tickets show up here the moment they arrive.', icon: Inbox }
  return (
    <Message icon={copy.icon} hue="mint" title={copy.title}>
      {copy.text}
    </Message>
  )
}

/** Shown under the last ticket, so it is clear there is nothing more to load. */
export function EndOfList() {
  return (
    <div className="flex w-full items-center gap-4 py-4" role="status">
      <span className="h-px flex-1 bg-line" aria-hidden />
      <span className="inline-flex items-center gap-2 rounded-chip bg-surface px-4 py-2 text-sm font-semibold text-ink-2 shadow-card">
        <CheckCheck className="size-4 text-violet" aria-hidden />
        You've reached the end of the list
      </span>
      <span className="h-px flex-1 bg-line" aria-hidden />
    </div>
  )
}
