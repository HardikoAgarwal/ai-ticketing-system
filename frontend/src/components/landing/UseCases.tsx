import { motion } from 'motion/react'

import { cn } from '@/lib/utils'

import { EASE } from './motion'

interface Kind {
  label: string
  icon: string
  tint: string
}

const ROW_A: Kind[] = [
  { label: 'SaaS teams', icon: '☁️', tint: 'bg-violet-100' },
  { label: 'IT helpdesks', icon: '🖥️', tint: 'bg-sky-100' },
  { label: 'E-commerce stores', icon: '🛍️', tint: 'bg-orange-100' },
  { label: 'Agencies', icon: '🎯', tint: 'bg-rose-100' },
  { label: 'Clinics & care', icon: '🩺', tint: 'bg-emerald-100' },
  { label: 'Schools', icon: '🎓', tint: 'bg-amber-100' },
]
const ROW_B: Kind[] = [
  { label: 'Marketplaces', icon: '🏪', tint: 'bg-fuchsia-100' },
  { label: 'Fintech ops', icon: '💳', tint: 'bg-cyan-100' },
  { label: 'Property managers', icon: '🏠', tint: 'bg-lime-100' },
  { label: 'Community teams', icon: '💬', tint: 'bg-indigo-100' },
  { label: 'Travel & hospitality', icon: '✈️', tint: 'bg-teal-100' },
  { label: 'Non-profits', icon: '🌱', tint: 'bg-green-100' },
]

function Pill({ k }: { k: Kind }) {
  return (
    <span className="flex shrink-0 items-center gap-3 rounded-full bg-white py-2.5 pr-6 pl-2.5 text-[15px] font-semibold whitespace-nowrap text-(--lp-ink) shadow-[0_10px_30px_-18px_rgba(60,40,140,0.5)] ring-1 ring-black/[0.07] transition-transform duration-300 hover:-translate-y-0.5 sm:text-base">
      <span aria-hidden className={cn('flex size-10 items-center justify-center rounded-full text-xl', k.tint)}>
        {k.icon}
      </span>
      {k.label}
    </span>
  )
}

function Row({ items, reverse }: { items: Kind[]; reverse?: boolean }) {
  const loop = [...items, ...items]
  return (
    <div className="group relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
      <div className={cn('lp-marquee flex shrink-0 gap-4 pr-4 group-hover:[animation-play-state:paused]', reverse && '[animation-direction:reverse]')}>
        {loop.map((k, i) => (
          <Pill key={i} k={k} />
        ))}
      </div>
      <div aria-hidden className={cn('lp-marquee flex shrink-0 gap-4 pr-4 group-hover:[animation-play-state:paused]', reverse && '[animation-direction:reverse]')}>
        {loop.map((k, i) => (
          <Pill key={i} k={k} />
        ))}
      </div>
    </div>
  )
}

/** Its own section with generous padding (the bottom padding is covered by the next section's rounded top, so it is deep enough that nothing is hidden). */
export function UseCases() {
  return (
    <section data-nav="light" aria-label="Who it is for" className="relative bg-[#fbf9f4] pt-4 pb-28 text-(--lp-ink) sm:pb-36">
      <motion.p initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-10%' }} transition={{ duration: 0.6, ease: EASE }} className="mb-9 px-5 text-center text-xs font-bold tracking-[0.2em] text-neutral-500 uppercase">
        Built for every kind of support desk
      </motion.p>
      <div className="space-y-4" role="list">
        <Row items={ROW_A} />
        <Row items={ROW_B} reverse />
      </div>
    </section>
  )
}
