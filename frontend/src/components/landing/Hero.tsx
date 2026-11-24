import { ArrowRight, Bell, Check, Play, Sparkles, Star } from 'lucide-react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { useRef, type CSSProperties, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { USE_CASES } from './constants'
import { Drift, EASE, Marquee, useParallax, useTypewriter, WordReveal } from './motion'

const DRAFT =
  'Hi Priya, I’m sorry about the timing. Your Segment pipeline is Degraded: the last sync was 3 hours ago and about 120,000 events are delayed. They backfill automatically for up to 72 hours, so nothing is lost.'

function Chip({ children, tone }: { children: ReactNode; tone: 'red' | 'violet' | 'amber' | 'green' }) {
  const t = {
    red: 'bg-red-50 text-red-700 ring-red-600/20',
    violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
    amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  }[tone]
  return <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset', t)}>{children}</span>
}

function Glass({ className, children, style }: { className?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={style} className={cn('rounded-2xl bg-white p-4 text-(--lp-ink) shadow-[0_30px_70px_-28px_rgba(60,40,140,0.38)] ring-1 ring-black/[0.06]', className)}>
      {children}
    </div>
  )
}

function SlaRing() {
  const r = 26
  const len = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
      <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(11,10,29,0.08)" strokeWidth="6" />
      <circle cx="32" cy="32" r={r} fill="none" stroke="#5b3df5" strokeWidth="6" strokeLinecap="round" strokeDasharray={len} style={{ ['--ring-len' as string]: `${len * 0.72}px`, animation: 'lp-ring 6s ease-in-out infinite alternate' }} />
    </svg>
  )
}

