import { ArrowRight, Check, Play, Send, Sparkles, Star } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { EASE, useParallax, useTypewriter, WordReveal } from './motion'

/* ------------------------------ scripted playground ------------------------------ */
type Tone = 'red' | 'orange' | 'violet' | 'amber' | 'green'

interface Sample {
  chip: string
  who: string
  initials: string
  subject: string
  ref: string
  priority: { label: string; tone: Tone }
  message: string
  tags: { label: string; tone: Tone }[]
  draft: string
  sources: { title: string; snippet: string }[]
}

const SAMPLES: Sample[] = [
  {
    chip: 'I was charged twice',
    who: 'Tom Becker',
    initials: 'TB',
    subject: 'Charged twice for this month’s invoice',
    ref: 'TKT-0003',
    priority: { label: 'High', tone: 'orange' },
    message: 'Hi, I can see two identical charges of $392 on my card for this month’s invoice. Can you fix this today?',
    tags: [
      { label: 'Billing', tone: 'violet' },
      { label: 'High priority', tone: 'orange' },
      { label: 'Frustrated', tone: 'amber' },
    ],
    draft: 'Hi Tom, sorry about the double charge. I can see both $392 payments against invoice INV-5877 and I’m refunding the duplicate now. It should reach your card within 5-10 business days.',
    sources: [
      { title: 'Refunds and credits', snippet: 'A duplicate charge is refunded in full regardless of timing, back to the original payment method in 5-10 business days.' },
      { title: 'Invoice INV-5877', snippet: 'Growth plan, 4 seats, $392. Two identical payments recorded on the same day.' },
    ],
  },
  {
    chip: 'SSO is locked out',
    who: 'Sofia Alvarez',
    initials: 'SA',
    subject: 'Entire company locked out via Okta SSO',
    ref: 'TKT-0004',
    priority: { label: 'Critical', tone: 'red' },
    message: 'Everyone gets bounced back to the login page after Okta. We rotated our certificate yesterday and 120 people are locked out.',
    tags: [
      { label: 'Account & Access', tone: 'violet' },
      { label: 'Critical', tone: 'red' },
      { label: 'Stressed', tone: 'amber' },
    ],
    draft: 'Hi Sofia, that redirect loop matches the certificate you rotated. Upload the new certificate under Settings > Security > SSO. If you can’t reach it, the owner’s emergency login link works for 30 minutes.',
    sources: [
      { title: 'SSO and login issues', snippet: 'Redirects back to login usually mean a rotated IdP signing certificate. Upload the new one in Settings > Security > SSO.' },
      { title: 'Emergency login link', snippet: 'Sent to the workspace owner, valid for 30 minutes, bypasses SSO once.' },
    ],
  },
  {
    chip: 'Where is my parcel?',
    who: 'Lucas Meyer',
    initials: 'LM',
    subject: 'Parcel hasn’t moved for two weeks',
    ref: 'TKT-0001',
    priority: { label: 'High', tone: 'orange' },
    message: 'My serving board was dispatched almost two weeks ago and the tracking has not changed. It was meant to be a gift. Has it been lost?',
    tags: [
      { label: 'Shipping', tone: 'violet' },
      { label: 'High priority', tone: 'orange' },
      { label: 'Worried', tone: 'amber' },
    ],
    draft: 'Hi Lucas, I’m sorry, that wait is too long for a gift. Your order left us 13 days ago and the tracking hasn’t moved, so I’m opening a carrier trace and arranging a replacement if it can’t be found.',
    sources: [
      { title: 'Lost parcel policy', snippet: 'If tracking is stale for 10 days we open a carrier trace and offer a free replacement or refund.' },
      { title: 'Order facts', snippet: 'Dispatched 13 days ago, last tracking update 13 days ago.' },
    ],
  },
]

const TONES: Record<Tone, string> = {
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  orange: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
}

function Chip({ tone, children, delay = 0 }: { tone: Tone; children: ReactNode; delay?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 16, delay }}
      className={cn('rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset', TONES[tone])}
    >
      {children}
    </motion.span>
  )
}

