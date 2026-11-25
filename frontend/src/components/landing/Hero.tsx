import { ArrowRight, Check, Send, Sparkles } from 'lucide-react'
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { USE_CASES } from './constants'
import { Drift, EASE, Marquee, useParallax, useTypewriter, WordReveal } from './motion'

/* ------------------------------ playground data ------------------------------ */
interface Sample {
  chip: string
  who: string
  initials: string
  message: string
  tags: { label: string; tone: string }[]
  draft: string
  sources: { title: string; snippet: string }[]
}

const SAMPLES: Sample[] = [
  {
    chip: 'I was charged twice',
    who: 'Tom Becker',
    initials: 'TB',
    message: 'Hi, I can see two identical charges of $392 on my card for this month’s invoice. Can you fix this today?',
    tags: [
      { label: 'Billing', tone: 'bg-(--lp-lav-2) text-[#2f2a7a]' },
      { label: 'High priority', tone: 'bg-(--lp-peach-2) text-[#7a3414]' },
      { label: 'Frustrated', tone: 'bg-(--lp-butter-2) text-[#6b4a00]' },
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
    message: 'Everyone gets bounced back to the login page after Okta. We rotated our certificate yesterday and 120 people are locked out.',
    tags: [
      { label: 'Account & Access', tone: 'bg-(--lp-lav-2) text-[#2f2a7a]' },
      { label: 'Critical', tone: 'bg-(--lp-rose-2) text-[#7a1636]' },
      { label: 'Stressed', tone: 'bg-(--lp-butter-2) text-[#6b4a00]' },
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
    message: 'My serving board was dispatched almost two weeks ago and the tracking has not changed. It was meant to be a gift. Has it been lost?',
    tags: [
      { label: 'Shipping', tone: 'bg-(--lp-lav-2) text-[#2f2a7a]' },
      { label: 'High priority', tone: 'bg-(--lp-peach-2) text-[#7a3414]' },
      { label: 'Worried', tone: 'bg-(--lp-butter-2) text-[#6b4a00]' },
    ],
    draft: 'Hi Lucas, I’m sorry, that wait is too long for a gift. Your order left us 13 days ago and the tracking hasn’t moved, so I’m opening a carrier trace and arranging a replacement if it can’t be found.',
    sources: [
      { title: 'Lost parcel policy', snippet: 'If tracking is stale for 10 days we open a carrier trace and offer a free replacement or refund.' },
      { title: 'Order facts', snippet: 'Dispatched 13 days ago, last tracking update 13 days ago.' },
    ],
  },
]

/* ------------------------------ bits ------------------------------ */
const BURST = ['✨', '💜', '🎉', '⭐', '💛', '✨', '🎈', '💚', '⭐', '✨']

function Burst({ runKey }: { runKey: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center" aria-hidden>
      {BURST.map((e, i) => {
        const a = (i / BURST.length) * Math.PI * 2 + 0.4
        const r = 80 + (i % 3) * 28
        return (
          <motion.span
            key={runKey + i}
            initial={{ opacity: 0, x: 0, y: 0, scale: 0.4, rotate: 0 }}
            animate={{ opacity: [0, 1, 1, 0], x: Math.cos(a) * r, y: Math.sin(a) * r - 24, scale: [0.4, 1.3, 1], rotate: (i % 2 ? 1 : -1) * 40 }}
            transition={{ duration: 1.3, ease: 'easeOut' }}
            className="absolute text-2xl"
          >
            {e}
          </motion.span>
        )
      })}
    </div>
  )
}

function Tape({ className }: { className?: string }) {
  return <span aria-hidden className={cn('absolute -top-3 left-1/2 z-10 h-6 w-20 -translate-x-1/2 rounded-sm bg-white/60 shadow-sm ring-1 ring-black/5', className)} />
}

/** The interactive desk: pick a customer message, watch it get triaged and answered. Scripted, no API calls. */
function Desk() {
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState(reduce ? 3 : 0) // 0 note, 1 stickers, 2 typing, 3 sources ready, 4 sent
  const [src, setSrc] = useState<number | null>(null)
  const [run, setRun] = useState(0)
  const auto = useRef(!reduce)
  const sample = SAMPLES[index]
  const typed = useTypewriter(sample.draft, phase >= 2, 16)

  // Drive the script for the current sample.
  useEffect(() => {
    if (reduce) return
    setPhase(0)
    setSrc(null)
    const t1 = window.setTimeout(() => setPhase(1), 650)
    const t2 = window.setTimeout(() => setPhase(2), 1700)
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

  // Autoplay: send, then move on to the next sample, until the visitor takes over.
  useEffect(() => {
    if (reduce || !auto.current) return
    if (phase === 3) {
      const t = window.setTimeout(() => auto.current && setPhase(4), 2600)
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

  // Cursor-follow tilt, gentle. Static for reduced motion.
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 90, damping: 18 })
  const sy = useSpring(my, { stiffness: 90, damping: 18 })
  const rotY = useTransform(sx, [-1, 1], reduce ? [0, 0] : [-5, 5])
  const rotX = useTransform(sy, [-1, 1], reduce ? [0, 0] : [4, -4])
  const noteShift = useTransform(sx, [-1, 1], reduce ? [0, 0] : [-8, 8])
  const draftShift = useTransform(sx, [-1, 1], reduce ? [0, 0] : [10, -10])
  const onMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const r = e.currentTarget.getBoundingClientRect()
      mx.set(((e.clientX - r.left) / r.width) * 2 - 1)
      my.set(((e.clientY - r.top) / r.height) * 2 - 1)
    },
    [mx, my],
  )
  const onLeave = useCallback(() => {
    mx.set(0)
    my.set(0)
  }, [mx, my])

  const sent = phase >= 4

  return (
    <div className="relative mx-auto w-full max-w-[34rem]" onMouseMove={onMove} onMouseLeave={onLeave}>
      <motion.div style={{ rotateX: rotX, rotateY: rotY, transformPerspective: 1200 }} className="relative">
        {/* the desk mat: two tilted pastel sheets behind the cards */}
        <div aria-hidden className="absolute -inset-4 -z-10 rotate-[1.5deg] rounded-[2.6rem] bg-(--lp-lav) ring-1 ring-(--lp-lav-2)/70 sm:-inset-5" />
        <div aria-hidden className="absolute -inset-4 -z-10 -rotate-[1.5deg] rounded-[2.6rem] bg-(--lp-peach)/80 ring-1 ring-(--lp-peach-2)/60 sm:-inset-5" />

        <div className="relative rounded-[2.2rem] bg-white/70 p-4 ring-1 ring-white sm:p-5">
          {/* picker */}
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Pick a customer message to watch">
            <span className="mr-1 text-[11px] font-bold tracking-wide text-(--lp-ink-2) uppercase">Try one</span>
            {SAMPLES.map((s, i) => (
              <button
                key={s.chip}
                type="button"
                role="radio"
                aria-checked={i === index}
                onClick={() => pick(i)}
                className={cn(
                  'lp-focus rounded-full px-3.5 py-1.5 text-[13px] font-semibold ring-1 transition-all',
                  i === index ? 'bg-(--lp-violet) text-white shadow-md ring-(--lp-violet)' : 'bg-white text-(--lp-ink) ring-black/10 hover:-translate-y-0.5 hover:ring-(--lp-violet)/50',
                )}
              >
                {s.chip}
              </button>
            ))}
          </div>

          {/* sticky note: the customer's message */}
          <div className="relative mt-6 min-h-[8.9rem]">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${index}-${run}`}
                style={{ x: noteShift }}
                initial={reduce ? false : { opacity: 0, y: -50, rotate: -9, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, rotate: -1.6, scale: 1 }}
                exit={{ opacity: 0, y: 14, rotate: 2, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                className="relative rounded-md bg-(--lp-butter) p-4 pt-5 shadow-[0_18px_30px_-18px_rgba(150,110,0,0.5)] ring-1 ring-(--lp-butter-2)"
              >
                <Tape className="rotate-2" />
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#6b4a00] ring-1 ring-(--lp-butter-2)">{sample.initials}</span>
                  <p className="text-[13px] font-semibold">{sample.who}</p>
                  <span className="ml-auto text-[11px] text-(--lp-ink-2)">just now</span>
                </div>
                <p className="mt-2.5 text-[14px] leading-relaxed">{sample.message}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* triage stickers */}
          <div className="relative z-10 -mt-3 flex min-h-11 flex-wrap items-center gap-2 pl-3" aria-live="polite">
            <AnimatePresence>
              {phase >= 1 &&
                sample.tags.map((t, i) => (
                  <motion.span
                    key={`${index}-${run}-${t.label}`}
                    initial={reduce ? false : { opacity: 0, scale: 0.2, rotate: -20 }}
                    animate={{ opacity: 1, scale: 1, rotate: [-3, 2, -2][i] }}
                    transition={{ type: 'spring', stiffness: 460, damping: 14, delay: reduce ? 0 : i * 0.18 }}
                    className={cn('rounded-lg px-3 py-1.5 text-[12px] font-bold shadow-[0_8px_14px_-8px_rgba(0,0,0,0.35)] ring-1 ring-white/70', t.tone)}
                  >
                    {t.label}
                  </motion.span>
                ))}
            </AnimatePresence>
            {phase < 1 && <span className="text-[12px] text-(--lp-ink-2)">Triaging…</span>}
          </div>

          {/* AI draft card */}
          <motion.div style={{ x: draftShift }} className="relative mt-3">
            <div className={cn('relative rotate-[0.8deg] rounded-2xl bg-white p-4 shadow-[0_22px_40px_-22px_rgba(70,60,160,0.5)] ring-1 transition-colors', sent ? 'ring-(--lp-mint-2)' : 'ring-(--lp-lav-2)')}>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-bold tracking-wide text-(--lp-violet) uppercase">
                <Sparkles className="size-3.5" /> AI draft
                <span className="ml-auto rounded-full bg-(--lp-lav) px-2.5 py-0.5 text-[10px] font-semibold text-(--lp-ink-2) normal-case">
                  {phase >= 3 ? `${sample.sources.length} sources` : phase >= 2 ? 'writing…' : 'waiting'}
                </span>
              </div>
              <p className="min-h-[6.9rem] text-[13.5px] leading-relaxed sm:min-h-[5.9rem]">
                {phase >= 2 ? typed.shown : <span className="text-(--lp-ink-2)/60">The reply appears here, written from your knowledge base…</span>}
                {phase === 2 && !typed.done && <span className="lp-caret ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-(--lp-violet)" />}
              </p>

              <div className="mt-3 flex min-h-9 flex-wrap items-center gap-2">
                {phase >= 3 &&
                  sample.sources.map((s, i) => (
                    <motion.button
                      key={`${index}-${s.title}`}
                      type="button"
                      initial={reduce ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => {
                        auto.current = false
                        setSrc(src === i ? null : i)
                      }}
                      aria-pressed={src === i}
                      className={cn('lp-focus rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 transition-colors', src === i ? 'bg-(--lp-mint-2) text-[#124a30] ring-(--lp-mint-2)' : 'bg-(--lp-mint) text-[#1d5a3c] ring-(--lp-mint-2) hover:bg-(--lp-mint-2)')}
                    >
                      {i + 1} · {s.title}
                    </motion.button>
                  ))}
                <button
                  type="button"
                  disabled={phase < 3 || sent}
                  onClick={() => {
                    auto.current = false
                    setPhase(4)
                  }}
                  className={cn(
                    'lp-focus ml-auto inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold transition-all',
                    sent ? 'bg-(--lp-mint-2) text-[#124a30]' : phase >= 3 ? 'bg-(--lp-violet) text-white shadow-md hover:scale-[1.04] active:scale-95' : 'bg-black/5 text-(--lp-ink-2)/60',
                  )}
                >
                  {sent ? (
                    <>
                      <Check className="size-4" /> Sent
                    </>
                  ) : (
                    <>
                      <Send className="size-3.5" /> Review &amp; send
                    </>
                  )}
                </button>
              </div>

              <AnimatePresence initial={false}>
                {src !== null && phase >= 3 && (
                  <motion.p
                    key={src}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="mt-2.5 overflow-hidden rounded-xl bg-(--lp-mint) px-3 py-2 text-[12.5px] leading-snug text-[#154a32] ring-1 ring-(--lp-mint-2)"
                  >
                    <b>{sample.sources[src].title}:</b> {sample.sources[src].snippet}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            {sent && <Burst runKey={`${index}-${run}`} />}
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

/* ------------------------------ squiggle underline ------------------------------ */
function Underline() {
  const reduce = useReducedMotion()
  return (
    <svg aria-hidden viewBox="0 0 300 18" preserveAspectRatio="none" className="absolute -bottom-[0.18em] left-0 h-[0.28em] w-full overflow-visible">
      <motion.path
        d="M3 11 C 40 2, 70 17, 110 9 S 180 3, 215 11 S 270 15, 297 6"
        fill="none"
        stroke="var(--lp-coral)"
        strokeWidth="7"
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 1.3, duration: 0.9, ease: EASE }}
      />
    </svg>
  )
}

function Tick({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-[14.5px] font-medium text-(--lp-ink-2)">
      <span className="flex size-5 items-center justify-center rounded-full bg-(--lp-mint-2) text-[#124a30]">
        <Check className="size-3" strokeWidth={3} />
      </span>
      {children}
    </li>
  )
}

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 22, mass: 0.4 })
  const blobA = useParallax(smooth, 300)
  const blobB = useParallax(smooth, -200)
  const blobC = useParallax(smooth, 240)
  const copyY = useParallax(smooth, 60)
  const deskY = useParallax(smooth, -50)

  return (
    <section id="top" ref={ref} data-nav="light" className="relative bg-[linear-gradient(180deg,#fdf6ec_0%,#fff0e6_55%,#f6efff_100%)] pt-32 pb-12 text-(--lp-ink) sm:pt-40">
      {/* pastel glows + floating stickers, clipped so parallax never causes sideways scroll */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <motion.div style={{ y: blobA }} className="absolute -top-32 -left-32 size-[40rem] rounded-full bg-[radial-gradient(circle,var(--lp-peach-2)_0%,transparent_65%)] opacity-70 blur-3xl" />
        <motion.div style={{ y: blobB }} className="absolute top-10 -right-32 size-[38rem] rounded-full bg-[radial-gradient(circle,var(--lp-lav-2)_0%,transparent_65%)] opacity-80 blur-3xl" />
        <motion.div style={{ y: blobC }} className="absolute top-[34rem] left-1/3 size-[30rem] rounded-full bg-[radial-gradient(circle,var(--lp-mint-2)_0%,transparent_65%)] opacity-70 blur-3xl" />
        <Drift speed={0.9} rotate={25} className="top-[14%] left-[46%] size-14">
          <svg viewBox="0 0 24 24" className="size-full text-(--lp-butter-2)" fill="currentColor"><path d="M12 1.5l2.8 6.6 7.2.6-5.5 4.7 1.7 7-6.2-3.8-6.2 3.8 1.7-7L2 8.7l7.2-.6z" /></svg>
        </Drift>
        <Drift speed={0.6} rotate={-30} className="top-[62%] left-[3%] size-12"><div className="size-full rounded-full border-[5px] border-(--lp-lav-2)" /></Drift>
        <Drift speed={1.1} rotate={30} className="top-[8%] right-[3%] h-8 w-24">
          <svg viewBox="0 0 96 32" className="size-full" fill="none" stroke="var(--lp-rose-2)" strokeWidth="5" strokeLinecap="round"><path d="M4 18 C 16 4, 26 30, 38 16 S 62 4, 74 18 S 88 26, 92 14" /></svg>
        </Drift>
        <Drift speed={0.7} rotate={20} className="top-[70%] right-[44%] size-10"><div className="size-full rounded-xl bg-(--lp-sky-2)/80" /></Drift>
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.12fr_1fr] lg:gap-10 xl:gap-16">
        <motion.div style={{ y: copyY }} className="text-center lg:text-left">
          <h1 className="text-[clamp(2.6rem,4.9vw,4.9rem)] leading-[1] font-semibold tracking-[-0.045em] text-balance">
            <WordReveal text="Answer customers faster." onMount delay={0.1} />
            <br />
            <span className="inline-block">
              <WordReveal text="Show your" onMount delay={0.5} />{' '}
              <span className="relative inline-block">
                <WordReveal text="sources." onMount delay={0.75} className="text-(--lp-violet)" />
                <Underline />
              </span>
            </span>
          </h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.7 }} className="mx-auto mt-7 max-w-xl text-lg text-(--lp-ink-2) sm:text-xl lg:mx-0">
            Every ticket is triaged the second it lands, and your team opens it to a ready reply drafted from your own knowledge base. Review, edit, send.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.15, duration: 0.7 }} className="mt-9 flex flex-col items-center gap-4 sm:flex-row lg:items-center">
            <a href="#demo" className="lp-focus group flex h-14 items-center gap-2 rounded-full bg-(--lp-violet) px-8 text-base font-semibold text-white shadow-[0_14px_30px_-12px_rgba(94,91,217,0.7)] transition-all hover:scale-[1.04] hover:bg-(--lp-violet-2)">
              Try the live demo <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </a>
            <a href="#story" className="lp-focus group flex h-14 items-center gap-1.5 rounded-full px-3 text-base font-semibold text-(--lp-ink) underline decoration-(--lp-lav-2) decoration-2 underline-offset-8 transition-colors hover:decoration-(--lp-violet)">
              See how it works <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </a>
          </motion.div>

          <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 0.8 }} className="mt-8 flex flex-col items-center gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 lg:justify-start">
            <Tick>No signup</Tick>
            <Tick>Private sandbox</Tick>
            <Tick>Real AI</Tick>
          </motion.ul>
        </motion.div>

        <motion.div style={{ y: deskY }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.9, ease: EASE }} className="px-1 sm:px-4">
          <Desk />
        </motion.div>
      </div>

      {/* use-case marquee: lives inside the hero's own bottom padding so the next section's rounded top can't cover it */}
      <div className="relative mt-20 border-t border-black/[0.06] py-6">
        <Marquee
          items={USE_CASES}
          itemClassName={[
            'bg-(--lp-lav) text-(--lp-ink) ring-1 ring-(--lp-lav-2)',
            'bg-(--lp-mint) text-(--lp-ink) ring-1 ring-(--lp-mint-2)',
            'bg-(--lp-peach) text-(--lp-ink) ring-1 ring-(--lp-peach-2)',
            'bg-(--lp-butter) text-(--lp-ink) ring-1 ring-(--lp-butter-2)',
            'bg-(--lp-sky) text-(--lp-ink) ring-1 ring-(--lp-sky-2)',
            'bg-(--lp-rose) text-(--lp-ink) ring-1 ring-(--lp-rose-2)',
          ]}
        />
      </div>
    </section>
  )
}
