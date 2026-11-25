import { ArrowRight, Check, Link2, Play, Send, Sparkles, Star } from 'lucide-react'
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react'
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { EASE, useParallax, useTypewriter, WordReveal } from './motion'

/* ------------------------------ scripted playground ------------------------------ */
interface Sample {
  chip: string
  who: string
  initials: string
  message: string
  tags: { label: string; tone: string }[]
  draft: string
  sources: { title: string; snippet: string }[]
}

const TAG = {
  topic: 'bg-(--lp-lav-2) text-[#2f2a7a]',
  high: 'bg-(--lp-peach-2) text-[#7a3414]',
  critical: 'bg-(--lp-rose-2) text-[#7a1636]',
  mood: 'bg-(--lp-butter-2) text-[#6b4a00]',
}

const SAMPLES: Sample[] = [
  {
    chip: 'I was charged twice',
    who: 'Tom Becker',
    initials: 'TB',
    message: 'Hi, I can see two identical charges of $392 on my card for this month’s invoice. Can you fix this today?',
    tags: [
      { label: 'Billing', tone: TAG.topic },
      { label: 'High priority', tone: TAG.high },
      { label: 'Frustrated', tone: TAG.mood },
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
      { label: 'Account & Access', tone: TAG.topic },
      { label: 'Critical', tone: TAG.critical },
      { label: 'Stressed', tone: TAG.mood },
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
      { label: 'Shipping', tone: TAG.topic },
      { label: 'High priority', tone: TAG.high },
      { label: 'Worried', tone: TAG.mood },
    ],
    draft: 'Hi Lucas, I’m sorry, that wait is too long for a gift. Your order left us 13 days ago and the tracking hasn’t moved, so I’m opening a carrier trace and arranging a replacement if it can’t be found.',
    sources: [
      { title: 'Lost parcel policy', snippet: 'If tracking is stale for 10 days we open a carrier trace and offer a free replacement or refund.' },
      { title: 'Order facts', snippet: 'Dispatched 13 days ago, last tracking update 13 days ago.' },
    ],
  },
]

/* ------------------------------ small pieces ------------------------------ */
const BURST = ['✨', '💜', '🎉', '⭐', '💛', '✨', '🎈', '💚', '⭐', '✨']

