import { ArrowRight, Bell, Check, Play, Sparkles, Star } from 'lucide-react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { useRef, type CSSProperties, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { USE_CASES } from './constants'
import { EASE, Marquee, useParallax, useTypewriter, WordReveal } from './motion'

const DRAFT =
  'Hi Priya, I’m sorry about the timing. Your Segment pipeline is Degraded: the last sync was 3 hours ago and about 120,000 events are delayed. They backfill automatically for up to 72 hours, so nothing is lost.'

function Chip({ children, tone }: { children: ReactNode; tone: 'red' | 'violet' | 'amber' | 'green' }) {
  const t = {
    red: 'bg-red-500/15 text-red-300 ring-red-400/30',
    violet: 'bg-violet-400/15 text-violet-200 ring-violet-300/30',
    amber: 'bg-amber-400/15 text-amber-200 ring-amber-300/30',
    green: 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/30',
  }[tone]
  return <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset', t)}>{children}</span>
}

function Glass({ className, children, style }: { className?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={style} className={cn('rounded-2xl bg-white/[0.07] p-4 text-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)] ring-1 ring-white/15 backdrop-blur-xl', className)}>
      {children}
    </div>
  )
}

function SlaRing() {
  const r = 26
  const len = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
      <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
      <circle cx="32" cy="32" r={r} fill="none" stroke="#c8f560" strokeWidth="6" strokeLinecap="round" strokeDasharray={len} style={{ ['--ring-len' as string]: `${len * 0.72}px`, animation: 'lp-ring 6s ease-in-out infinite alternate' }} />
    </svg>
  )
}

