import { ListChecks, Lock, Zap, type LucideIcon } from 'lucide-react'

import { ConversationPreview } from './ConversationPreview'

const POINTS: { icon: LucideIcon; label: string }[] = [
  { icon: Zap, label: 'Replies appear live' },
  { icon: ListChecks, label: 'A clear status on every request' },
  { icon: Lock, label: 'Private to your workspace' },
]

/**
 * The right half of the auth screens: one solid block of the brand emerald, flush to the top, right and bottom
 * edges of the window, with rounded left corners. It holds a headline, a support conversation and a short row of facts.
 * Customers sign in here as well as the team, so it says nothing about plans, demos or how the helpdesk works behind
 * the scenes: just what support looks like from either side.
 * Text sits on the fill at full strength (on-brand / on-brand-2); short windows drop the sub line, then the facts.
 */
export function AuthPanel() {
  return (
    <aside aria-label="About Helpdesk AI" className="hidden min-h-0 flex-col overflow-hidden rounded-l-[2rem] bg-brand px-10 py-10 text-on-brand lg:flex xl:px-14 xl:py-12">
      <div className="max-w-[31rem] shrink-0">
        <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] leading-[1.12] font-semibold tracking-[-0.035em]">Every conversation, in one place.</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-on-brand-2 [@media(max-height:760px)]:hidden">Questions, replies and updates stay together, from the first message to the fix.</p>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center py-6">
        <ConversationPreview />
      </div>

      <ul className="flex shrink-0 flex-wrap gap-x-6 gap-y-2 border-t border-brand-line pt-5 text-[13px] font-medium [@media(max-height:680px)]:hidden">
        {POINTS.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-2">
            <Icon className="size-4 shrink-0" aria-hidden />
            {label}
          </li>
        ))}
      </ul>
    </aside>
  )
}
