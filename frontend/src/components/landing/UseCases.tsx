import { cn } from '@/lib/utils'

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
    <div data-marquee-row className="group relative flex overflow-x-clip overflow-y-visible py-6 [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)] [mask-size:100%_100%]">
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

/** Its own section. Each row owns vertical padding bigger than the pill's shadow and hover lift, so nothing is ever clipped. */
export function UseCases() {
  return (
    <section data-nav="light" aria-label="Who it is for" className="relative bg-white py-12 pb-28 text-(--lp-ink) sm:py-16 sm:pb-36">
      <div role="list">
        <Row items={ROW_A} />
        <Row items={ROW_B} reverse />
      </div>
    </section>
  )
}