function Scene({ progress }: { progress: ReturnType<typeof useScroll>['scrollYProgress'] }) {
  const main = useParallax(progress, -60)
  const left = useParallax(progress, -150)
  const right = useParallax(progress, -210)
  const low = useParallax(progress, -110)
  const top = useParallax(progress, -260)
  const { shown, done } = useTypewriter(DRAFT, true, 18)

  return (
    <div className="relative mx-auto mt-16 h-[34rem] w-full max-w-6xl text-left sm:h-[36rem]">
      {/* main window */}
      <motion.div style={{ y: main }} className="absolute inset-x-0 top-0 mx-auto w-[min(46rem,94%)]">
        <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.5, ease: EASE }} className="overflow-hidden rounded-3xl bg-[#14122e]/80 shadow-[0_50px_120px_-30px_rgba(91,61,245,0.6)] ring-1 ring-white/15 backdrop-blur-xl">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <span className="size-2.5 rounded-full bg-red-400/80" />
            <span className="size-2.5 rounded-full bg-amber-300/80" />
            <span className="size-2.5 rounded-full bg-emerald-400/80" />
            <span className="ml-3 truncate text-xs text-white/60">TKT-0001 · Segment events missing since this morning</span>
          </div>
          <div className="space-y-3.5 p-4 sm:p-5">
            <div className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-300/90 text-xs font-bold text-orange-950">PR</span>
              <p className="rounded-2xl rounded-tl-sm bg-white/10 px-4 py-2.5 text-[13px] leading-relaxed text-white/90">None of our Segment events have shown up since about 6am UTC. We have a launch review in a few hours. Is this on your side?</p>
            </div>
            <div className="rounded-2xl bg-linear-to-br from-violet-500/25 via-fuchsia-500/10 to-transparent p-4 ring-1 ring-violet-300/30">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wide text-violet-200 uppercase">
                <Sparkles className="size-3.5" /> AI draft
                <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70 normal-case">2 sources cited</span>
              </div>
              <p className="min-h-[5.6rem] text-[13px] leading-relaxed text-white/90">
                {shown}
                {!done && <span className="lp-caret ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-(--lp-lime)" />}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/80">Segment sync troubleshooting</span>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/80">Incident response and SLA</span>
                <span className="ml-auto flex items-center gap-1.5 rounded-full bg-(--lp-lime) px-3 py-1 text-[11px] font-semibold text-(--lp-ink)">
                  Review &amp; send <ArrowRight className="size-3" />
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* triage card */}
      <motion.div style={{ y: left }} className="absolute top-24 left-0 hidden w-60 lg:block xl:-left-4">
        <Glass className="lp-float">
          <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-white/60 uppercase">
            <Sparkles className="size-3.5 text-(--lp-lime)" /> AI triage
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Chip tone="red">Critical</Chip>
            <Chip tone="violet">Integrations</Chip>
            <Chip tone="amber">Frustrated</Chip>
          </div>
          <p className="mt-3 text-[12px] leading-snug text-white/75">Customer’s Segment pipeline stopped delivering events; launch review today.</p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-white/60">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <motion.span initial={{ width: 0 }} animate={{ width: '93%' }} transition={{ delay: 1.2, duration: 1.1, ease: EASE }} className="block h-full rounded-full bg-(--lp-lime)" />
            </span>
            93%
          </div>
        </Glass>
      </motion.div>

      {/* SLA */}
      <motion.div style={{ y: right }} className="absolute top-10 right-0 hidden w-52 md:block xl:-right-4">
        <Glass className="lp-float [animation-delay:-2s]">
          <div className="flex items-center gap-3">
            <SlaRing />
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-white/60 uppercase">SLA</p>
              <p className="text-lg leading-tight font-semibold">Reply in 1h</p>
            </div>
          </div>
        </Glass>
      </motion.div>

      {/* CSAT */}
      <motion.div style={{ y: low }} className="absolute right-4 bottom-8 hidden w-56 md:block xl:right-0">
        <Glass className="lp-float [animation-delay:-4s]">
          <p className="text-[11px] font-semibold tracking-wide text-white/60 uppercase">Customer rating</p>
          <div className="mt-1.5 flex items-center gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} className="size-5 fill-(--lp-amber) text-(--lp-amber)" />
            ))}
            <span className="ml-2 text-sm font-semibold">4.8</span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-300">
            <Check className="size-3" /> Resolved in 38 min
          </p>
        </Glass>
      </motion.div>

      {/* realtime toast */}
      <motion.div style={{ y: top }} className="absolute bottom-4 left-2 w-64 sm:left-10 lg:left-24">
        <Glass className="lp-float flex items-center gap-3 !p-3 [animation-delay:-1s]">
          <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-(--lp-coral)/90">
            <Bell className="size-4" />
            <span className="lp-pulse-ring absolute inset-0 rounded-full bg-(--lp-coral)/60" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold">New reply · Priya</p>
            <p className="truncate text-[11px] text-white/60">“That fixed it, thank you!” · just now</p>
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
  const blobA = useParallax(smooth, 220)
  const blobB = useParallax(smooth, -120)
  const blobC = useParallax(smooth, 160)
  const titleY = useParallax(smooth, 120)
  const titleOpacity = useTransform(smooth, [0, 0.55], [1, reduce ? 1 : 0.15])

  return (
    <section id="top" ref={ref} data-nav="dark" className="relative bg-(--lp-ink) pt-32 text-white sm:pt-40">
      {/* aurora + grid, clipped so parallax blobs never cause horizontal scroll */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <motion.div style={{ y: blobA }} className="absolute -top-40 -left-40 size-[44rem] rounded-full bg-[radial-gradient(circle,#5b3df5_0%,transparent_65%)] opacity-70 blur-3xl" />
        <motion.div style={{ y: blobB }} className="absolute top-20 -right-40 size-[40rem] rounded-full bg-[radial-gradient(circle,#ff6a4d_0%,transparent_65%)] opacity-45 blur-3xl" />
        <motion.div style={{ y: blobC }} className="absolute top-[34rem] left-1/3 size-[34rem] rounded-full bg-[radial-gradient(circle,#14b8a6_0%,transparent_65%)] opacity-35 blur-3xl" />
        <div className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_70%_55%_at_50%_20%,#000_30%,transparent_75%)]" />
        <div className="lp-noise absolute inset-0" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 text-center sm:px-8">
        <motion.div style={{ y: titleY, opacity: titleOpacity }}>
          <motion.a href="#demo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }} className="lp-focus inline-flex items-center gap-2 rounded-full bg-white/10 py-1 pr-3 pl-1 text-xs font-medium text-white/85 ring-1 ring-white/15 backdrop-blur transition-colors hover:bg-white/15">
            <span className="rounded-full bg-(--lp-lime) px-2.5 py-0.5 text-[11px] font-bold text-(--lp-ink)">LIVE</span>
            Real AI. Private sandbox. No signup.
            <ArrowRight className="size-3.5" />
          </motion.a>

          <h1 className="mx-auto mt-7 max-w-6xl text-[clamp(2.7rem,6.4vw,6rem)] leading-[0.95] font-semibold tracking-[-0.045em] text-balance">
            <WordReveal text="Answer customers faster." onMount delay={0.15} />
            <br />
            <span className="bg-linear-to-r from-(--lp-lime) via-emerald-300 to-cyan-300 bg-clip-text text-transparent">
              <WordReveal text="Show your sources." onMount delay={0.55} />
            </span>
          </h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.7 }} className="mx-auto mt-7 max-w-2xl text-lg text-white/70 sm:text-xl">
            Every ticket is triaged the second it lands, and your team opens it to a ready reply drafted from your own knowledge base. Review, edit, send.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.15, duration: 0.7 }} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#demo" className="lp-focus group flex h-14 items-center gap-2 rounded-full bg-(--lp-lime) px-8 text-base font-semibold text-(--lp-ink) shadow-[0_10px_40px_-8px_rgba(200,245,96,0.55)] transition-transform hover:scale-[1.04]">
              Try the live demo <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </a>
            <a href="#story" className="lp-focus flex h-14 items-center gap-2 rounded-full px-7 text-base font-medium text-white ring-1 ring-white/25 transition-colors hover:bg-white/10">
              <Play className="size-4 fill-white" /> Watch how it works
            </a>
          </motion.div>
        </motion.div>

        <Scene progress={smooth} />
      </div>

      <div className="relative mt-4 border-t border-white/10 py-6">
        <Marquee items={USE_CASES} itemClassName="bg-white/5 text-white/70 ring-1 ring-white/10" />
      </div>
    </section>
  )
}