/** One consistent satellite look: same radius, border and shadow everywhere. */
function Sat({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-3xl bg-white p-5 text-(--lp-ink) shadow-[0_24px_60px_-24px_rgba(60,40,140,0.35)] ring-1 ring-black/[0.06]', className)}>{children}</div>
}

function SlaRing() {
  const r = 26
  const len = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 64 64" className="size-14 shrink-0 -rotate-90" aria-hidden>
      <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(11,10,29,0.08)" strokeWidth="7" />
      <circle cx="32" cy="32" r={r} fill="none" stroke="#5b3df5" strokeWidth="7" strokeLinecap="round" strokeDasharray={len} style={{ ['--ring-len' as string]: `${len * 0.72}px`, animation: 'lp-ring 6s ease-in-out infinite alternate' }} />
    </svg>
  )
}

/* ------------------------------ the scene ------------------------------ */
/** Parallax floats only apply when the satellites float around the card (xl); below that they sit in a tidy row. */
function useIsXl() {
  const [yes, setYes] = useState(() => (typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1280px)').matches))
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    const on = () => setYes(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return yes
}

function Scene({ progress }: { progress: ReturnType<typeof useScroll>['scrollYProgress'] }) {
  const reduce = useReducedMotion()
  const xl = useIsXl()
  // Gentle parallax: the composition drifts a little, it never falls apart.
  const left = useParallax(progress, -90)
  const right = useParallax(progress, -130)
  const low = useParallax(progress, -70)
  const lowLeft = useParallax(progress, -110)

  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState(reduce ? 3 : 0) // 0 message, 1 triage, 2 typing, 3 sources ready, 4 sent
  const [src, setSrc] = useState<number | null>(null)
  const [run, setRun] = useState(0)
  const auto = useRef(!reduce)
  const sample = SAMPLES[index]
  const typed = useTypewriter(sample.draft, phase >= 2, 16)
  const sent = phase >= 4

  useEffect(() => {
    if (reduce) return
    setPhase(0)
    setSrc(null)
    const t1 = window.setTimeout(() => setPhase(1), 600)
    const t2 = window.setTimeout(() => setPhase(2), 1500)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [index, run, reduce])

  useEffect(() => {
    if (reduce || phase !== 2 || !typed.done) return
    const t = window.setTimeout(() => setPhase(3), 250)
    return () => window.clearTimeout(t)
  }, [phase, typed.done, reduce])

  // Autoplay: send, then move to the next sample, until the visitor takes over.
  useEffect(() => {
    if (reduce || !auto.current) return
    if (phase === 3) {
      const t = window.setTimeout(() => auto.current && setPhase(4), 2800)
      return () => window.clearTimeout(t)
    }
    if (phase === 4) {
      const t = window.setTimeout(() => auto.current && setIndex((i) => (i + 1) % SAMPLES.length), 2800)
      return () => window.clearTimeout(t)
    }
  }, [phase, reduce])

  const pick = (i: number) => {
    auto.current = false
    if (i === index) setRun((r) => r + 1)
    setIndex(i)
  }

  return (
    <div className="relative mx-auto mt-12 w-full max-w-6xl text-left sm:mt-14">
      {/* try-a-message tabs */}
      <div className="relative z-10 mx-auto mb-5 flex max-w-[44rem] flex-wrap items-center justify-center gap-2" role="tablist" aria-label="Pick a customer message to watch">
        <span className="mr-1 text-xs font-semibold tracking-wide text-neutral-500 uppercase">Try a message</span>
        {SAMPLES.map((s, i) => (
          <button
            key={s.chip}
            type="button"
            role="tab"
            aria-selected={i === index}
            onClick={() => pick(i)}
            className={cn(
              'lp-focus rounded-full px-4 py-2 text-[13px] font-semibold whitespace-nowrap transition-all',
              i === index ? 'bg-(--lp-ink) text-white shadow-[0_10px_24px_-10px_rgba(11,10,29,0.6)]' : 'bg-white text-neutral-700 ring-1 ring-black/10 hover:ring-black/25',
            )}
          >
            {s.chip}
          </button>
        ))}
      </div>

      {/* focal card */}
      <div className="relative z-10 mx-auto w-full max-w-[44rem]">
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.45, ease: EASE }} className="rounded-[2rem] bg-white p-3 shadow-[0_50px_110px_-34px_rgba(91,61,245,0.45)] ring-1 ring-black/[0.07] sm:p-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={`${index}-${run}`} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.28, ease: EASE }}>
              <div className="flex items-center gap-3 px-2 pt-1 pb-3 sm:px-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-300 text-xs font-bold text-orange-950">{sample.initials}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{sample.subject}</p>
                  <p className="text-xs text-neutral-500">
                    {sample.ref} · {sample.who} · just now
                  </p>
                </div>
                <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset', TONES[sample.priority.tone])}>{sample.priority.label}</span>
              </div>
              <p className="mx-1 min-h-[4.9rem] rounded-2xl bg-neutral-100 px-4 py-3 text-[13.5px] leading-relaxed text-neutral-800 sm:mx-2 sm:min-h-[4.4rem]">{sample.message}</p>
            </motion.div>
          </AnimatePresence>

          <div className={cn('mx-1 mt-3 rounded-2xl p-4 ring-1 transition-colors duration-500 sm:mx-2', sent ? 'bg-emerald-50 ring-emerald-200' : 'bg-linear-to-br from-violet-50 via-fuchsia-50/70 to-white ring-violet-200')}>
            <div className={cn('mb-2 flex items-center gap-2 text-[11px] font-bold tracking-wide uppercase', sent ? 'text-emerald-700' : 'text-violet-700')}>
              <Sparkles className="size-3.5" /> AI draft
              <span className="ml-auto rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold text-neutral-500 ring-1 ring-black/10 normal-case">
                {phase >= 3 ? `${sample.sources.length} sources` : phase >= 2 ? 'Writing…' : 'Waiting'}
              </span>
            </div>
            <p className="min-h-[6.9rem] text-[13.5px] leading-relaxed text-neutral-800 sm:min-h-[5.6rem]">
              {phase >= 2 ? typed.shown : <span className="text-neutral-400">The reply appears here, written from your knowledge base.</span>}
              {phase === 2 && !typed.done && <span className="lp-caret ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-(--lp-violet)" />}
            </p>
            <div className="mt-3 flex min-h-8 flex-wrap items-center gap-2">
              {phase >= 3 &&
                sample.sources.map((s, i) => (
                  <button
                    key={`${index}-${s.title}`}
                    type="button"
                    aria-pressed={src === i}
                    onClick={() => {
                      auto.current = false
                      setSrc(src === i ? null : i)
                    }}
                    className={cn('lp-focus rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition-colors', src === i ? 'bg-violet-100 text-violet-900 ring-violet-400' : 'bg-white text-violet-800 ring-violet-200 hover:ring-violet-400')}
                  >
                    {i + 1} · {s.title}
                  </button>
                ))}
              <button
                type="button"
                disabled={phase < 3 || sent}
                onClick={() => {
                  auto.current = false
                  setPhase(4)
                }}
                className={cn(
                  'lp-focus ml-auto flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-colors',
                  sent ? 'bg-emerald-600 text-white' : phase >= 3 ? 'bg-(--lp-ink) text-white hover:bg-black' : 'bg-neutral-200 text-neutral-400',
                )}
              >
                {sent ? (
                  <>
                    <Check className="size-3" /> Sent
                  </>
                ) : (
                  <>
                    Review &amp; send <Send className="size-3" />
                  </>
                )}
              </button>
            </div>
            {/* reserved space so revealing a snippet never shifts the layout */}
            <div className="mt-2 min-h-[3.4rem]">
              <AnimatePresence mode="wait" initial={false}>
                {src !== null && phase >= 3 && (
                  <motion.p key={src} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="rounded-xl bg-white px-3 py-2 text-[12.5px] leading-snug text-neutral-600 ring-1 ring-violet-100">
                    <b className="text-(--lp-ink)">{sample.sources[src].title}:</b> {sample.sources[src].snippet}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>

      {/* satellites: a tidy row below the card on small screens, floating around it on xl */}
      <div className="mx-auto mt-5 grid max-w-[44rem] grid-cols-2 gap-3 sm:grid-cols-4 xl:contents">
        <motion.div style={xl ? { y: left } : undefined} className="col-span-2 sm:col-span-1 xl:absolute xl:top-24 xl:left-0 xl:w-56">
          <Sat className="lp-float h-full">
            <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-neutral-500 uppercase">
              <Sparkles className="size-3.5 text-(--lp-violet)" /> Instant triage
            </p>
            <div className="flex min-h-[4.6rem] flex-wrap content-start gap-1.5">
              {phase >= 1 ? (
                sample.tags.map((t, i) => (
                  <Chip key={`${index}-${run}-${t.label}`} tone={t.tone} delay={reduce ? 0 : 0.1 + i * 0.2}>
                    {t.label}
                  </Chip>
                ))
              ) : (
                <span className="text-xs text-neutral-400">Analysing…</span>
              )}
            </div>
          </Sat>
        </motion.div>

        <motion.div style={xl ? { y: right } : undefined} className="col-span-2 sm:col-span-1 xl:absolute xl:top-6 xl:right-0 xl:w-56">
          <Sat className="lp-float flex h-full items-center gap-3 [animation-delay:-2s]">
            <SlaRing />
            <div>
              <p className="text-[11px] font-bold tracking-wide text-neutral-500 uppercase">SLA</p>
              <p className="text-lg leading-tight font-semibold">Reply in 1h</p>
            </div>
          </Sat>
        </motion.div>

        <motion.div style={xl ? { y: low } : undefined} className="col-span-2 sm:col-span-1 xl:absolute xl:right-2 xl:bottom-12 xl:w-60">
          <Sat className="lp-float h-full [animation-delay:-4s]">
            <div className="flex items-center gap-3">
              <motion.span animate={reduce ? undefined : { rotate: [0, -14, 14, -8, 0], scale: [1, 1.2, 1] }} transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.4 }} className="text-3xl leading-none" aria-hidden>
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

        <motion.div style={xl ? { y: lowLeft } : undefined} className="col-span-2 sm:col-span-1 xl:absolute xl:bottom-6 xl:left-4 xl:w-60">
          <Sat className="lp-float h-full [animation-delay:-1s]">
            <div className="flex min-h-[3.2rem] items-center gap-3">
              <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-500', sent ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700')}>
                {sent ? <Check className="size-4" strokeWidth={3} /> : <Send className="size-4" />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{sent ? 'Reply sent' : 'Waiting for review'}</p>
                <p className="text-xs text-neutral-500">{sent ? `${sample.who.split(' ')[0]} sees it live` : 'A person approves every reply'}</p>
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
    <section id="top" ref={ref} data-nav="light" className="relative bg-[linear-gradient(180deg,#f6f2ff_0%,#fbf9f4_55%,#fbf9f4_100%)] pt-32 pb-20 text-(--lp-ink) sm:pt-40 sm:pb-24">
      {/* soft aurora + grid, clipped so parallax blobs never cause horizontal scroll */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <motion.div style={{ y: blobA }} className="absolute -top-40 -left-40 size-[44rem] rounded-full bg-[radial-gradient(circle,#8b6cff_0%,transparent_65%)] opacity-35 blur-3xl" />
        <motion.div style={{ y: blobB }} className="absolute top-10 -right-40 size-[40rem] rounded-full bg-[radial-gradient(circle,#ff8a6b_0%,transparent_65%)] opacity-30 blur-3xl" />
        <motion.div style={{ y: blobC }} className="absolute top-[34rem] left-1/3 size-[34rem] rounded-full bg-[radial-gradient(circle,#c8f560_0%,transparent_65%)] opacity-45 blur-3xl" />
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

          <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.35, duration: 0.7 }} className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-neutral-600">
            {['No signup', 'Private sandbox', 'Real AI'].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {t}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        <Scene progress={smooth} />
      </div>
    </section>
  )
}