function Burst({ runKey }: { runKey: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center" aria-hidden>
      {BURST.map((e, i) => {
        const a = (i / BURST.length) * Math.PI * 2 + 0.4
        const r = 90 + (i % 3) * 30
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
  return <span aria-hidden className={cn('absolute -top-3 left-1/2 z-10 h-6 w-20 -translate-x-1/2 rounded-sm bg-white/70 shadow-sm ring-1 ring-black/5', className)} />
}

/** One satellite look: same radius, ring and shadow everywhere. */
function Sat({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-3xl bg-white p-4 text-(--lp-ink) shadow-(--lp-shadow) ring-1 ring-black/[0.06]', className)}>{children}</div>
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

/** Satellite cards float around the desk on xl and tidy up into a grid below it on smaller screens. */
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

/** Depth layer: a little scroll parallax plus a cursor offset, so nearer cards move more than the desk. */
function useDepth(scroll: MotionValue<number>, scrollRange: number, mx: MotionValue<number>, my: MotionValue<number>, depth: number, enabled: boolean) {
  const sy = useParallax(scroll, scrollRange)
  const x = useTransform(mx, (v) => (enabled ? v * depth : 0))
  const y = useTransform([sy, my], ([a, b]: number[]) => a + (enabled ? b * depth * 0.7 : 0))
  return { x, y }
}

/* ------------------------------ the scene ------------------------------ */
function Scene({ progress }: { progress: MotionValue<number> }) {
  const reduce = useReducedMotion()
  const xl = useIsXl()

  // cursor position (-1..1) over the whole scene; springs keep it soft
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
      if (reduce) return
      const r = e.currentTarget.getBoundingClientRect()
      mx.set(((e.clientX - r.left) / r.width) * 2 - 1)
      my.set(((e.clientY - r.top) / r.height) * 2 - 1)
    },
    [mx, my, reduce],
  )
  const onLeave = useCallback(() => {
    mx.set(0)
    my.set(0)
  }, [mx, my])

  const dupe = useDepth(progress, -90, sx, sy, 22, xl)
  const sla = useDepth(progress, -130, sx, sy, -26, xl)
  const done = useDepth(progress, -70, sx, sy, -34, xl)
  const status = useDepth(progress, -110, sx, sy, 30, xl)

  // scripted playground
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState(reduce ? 3 : 0) // 0 note, 1 stickers, 2 typing, 3 sources ready, 4 sent
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

  return (
    <div className="relative mx-auto mt-12 w-full max-w-6xl text-left sm:mt-14" onMouseMove={onMove} onMouseLeave={onLeave}>
      {/* the desk, centred under the headline */}
      <div className="relative z-10 mx-auto w-full max-w-[44rem]">
        <motion.div initial={reduce ? false : { opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.45, ease: EASE }}>
          <motion.div style={{ rotateX: rotX, rotateY: rotY, transformPerspective: 1400 }} className="relative">
            {/* the desk mat: two tilted sheets behind the cards */}
            <div aria-hidden className="absolute -inset-4 -z-10 rotate-[1.6deg] rounded-[2.6rem] bg-(--lp-lav-2) ring-1 ring-black/[0.05] sm:-inset-5" />
            <div aria-hidden className="absolute -inset-4 -z-10 -rotate-[1.6deg] rounded-[2.6rem] bg-(--lp-mint-2) ring-1 ring-black/[0.05] sm:-inset-5" />

            <div className="relative rounded-[2.2rem] bg-white/80 p-4 shadow-(--lp-shadow) ring-1 ring-white sm:p-5">
              {/* picker */}
              <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Pick a customer message to watch">
                <span className="mr-1 text-xs font-semibold text-(--lp-muted)">Try one:</span>
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
                    animate={{ opacity: 1, y: 0, rotate: -1.4, scale: 1 }}
                    exit={{ opacity: 0, y: 14, rotate: 2, scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                    className="relative rounded-md bg-(--lp-butter) p-4 pt-5 shadow-[0_18px_30px_-18px_rgba(150,110,0,0.5)] ring-1 ring-(--lp-butter-2)"
                  >
                    <Tape className="rotate-2" />
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#6b4a00] ring-1 ring-(--lp-butter-2)">{sample.initials}</span>
                      <p className="text-[13px] font-semibold">{sample.who}</p>
                      <span className="ml-auto text-[11px] text-(--lp-muted)">just now</span>
                    </div>
                    <p className="mt-2.5 text-[14px] leading-relaxed">{sample.message}</p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* triage stickers */}
              <div className="relative z-10 -mt-3 flex min-h-11 flex-wrap items-center gap-2 pl-3" aria-live="polite">
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
                {phase < 1 && <span className="text-[12px] text-(--lp-muted)">Triaging…</span>}
              </div>

              {/* AI draft card */}
              <motion.div style={{ x: draftShift }} className="relative mt-3">
                <div className={cn('relative rotate-[0.6deg] rounded-2xl bg-white p-4 shadow-[0_22px_40px_-22px_rgba(70,60,160,0.5)] ring-1 transition-colors', sent ? 'ring-(--lp-mint-2)' : 'ring-(--lp-lav-2)')}>
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold text-(--lp-violet)">
                    <Sparkles className="size-3.5" /> AI draft
                    <span className="ml-auto rounded-full bg-(--lp-lav) px-2.5 py-0.5 text-[10px] font-semibold text-(--lp-muted)">
                      {phase >= 3 ? `${sample.sources.length} sources` : phase >= 2 ? 'writing…' : 'waiting'}
                    </span>
                  </div>
                  <p className="min-h-[6.9rem] text-[13.5px] leading-relaxed sm:min-h-[5.9rem]">
                    {phase >= 2 ? typed.shown : <span className="text-(--lp-muted)/70">The reply appears here, written from your knowledge base…</span>}
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
                        sent ? 'bg-(--lp-mint-2) text-[#124a30]' : phase >= 3 ? 'bg-(--lp-violet) text-white shadow-md hover:scale-[1.04] active:scale-95' : 'bg-black/5 text-(--lp-muted)/70',
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

                  {/* reserved space so revealing a snippet never shifts the layout */}
                  <div className="mt-2 min-h-[3.4rem]">
                    <AnimatePresence mode="wait" initial={false}>
                      {src !== null && phase >= 3 && (
                        <motion.p key={src} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="rounded-xl bg-(--lp-mint) px-3 py-2 text-[12.5px] leading-snug text-[#154a32] ring-1 ring-(--lp-mint-2)">
                          <b>{sample.sources[src].title}:</b> {sample.sources[src].snippet}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                {sent && <Burst runKey={`${index}-${run}`} />}
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* satellites: always IN FRONT of the desk (z-20). Floating around it on xl, a tidy grid below it otherwise. */}
      <div className="relative z-20 mx-auto mt-6 grid max-w-[44rem] grid-cols-1 gap-3 sm:grid-cols-2 xl:contents">
        <motion.div style={xl ? dupe : undefined} className="xl:absolute xl:top-20 xl:left-2 xl:z-20 xl:w-56">
          <Sat className="lp-float h-full">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-(--lp-lav) text-(--lp-violet)">
                <Link2 className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Duplicate spotted</p>
                <p className="text-xs text-(--lp-muted)">92% match with TKT-0004</p>
              </div>
            </div>
          </Sat>
        </motion.div>

        <motion.div style={xl ? sla : undefined} className="xl:absolute xl:top-2 xl:right-2 xl:z-20 xl:w-52">
          <Sat className="lp-float flex h-full items-center gap-3 [animation-delay:-2s]">
            <SlaRing />
            <div>
              <p className="text-xs font-semibold text-(--lp-muted)">SLA timer</p>
              <p className="text-lg leading-tight font-semibold">Reply in 1h</p>
            </div>
          </Sat>
        </motion.div>

        <motion.div style={xl ? status : undefined} className="xl:absolute xl:bottom-28 xl:left-0 xl:z-20 xl:w-60">
          <Sat className="lp-float h-full [animation-delay:-1s]">
            <div className="flex min-h-[2.6rem] items-center gap-3">
              <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full transition-colors duration-500', sent ? 'bg-(--lp-mint-2) text-[#124a30]' : 'bg-(--lp-lav) text-(--lp-violet)')}>
                {sent ? <Check className="size-5" strokeWidth={3} /> : <Send className="size-4" />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{sent ? 'Reply sent' : 'Waiting for review'}</p>
                <p className="text-xs text-(--lp-muted)">{sent ? `${sample.who.split(' ')[0]} sees it live` : 'A person approves every reply'}</p>
              </div>
            </div>
          </Sat>
        </motion.div>

        <motion.div style={xl ? done : undefined} className="xl:absolute xl:right-0 xl:bottom-14 xl:z-20 xl:w-60">
          <Sat className="lp-float h-full [animation-delay:-4s]">
            <div className="flex items-center gap-3">
              <motion.span animate={reduce ? undefined : { rotate: [0, -14, 14, -8, 0], scale: [1, 1.2, 1] }} transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.4 }} className="text-3xl leading-none" aria-hidden>
                🎉
              </motion.span>
              <div>
                <p className="text-sm font-semibold">Resolved in 38 min</p>
                <div className="mt-1 flex gap-0.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.span key={i} initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 12, delay: 2 + i * 0.12 }}>
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
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 22, mass: 0.4 })
  const titleY = useParallax(smooth, 60)

  return (
    <section id="top" ref={ref} data-nav="light" className="relative bg-(--lp-hero) pt-32 pb-24 text-(--lp-ink) sm:pt-40 sm:pb-28">
      {/* one flat colour with a quiet dot texture */}
      <div aria-hidden className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(11,10,29,0.13)_1.4px,transparent_1.4px)] [background-size:26px_26px]" />

      <div className="relative mx-auto max-w-7xl px-5 text-center sm:px-8">
        <motion.div style={{ y: titleY }}>
          <h1 className="mx-auto max-w-6xl text-[clamp(2.7rem,6.4vw,6rem)] leading-[0.95] font-semibold tracking-[-0.045em] text-balance">
            <WordReveal text="Answer customers faster." onMount delay={0.15} />
            <br />
            <span className="text-(--lp-violet)">
              <WordReveal text="Show your sources." onMount delay={0.55} />
            </span>
          </h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.7 }} className="mx-auto mt-7 max-w-2xl text-lg text-(--lp-ink)/75 sm:text-xl">
            Every ticket is triaged the second it lands, and your team opens it to a ready reply drafted from your own knowledge base. Review, edit, send.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.15, duration: 0.7 }} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#demo" className="lp-focus group flex h-14 items-center gap-2 rounded-full bg-(--lp-violet) px-8 text-base font-semibold text-white shadow-[0_14px_30px_-12px_rgba(91,61,245,0.7)] transition-transform hover:scale-[1.04]">
              Try the live demo <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </a>
            <a href="#story" className="lp-focus flex h-14 items-center gap-2 rounded-full bg-white px-7 text-base font-medium text-(--lp-ink) ring-1 ring-black/15 transition-colors hover:bg-neutral-50">
              <Play className="size-4 fill-(--lp-ink)" /> Watch how it works
            </a>
          </motion.div>
        </motion.div>

        <Scene progress={smooth} />
      </div>
    </section>
  )
}
