import { ArrowRight, Check, Send, Sparkles } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { USE_CASES } from './constants'
import { EASE, Marquee, useTypewriter } from './motion'

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

/* ------------------------------ product window ------------------------------ */

/** A scripted, client-side product window: pick a customer message, watch it get triaged and answered. */
function ProductWindow() {
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState(reduce ? 3 : 0) // 0 message, 1 triage, 2 typing, 3 sources ready, 4 sent
  const [src, setSrc] = useState<number | null>(null)
  const [run, setRun] = useState(0)
  const auto = useRef(!reduce)
  const sample = SAMPLES[index]
  const typed = useTypewriter(sample.draft, phase >= 2, 16)

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
      const t = window.setTimeout(() => auto.current && setPhase(4), 2600)
      return () => window.clearTimeout(t)
    }
    if (phase === 4) {
      const t = window.setTimeout(() => auto.current && setIndex((i) => (i + 1) % SAMPLES.length), 2600)
      return () => window.clearTimeout(t)
    }
  }, [phase, reduce])

  const pick = (i: number) => {
    auto.current = false
    if (i === index) setRun((r) => r + 1)
    setIndex(i)
  }
  const sent = phase >= 4

  return (
    <div className="mx-auto w-full max-w-[34rem] overflow-hidden rounded-2xl bg-white ring-1 ring-black/10 shadow-[0_24px_48px_-28px_rgba(43,47,74,0.35)]">
      {/* window chrome */}
      <div className="flex h-11 items-center gap-2 border-b border-black/[0.07] px-4">
        <span className="size-2.5 rounded-full bg-black/10" />
        <span className="size-2.5 rounded-full bg-black/10" />
        <span className="size-2.5 rounded-full bg-black/10" />
        <p className="ml-3 text-xs font-medium text-(--lp-ink-2)">Inbox</p>
      </div>

      {/* sample tabs */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-black/[0.07] px-3 py-2.5" role="tablist" aria-label="Pick a customer message to watch">
        {SAMPLES.map((s, i) => (
          <button
            key={s.chip}
            type="button"
            role="tab"
            aria-selected={i === index}
            onClick={() => pick(i)}
            className={cn(
              'lp-focus shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors',
              i === index ? 'bg-(--lp-lav) text-(--lp-violet-2)' : 'text-(--lp-ink-2) hover:bg-black/[0.04]',
            )}
          >
            {s.chip}
          </button>
        ))}
      </div>

      <div className="space-y-4 p-5">
        {/* customer message */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${index}-${run}`}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="flex min-h-[7rem] gap-3"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--lp-lav) text-[11px] font-semibold text-(--lp-violet-2)">{sample.initials}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold">
                {sample.who} <span className="font-normal text-(--lp-ink-2)">· just now</span>
              </p>
              <p className="mt-1 rounded-xl bg-(--lp-paper) px-3.5 py-2.5 text-[14px] leading-relaxed">{sample.message}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* AI triage */}
        <div className="flex min-h-8 flex-wrap items-center gap-2" aria-live="polite">
          <span className="mr-1 text-[11px] font-semibold tracking-wide text-(--lp-ink-2) uppercase">AI triage</span>
          {phase >= 1 ? (
            sample.tags.map((t, i) => (
              <motion.span
                key={`${index}-${run}-${t.label}`}
                initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, delay: reduce ? 0 : i * 0.12, ease: EASE }}
                className={cn('rounded-md px-2.5 py-1 text-[12px] font-semibold', t.tone)}
              >
                {t.label}
              </motion.span>
            ))
          ) : (
            <span className="text-[12px] text-(--lp-ink-2)">Analysing…</span>
          )}
        </div>

        {/* AI draft */}
        <div className={cn('rounded-xl border p-4 transition-colors', sent ? 'border-(--lp-mint-2) bg-(--lp-mint)/50' : 'border-(--lp-lav-2) bg-(--lp-lav)/40')}>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wide text-(--lp-violet-2) uppercase">
            <Sparkles className="size-3.5" /> AI draft
            <span className="ml-auto text-[11px] font-medium tracking-normal text-(--lp-ink-2) normal-case">
              {phase >= 3 ? `${sample.sources.length} sources` : phase >= 2 ? 'Writing…' : 'Waiting'}
            </span>
          </div>
          <p className="min-h-[6.6rem] text-[13.5px] leading-relaxed sm:min-h-[5.6rem]">
            {phase >= 2 ? typed.shown : <span className="text-(--lp-ink-2)/60">The reply appears here, written from your knowledge base.</span>}
            {phase === 2 && !typed.done && <span className="lp-caret ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-(--lp-violet)" />}
          </p>
          <div className="mt-3 flex min-h-8 flex-wrap items-center gap-2">
            {phase >= 3 &&
              sample.sources.map((s, i) => (
                <button
                  key={`${index}-${s.title}`}
                  type="button"
                  onClick={() => {
                    auto.current = false
                    setSrc(src === i ? null : i)
                  }}
                  aria-pressed={src === i}
                  className={cn(
                    'lp-focus rounded-md px-2.5 py-1 text-[11.5px] font-semibold ring-1 transition-colors',
                    src === i ? 'bg-white text-(--lp-violet-2) ring-(--lp-violet)/40' : 'bg-white/70 text-(--lp-ink-2) ring-black/10 hover:bg-white',
                  )}
                >
                  {i + 1} · {s.title}
                </button>
              ))}
          </div>
          {/* reserved space so revealing a snippet never shifts the layout */}
          <div className="mt-2 min-h-[3.6rem]">
            <AnimatePresence mode="wait" initial={false}>
              {src !== null && phase >= 3 && (
                <motion.p
                  key={src}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-lg bg-white px-3 py-2 text-[12.5px] leading-snug text-(--lp-ink-2) ring-1 ring-black/[0.07]"
                >
                  <b className="text-(--lp-ink)">{sample.sources[src].title}:</b> {sample.sources[src].snippet}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* footer: send */}
      <div className="flex items-center justify-between gap-3 border-t border-black/[0.07] bg-(--lp-paper)/60 px-5 py-3">
        <p className="text-[12px] text-(--lp-ink-2)">{sent ? 'Reply sent to the customer' : 'A person reviews every reply'}</p>
        <button
          type="button"
          disabled={phase < 3 || sent}
          onClick={() => {
            auto.current = false
            setPhase(4)
          }}
          className={cn(
            'lp-focus inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold transition-colors',
            sent ? 'bg-(--lp-mint-2) text-[#124a30]' : phase >= 3 ? 'bg-(--lp-violet) text-white hover:bg-(--lp-violet-2)' : 'bg-black/5 text-(--lp-ink-2)/60',
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
    </div>
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
  const fade = (delay: number) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.6, ease: EASE } })

  return (
    <section id="top" data-nav="light" className="relative bg-(--lp-paper) pt-32 text-(--lp-ink) sm:pt-40">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div className="min-w-0 text-center lg:text-left">
          <motion.h1 {...fade(0.05)} className="text-[clamp(2.6rem,5vw,4.8rem)] leading-[1.02] font-semibold tracking-[-0.04em] text-balance">
            Answer customers faster.
            <br />
            Show your{' '}
            <span className="relative inline-block text-(--lp-violet)">
              sources.
              <span aria-hidden className="absolute inset-x-0 -bottom-1 h-[0.09em] rounded-full bg-(--lp-lav-2)" />
            </span>
          </motion.h1>

          <motion.p {...fade(0.15)} className="mx-auto mt-6 max-w-xl text-lg text-(--lp-ink-2) sm:text-xl lg:mx-0">
            Every ticket is triaged the second it lands, and your team opens it to a ready reply drafted from your own knowledge base. Review, edit, send.
          </motion.p>

          <motion.div {...fade(0.25)} className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-center">
            <a href="#demo" className="lp-focus group flex h-12 items-center gap-2 rounded-xl bg-(--lp-violet) px-7 text-[15px] font-semibold text-white transition-colors hover:bg-(--lp-violet-2)">
              Try the live demo <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a href="#story" className="lp-focus flex h-12 items-center rounded-xl bg-white px-6 text-[15px] font-semibold text-(--lp-ink) ring-1 ring-black/10 transition-colors hover:bg-black/[0.03]">
              See how it works
            </a>
          </motion.div>

          <motion.ul {...fade(0.35)} className="mt-7 flex flex-col items-center gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 lg:justify-start">
            <Tick>No signup</Tick>
            <Tick>Private sandbox</Tick>
            <Tick>Real AI</Tick>
          </motion.ul>
        </div>

        <motion.div {...fade(0.2)} className="min-w-0 px-1 sm:px-4">
          <ProductWindow />
        </motion.div>
      </div>

      {/* use-case marquee: inside the hero's own bottom area so the next section's rounded top can't cover it */}
      <div className="relative mt-20 border-t border-black/[0.07] py-6 pb-14">
        <Marquee items={USE_CASES} itemClassName="bg-white text-(--lp-ink) ring-1 ring-black/10" />
      </div>
    </section>
  )
}
