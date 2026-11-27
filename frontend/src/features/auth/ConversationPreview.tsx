import { CircleCheck, LifeBuoy, MessageSquare, type LucideIcon } from 'lucide-react'
import { motion, useReducedMotion, type Variants } from 'motion/react'
import type { ReactNode } from 'react'

import { Avatar } from '@/components/ds'
import { cn } from '@/lib/utils'

const EASE = [0.22, 1, 0.36, 1] as const
// the window arrives, then the three messages one after another, each side note with the message it belongs to
const group: Variants = { hidden: {}, show: {} }
const frame: Variants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delayChildren: 0.3, staggerChildren: 0.4 } } }
const rise: Variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }
const pop = (delay: number): Variants => ({ hidden: { opacity: 0, scale: 0.94 }, show: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: EASE, delay } } })

/**
 * The sign-in panel's vignette: one support conversation from question to fix, in the app's own message style.
 * It shows nothing about how the team works behind the scenes, so it reads right for a customer and for an agent.
 * Plays once on arrival and is still under reduced motion. Decorative: the panel's headline says the same in words.
 */
export function ConversationPreview() {
  const reduce = useReducedMotion()
  return (
    <motion.div aria-hidden variants={group} initial={reduce ? false : 'hidden'} animate="show" className="relative w-full max-w-[30rem] xl:py-6">
      <motion.div variants={frame} className="rounded-[1.25rem] border border-line bg-canvas p-2.5 text-ink shadow-pop">
        <div className="rounded-panel border border-line bg-surface shadow-card">
          <div className="border-b border-line px-3.5 py-3">
            <p className="tabular text-xs font-medium text-ink-3">TKT-0003</p>
            <p className="mt-0.5 text-[15px] leading-snug font-semibold tracking-tight">Charged twice for this month’s invoice</p>
          </div>
          <div className="space-y-3.5 p-3.5">
            <Bubble name="Tom Becker" time="10:02">
              I can see two identical charges of $392 on my card for this month’s invoice. Can you fix this today?
            </Bubble>
            <Bubble name="Maya Chen" time="10:40" team>
              Sorry about that, Tom. I have refunded the duplicate charge. It will be back on your card within 5 to 7 business days.
            </Bubble>
            <Bubble name="Tom Becker" time="10:41">
              That was quick, thank you!
            </Bubble>
          </div>
        </div>
      </motion.div>

      <Floating delay={0.9} icon={MessageSquare} tile="bg-sky text-sky-ink" title="New reply" text="Shows up live" className="top-0 -right-7" />
      <Floating delay={1.5} icon={CircleCheck} tile="bg-mint text-mint-ink" title="Resolved" text="In 38 minutes" className="bottom-0 -left-9" />
    </motion.div>
  )
}

/** A message in the thread's style: the customer's on the left on plain surface, the team's on the right, tinted. */
function Bubble({ name, time, team = false, children }: { name: string; time: string; team?: boolean; children: ReactNode }) {
  return (
    <motion.div variants={rise} className={cn('flex items-end gap-2.5', team && 'flex-row-reverse')}>
      <Avatar name={name} />
      <div className={cn('flex max-w-[82%] min-w-0 flex-col', team ? 'items-end' : 'items-start')}>
        <p className={cn('mb-1 flex items-center gap-x-2 px-1 text-xs', team && 'flex-row-reverse')}>
          <span className="font-semibold">{name}</span>
          {team && (
            <span className="inline-flex items-center gap-1 text-ink-3">
              <LifeBuoy className="size-3" /> Support
            </span>
          )}
          <span className="tabular text-ink-3">{time}</span>
        </p>
        <p className={cn('rounded-panel border px-3.5 py-2.5 text-[13px] leading-relaxed', team ? 'rounded-br-md border-lav-line bg-lav' : 'rounded-bl-md border-line bg-surface-2')}>{children}</p>
      </div>
    </motion.div>
  )
}

/** A floating side note in the app's card style. Only where the panel is wide enough to let it hang off the window. */
function Floating({ icon: Icon, tile, title, text, delay, className }: { icon: LucideIcon; tile: string; title: string; text: string; delay: number; className?: string }) {
  return (
    <motion.div variants={pop(delay)} className={cn('absolute hidden items-center gap-2.5 rounded-panel border border-line bg-surface py-2 pr-3.5 pl-2 text-ink shadow-pop xl:flex', className)}>
      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-control', tile)}>
        <Icon className="size-4" />
      </span>
      <span className="leading-tight">
        <span className="block text-xs font-semibold">{title}</span>
        <span className="block text-xs text-ink-3">{text}</span>
      </span>
    </motion.div>
  )
}
