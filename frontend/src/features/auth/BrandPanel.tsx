import { BookOpenCheck, Gauge, LifeBuoy, ShieldCheck, Sparkles } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router-dom'

import { AiChip, AiSurface, Chip } from '@/components/ds'

export function BrandMark({ className = 'size-9' }: { className?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-control bg-linear-to-br from-aurora-1 via-aurora-1 to-aurora-3 text-white shadow-aurora ${className}`} aria-hidden>
      <LifeBuoy className="size-[55%]" />
    </span>
  )
}

const POINTS = [
  { icon: Gauge, title: 'Triage in seconds', text: 'Category, priority and sentiment are set before anyone opens the ticket.' },
  { icon: BookOpenCheck, title: 'Drafts that cite their sources', text: 'Replies are written from your own knowledge base, with links to the articles used.' },
  { icon: ShieldCheck, title: 'You stay in control', text: 'Nothing is sent without a person. Staff can always override the AI.' },
]

/** Deep-ink panel that echoes the landing hero: aurora light, a glimpse of the product and three value points. Decorative parts are aria-hidden. */
export function BrandPanel() {
  const reduce = useReducedMotion()
  const drift = (x: string[], y: string[], d: number) => (reduce ? undefined : { animate: { x, y }, transition: { duration: d, repeat: Infinity, ease: 'easeInOut' as const } })
  return (
    <aside aria-label="About Helpdesk AI" className="lp relative hidden overflow-hidden border-l border-white/10 bg-(--lp-ink) text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <motion.div className="absolute -top-32 -right-24 size-[34rem] rounded-full bg-aurora-1 opacity-40 blur-[120px]" {...drift(['0%', '-8%', '0%'], ['0%', '8%', '0%'], 14)} />
        <motion.div className="absolute -bottom-40 -left-24 size-[30rem] rounded-full bg-aurora-2 opacity-20 blur-[120px]" {...drift(['0%', '10%', '0%'], ['0%', '-6%', '0%'], 17)} />
        <motion.div className="absolute right-1/4 bottom-1/4 size-[22rem] rounded-full bg-aurora-3 opacity-20 blur-[110px]" {...drift(['0%', '-10%', '0%'], ['0%', '6%', '0%'], 12)} />
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      </div>

      <Link to="/" aria-label="Helpdesk AI, back to home" className="relative inline-flex w-fit items-center gap-2.5 rounded-control p-1 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
        <BrandMark />
        <span className="text-[15px] font-semibold tracking-tight">Helpdesk AI</span>
      </Link>

      <div className="relative my-12 max-w-xl">
        <h2 className="text-[clamp(2rem,3.2vw,3rem)] leading-[1.05] font-semibold tracking-[-0.035em] text-balance">
          Support that answers <span className="ai-text">before you open the ticket.</span>
        </h2>

        <div aria-hidden className="mt-9 max-w-md rotate-[-1.5deg]">
          <div className="rounded-panel bg-white/6 p-3 ring-1 ring-white/10 backdrop-blur">
            <div className="flex items-center gap-2 px-1 pb-2.5">
              <Chip tone="red" size="sm">Overdue 2h</Chip>
              <Chip tone="slate" size="sm">Billing</Chip>
              <span className="ml-auto text-xs text-white/50">TKT-0021</span>
            </div>
            <p className="px-1 pb-3 text-sm font-semibold">Invoice shows the wrong company name</p>
            <AiSurface working className="p-3.5 text-ink">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                  <Sparkles className="size-3.5 text-violet" /> Suggested reply
                </span>
                <AiChip size="sm">92%</AiChip>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">Hi Aisha, thanks for flagging this. I can update the company name on your invoice today, see how in Billing settings…</p>
            </AiSurface>
          </div>
        </div>

        <ul className="mt-10 space-y-5">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-white/10 ring-1 ring-white/15">
                <Icon className="size-4.5 text-white" aria-hidden />
              </span>
              <span>
                <span className="block text-[15px] font-semibold">{title}</span>
                <span className="block text-sm leading-relaxed text-white/65">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-white/50">Demo workspaces are private to you and reset after 24 hours.</p>
    </aside>
  )
}