function Scene({ progress }: { progress: ReturnType<typeof useScroll>['scrollYProgress'] }) {
  const main = useParallax(progress, -110)
  const left = useParallax(progress, -320)
  const right = useParallax(progress, -420)
  const low = useParallax(progress, -240)
  const top = useParallax(progress, -380)
  const rotL = useParallax(progress, -7)
  const rotR = useParallax(progress, 6)
  const { shown, done } = useTypewriter(DRAFT, true, 18)

  return (
    <div className="relative mx-auto mt-16 h-[34rem] w-full max-w-6xl text-left sm:h-[36rem]">
      {/* main window */}
      <motion.div style={{ y: main }} className="absolute inset-x-0 top-0 mx-auto w-[min(46rem,94%)]">
        <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.5, ease: EASE }} className="overflow-hidden rounded-3xl bg-white shadow-[0_50px_110px_-30px_rgba(91,61,245,0.42)] ring-1 ring-black/[0.07]">
          <div className="flex items-center gap-2 border-b border-black/[0.06] bg-neutral-50/80 px-4 py-3">
            <span className="size-2.5 rounded-full bg-red-300" />
            <span className="size-2.5 rounded-full bg-amber-300" />
            <span className="size-2.5 rounded-full bg-emerald-300" />
            <span className="ml-3 truncate text-xs text-neutral-500">TKT-0001 · Segment events missing since this morning</span>
          </div>
          <div className="space-y-3.5 p-4 sm:p-5">
            <div className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-300/90 text-xs font-bold text-orange-950">PR</span>
              <p className="rounded-2xl rounded-tl-sm bg-neutral-100 px-4 py-2.5 text-[13px] leading-relaxed text-neutral-800">None of our Segment events have shown up since about 6am UTC. We have a launch review in a few hours. Is this on your side?</p>
            </div>
            <div className="rounded-2xl bg-linear-to-br from-violet-50 via-fuchsia-50/60 to-white p-4 ring-1 ring-violet-200">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wide text-violet-700 uppercase">
                <Sparkles className="size-3.5" /> AI draft
                <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-neutral-500 ring-1 ring-violet-200 normal-case">2 sources cited</span>
              </div>
              <p className="min-h-[5.6rem] text-[13px] leading-relaxed text-neutral-800">
                {shown}
                {!done && <span className="lp-caret ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-(--lp-violet)" />}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] text-violet-800 ring-1 ring-violet-200">Segment sync troubleshooting</span>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] text-violet-800 ring-1 ring-violet-200">Incident response and SLA</span>
                <span className="ml-auto flex items-center gap-1.5 rounded-full bg-(--lp-ink) px-3 py-1 text-[11px] font-semibold text-white">
                  Review &amp; send <ArrowRight className="size-3" />
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* triage card */}
      <motion.div style={{ y: left, rotate: rotL }} className="absolute top-24 left-0 hidden w-60 lg:block xl:-left-4">
        <Glass className="lp-float">
          <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-neutral-500 uppercase">
            <Sparkles className="size-3.5 text-(--lp-violet)" /> AI triage
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Chip tone="red">Critical</Chip>
            <Chip tone="violet">Integrations</Chip>
            <Chip tone="amber">Frustrated</Chip>
          </div>
          <p className="mt-3 text-[12px] leading-snug text-neutral-600">Customer’s Segment pipeline stopped delivering events; launch review today.</p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-neutral-500">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
              <motion.span initial={{ width: 0 }} animate={{ width: '93%' }} transition={{ delay: 1.2, duration: 1.1, ease: EASE }} className="block h-full rounded-full bg-(--lp-violet)" />
            </span>
            93%
          </div>
        </Glass>
      </motion.div>

      {/* SLA */}
      <motion.div style={{ y: right, rotate: rotR }} className="absolute top-10 right-0 hidden w-52 md:block xl:-right-4">
        <Glass className="lp-float [animation-delay:-2s]">
          <div className="flex items-center gap-3">
            <SlaRing />
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-neutral-500 uppercase">SLA</p>
              <p className="text-lg leading-tight font-semibold">Reply in 1h</p>
            </div>
          </div>
        </Glass>
      </motion.div>

      {/* CSAT */}
      <motion.div style={{ y: low }} className="absolute right-4 bottom-8 hidden w-56 md:block xl:right-0">
        <Glass className="lp-float [animation-delay:-4s]">
          <p className="text-[11px] font-semibold tracking-wide text-neutral-500 uppercase">Customer rating</p>
          <div className="mt-1.5 flex items-center gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} className="size-5 fill-(--lp-amber) text-(--lp-amber)" />
            ))}
            <span className="ml-2 text-sm font-semibold">4.8</span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600">
            <Check className="size-3" /> Resolved in 38 min
          </p>
        </Glass>
      </motion.div>

      {/* realtime toast */}
      <motion.div style={{ y: top }} className="absolute bottom-4 left-2 w-64 sm:left-10 lg:left-24">
        <Glass className="lp-float flex items-center gap-3 !p-3 [animation-delay:-1s]">
          <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-(--lp-coral) text-white">
            <Bell className="size-4" />
            <span className="lp-pulse-ring absolute inset-0 rounded-full bg-(--lp-coral)/60" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold">New reply · Priya</p>
            <p className="truncate text-[11px] text-neutral-500">“That fixed it, thank you!” · just now</p>
          </div>
        </Glass>
      </motion.div>
    </div>
  )
}

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 22, mass: 0.4 })
  const blobA = useParallax(smooth, 340)
  const blobB = useParallax(smooth, -220)
  const blobC = useParallax(smooth, 260)
  const titleY = useParallax(smooth, 160)
  const titleOpacity = useTransform(smooth, [0, 0.55], [1, reduce ? 1 : 0.15])

  return (
    <section id="top" ref={ref} data-nav="light" className="relative bg-[linear-gradient(180deg,#f6f2ff_0%,#fbf9f4_55%,#fbf9f4_100%)] pt-32 pb-16 text-(--lp-ink) sm:pt-40">
      {/* soft aurora + grid, clipped so parallax blobs never cause horizontal scroll */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <motion.div style={{ y: blobA }} className="absolute -top-40 -left-40 size-[44rem] rounded-full bg-[radial-gradient(circle,#8b6cff_0%,transparent_65%)] opacity-35 blur-3xl" />
        <motion.div style={{ y: blobB }} className="absolute top-10 -right-40 size-[40rem] rounded-full bg-[radial-gradient(circle,#ff8a6b_0%,transparent_65%)] opacity-30 blur-3xl" />
        <motion.div style={{ y: blobC }} className="absolute top-[34rem] left-1/3 size-[34rem] rounded-full bg-[radial-gradient(circle,#c8f560_0%,transparent_65%)] opacity-45 blur-3xl" />
        <Drift speed={0.9} rotate={25} className="top-[16%] left-[7%] size-20"><div className="size-full rounded-full border-[5px] border-(--lp-violet)/35" /></Drift>
        <Drift speed={0.55} rotate={-30} className="top-[26%] right-[9%] size-14"><div className="size-full rounded-2xl bg-(--lp-coral)/70" /></Drift>
        <Drift speed={1.1} rotate={40} className="top-[58%] left-[3%] size-10"><div className="size-full rounded-lg bg-(--lp-lime)" /></Drift>
        <Drift speed={0.7} className="top-[48%] right-[4%] h-28 w-28"><div className="size-full [background-image:radial-gradient(circle,rgba(91,61,245,0.55)_2px,transparent_2.5px)] [background-size:14px_14px]" /></Drift>
        <div className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(11,10,29,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(11,10,29,0.05)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_70%_55%_at_50%_22%,#000_25%,transparent_75%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 text-center sm:px-8">
        <motion.div style={{ y: titleY, opacity: titleOpacity }}>
          <h1 className="mx-auto max-w-6xl text-[clamp(2.7rem,6.4vw,6rem)] leading-[0.95] font-semibold tracking-[-0.045em] text-balance">
            <WordReveal text="Answer customers faster." onMount delay={0.15} />
            <br />
            <span className="lp-shine bg-linear-to-r from-(--lp-violet) via-fuchsia-500 to-(--lp-coral) bg-clip-text text-transparent">
              <WordReveal text="Show your sources." onMount delay={0.55} />
            </span>
          </h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.7 }} className="mx-auto mt-7 max-w-2xl text-lg text-neutral-600 sm:text-xl">
            Every ticket is triaged the second it lands, and your team opens it to a ready reply drafted from your own knowledge base. Review, edit, send.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.15, duration: 0.7 }} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#demo" className="lp-focus group flex h-14 items-center gap-2 rounded-full bg-(--lp-violet) px-8 text-base font-semibold text-white shadow-[0_14px_40px_-10px_rgba(91,61,245,0.65)] transition-transform hover:scale-[1.04]">
              Try the live demo <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </a>
            <a href="#story" className="lp-focus flex h-14 items-center gap-2 rounded-full bg-white px-7 text-base font-medium text-(--lp-ink) ring-1 ring-black/15 transition-colors hover:bg-neutral-50">
              <Play className="size-4 fill-(--lp-ink)" /> Watch how it works
            </a>
          </motion.div>
        </motion.div>

        <Scene progress={smooth} />
      </div>

      {/* use-case marquee: lives inside the hero's own bottom padding so the next section's rounded top can't cover it */}
      <div className="relative mt-6 border-t border-black/[0.07] py-6">
        <Marquee items={USE_CASES} itemClassName="bg-white text-neutral-700 shadow-sm ring-1 ring-black/10" />
      </div>
    </section>
  )
}
