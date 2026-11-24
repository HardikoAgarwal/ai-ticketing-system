import { ArrowRight, Play, Sparkles, Star } from 'lucide-react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { useRef, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { USE_CASES } from './constants'
import { Drift, EASE, Marquee, useParallax, useTypewriter, WordReveal } from './motion'

const DRAFT =
  'Hi Priya, I’m sorry about the timing. Your Segment pipeline is Degraded: the last sync was 3 hours ago and about 120,000 events are delayed. They backfill automatically for up to 72 hours, so nothing is lost.'

function Chip({ children, tone, i = 0 }: { children: ReactNode; tone: 'red' | 'violet' | 'amber' | 'green'; i?: number }) {
  const t = {
    red: 'bg-red-50 text-red-700 ring-red-600/20',
    violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
    amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  }[tone]
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 16, delay: 1.3 + i * 0.22 }}
      className={cn('rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset', t)}
    >
      {children}
    </motion.span>
  )
}

/** One consistent satellite-card look: same radius, border and shadow everywhere. */
function Sat({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-3xl bg-white p-5 text-(--lp-ink) shadow-[0_24px_60px_-24px_rgba(60,40,140,0.35)] ring-1 ring-black/[0.06]', className)}>{children}</div>
}

function SlaRing() {
  const r = 26
  const len = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 64 64" className="size-14 shrink-0 -rotate-90">
      <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(11,10,29,0.08)" strokeWidth="7" />
      <circle cx="32" cy="32" r={r} fill="none" stroke="#5b3df5" strokeWidth="7" strokeLinecap="round" strokeDasharray={len} style={{ ['--ring-len' as string]: `${len * 0.72}px`, animation: 'lp-ring 6s ease-in-out infinite alternate' }} />
    </svg>
  )
}

function Scene({ progress }: { progress: ReturnType<typeof useScroll>['scrollYProgress'] }) {
  // Gentle parallax: the composition drifts a little, it never falls apart.
  const main = useParallax(progress, 0)
  const left = useParallax(progress, -110)
  const right = useParallax(progress, -150)
  const low = useParallax(progress, -90)
  const { shown, done } = useTypewriter(DRAFT, true, 18)

  return (
    <div className="relative mx-auto mt-14 w-full max-w-6xl text-left sm:mt-16">
      {/* focal card */}
      <motion.div style={{ y: main }} className="relative z-10 mx-auto w-full max-w-[44rem]">
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.45, ease: EASE }} className="rounded-[2rem] bg-white p-3 shadow-[0_50px_110px_-34px_rgba(91,61,245,0.45)] ring-1 ring-black/[0.07] sm:p-4">
          <div className="flex items-center gap-3 px-2 pt-1 pb-3 sm:px-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-300 text-xs font-bold text-orange-950">PR</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Segment events missing since this morning</p>
              <p className="text-xs text-neutral-500">TKT-0001 · Priya Raman · 5 min ago</p>
            </div>
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 ring-1 ring-red-600/20 ring-inset">Critical</span>
          </div>
          <p className="mx-1 rounded-2xl bg-neutral-100 px-4 py-3 text-[13.5px] leading-relaxed text-neutral-800 sm:mx-2">None of our Segment events have shown up since about 6am UTC. We have a launch review in a few hours. Is this on your side?</p>
          <div className="mx-1 mt-3 rounded-2xl bg-linear-to-br from-violet-50 via-fuchsia-50/70 to-white p-4 ring-1 ring-violet-200 sm:mx-2">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold tracking-wide text-violet-700 uppercase">
              <Sparkles className="size-3.5" /> AI draft
              <span className="ml-auto rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold text-neutral-500 ring-1 ring-violet-200 normal-case">2 sources</span>
            </div>
            <p className="min-h-[6.6rem] text-[13.5px] leading-relaxed text-neutral-800 sm:min-h-[5.6rem]">
              {shown}
              {!done && <span className="lp-caret ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-(--lp-violet)" />}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-violet-800 ring-1 ring-violet-200">Segment sync troubleshooting</span>
              <span className="hidden rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-violet-800 ring-1 ring-violet-200 sm:inline">Incident response</span>
              <span className="ml-auto flex items-center gap-1.5 rounded-full bg-(--lp-ink) px-3.5 py-1.5 text-[11px] font-semibold text-white">
                Review &amp; send <ArrowRight className="size-3" />
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* satellites: a tidy row below the card on small screens, floating beside it on xl */}
      <div className="mx-auto mt-5 grid max-w-[44rem] grid-cols-2 gap-3 sm:grid-cols-3 xl:contents">
        <motion.div style={{ y: left }} className="col-span-2 sm:col-span-1 xl:absolute xl:top-20 xl:left-0 xl:w-56">
          <Sat className="lp-float">
            <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-neutral-500 uppercase">
              <Sparkles className="size-3.5 text-(--lp-violet)" /> Instant triage
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Chip tone="red" i={0}>Critical</Chip>
              <Chip tone="violet" i={1}>Integrations</Chip>
              <Chip tone="amber" i={2}>Frustrated</Chip>
            </div>
          </Sat>
        </motion.div>

        <motion.div style={{ y: right }} className="xl:absolute xl:top-4 xl:right-0 xl:w-56">
          <Sat className="lp-float flex items-center gap-3 [animation-delay:-2s]">
            <SlaRing />
            <div>
              <p className="text-[11px] font-bold tracking-wide text-neutral-500 uppercase">SLA</p>
              <p className="text-lg leading-tight font-semibold">Reply in 1h</p>
            </div>
          </Sat>
        </motion.div>

        <motion.div style={{ y: low }} className="xl:absolute xl:right-2 xl:bottom-10 xl:w-60">
          <Sat className="lp-float [animation-delay:-4s]">
            <div className="flex items-center gap-3">
              <motion.span animate={{ rotate: [0, -14, 14, -8, 0], scale: [1, 1.2, 1] }} transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.4 }} className="text-3xl leading-none" aria-hidden>
                🎉
              </motion.span>
              <div>
                <p className="text-sm font-semibold">Resolved in 38 min</p>
                <div className="mt-1 flex gap-0.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 12, delay: 2 + i * 0.12 }}>
                      <Star className="size-4 fill-(--lp-amber) text-(--lp-amber)" />
                    </motion.span>
                  ))}
                </div>
              </div>
            </div>
          </Sat>
        </motion.div>
      </div>
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
  const titleY = useParallax(smooth, 70)
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
