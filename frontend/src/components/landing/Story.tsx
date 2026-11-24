import { Check, Search, Send, Sparkles, Star } from 'lucide-react'
import { AnimatePresence, motion, useInView, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { Drift, EASE, Float, useTypewriter, WordReveal } from './motion'

const STEPS = [
  { n: '01', title: 'A customer asks', body: 'They describe the problem in the portal. While they type, matching help articles appear, so many questions never become tickets.', view: 'Customer portal' },
  { n: '02', title: 'AI triages in seconds', body: 'Category, priority, sentiment and a one-line summary land before anyone opens the ticket. Urgent and unhappy customers rise to the top.', view: 'Agent queue' },
  { n: '03', title: 'A draft, with receipts', body: 'The reply is written from your knowledge base and the customer’s real account facts, with citations showing exactly where each line came from.', view: 'Ticket workspace' },
  { n: '04', title: 'You review and send', body: 'Your agent edits what they like and hits send. The customer sees the answer live, confirms the fix and rates the support.', view: 'Both sides, live' },
]

const STEP_COLORS = ['#5b3df5', '#ff6a4d', '#c8f560', '#ffb340']

const DRAFT = 'Hi Marcus, thanks for getting in touch. Your latest invoice (INV-5120, $145) failed on the card ending 8821, and 2 automatic retries remain. Your workspace stays fully active in the meantime.'

function Window({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-[0_40px_100px_-30px_rgba(40,20,120,0.45)] ring-1 ring-black/10">
      <div className="flex items-center gap-2 border-b bg-neutral-50 px-4 py-3">
        <span className="size-2.5 rounded-full bg-red-300" />
        <span className="size-2.5 rounded-full bg-amber-300" />
        <span className="size-2.5 rounded-full bg-emerald-300" />
        <AnimatePresence mode="wait">
          <motion.span key={label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="ml-3 text-xs font-medium text-neutral-500">
            {label}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="min-h-[min(27rem,60svh)] p-5 text-neutral-900 sm:min-h-[min(31rem,58svh)] sm:p-8">{children}</div>
    </div>
  )
}

const pop = (i: number) => ({ initial: { opacity: 0, scale: 0.7, y: 8 }, animate: { opacity: 1, scale: 1, y: 0 }, transition: { delay: 0.25 + i * 0.28, type: 'spring' as const, stiffness: 380, damping: 22 } })

function Panel({ step }: { step: number }) {
  const typed = useTypewriter(DRAFT, step === 2, 14)
  const typedAsk = useTypewriter('My card failed on the latest invoice. Will the workspace get locked?', step === 0, 28)
  if (step === 0)
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold">How can we help?</p>
        <div className="rounded-2xl border bg-neutral-50 p-3.5 text-[13px] leading-relaxed">
          <p className="text-[11px] font-medium text-neutral-400 uppercase">Subject</p>
          <p className="min-h-[2.6rem]">
            {typedAsk.shown}
            {!typedAsk.done && <span className="lp-caret ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-neutral-900" />}
          </p>
        </div>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6, duration: 0.5, ease: EASE }} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
            <Search className="size-3.5" /> Does this answer your question?
          </p>
          <p className="mt-1 text-[13px] font-medium">Resolving failed payments</p>
          <p className="text-[12px] text-neutral-600">Your workspace stays active during retries. Update the card in Billing to retry instantly.</p>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }} className="flex justify-end">
          <span className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white">Still need help? Submit</span>
        </motion.div>
      </div>
    )
  if (step === 1)
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Queue</p>
          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] text-neutral-500">just now</span>
        </div>
        <div className="rounded-2xl border border-l-4 border-l-red-400 p-3.5">
          <p className="text-[13px] font-semibold">Payment failed and we’re worried about access</p>
          <p className="text-[11px] text-neutral-500">TKT-0002 · Marcus Webb</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <motion.span {...pop(0)} className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-medium text-orange-800">High</motion.span>
            <motion.span {...pop(1)} className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-medium text-violet-800">Billing &amp; Plans</motion.span>
            <motion.span {...pop(2)} className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-medium text-rose-800">Concerned</motion.span>
          </div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="mt-3 rounded-xl bg-violet-50 p-2.5 text-[12px] leading-snug text-violet-950">
            <Sparkles className="mr-1 inline size-3.5 text-violet-600" /> Customer’s payment failed and they want to know if access will be locked after updating the card.
          </motion.p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-neutral-500">
            Confidence
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
              <motion.span initial={{ width: 0 }} animate={{ width: '90%' }} transition={{ delay: 1.4, duration: 1, ease: EASE }} className="block h-full rounded-full bg-violet-500" />
            </span>
            90%
          </div>
        </div>
        {['Entire company locked out via Okta SSO', 'Getting 429 errors on the ingestion API'].map((t, i) => (
          <div key={t} className={cn('flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] opacity-70', i === 0 && 'border-l-4 border-l-red-400')}>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">{i === 0 ? 'Critical' : 'High'}</span>
            <span className="truncate">{t}</span>
          </div>
        ))}
      </div>
    )
  if (step === 2)
    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-neutral-100 px-3.5 py-2.5 text-[13px]">Our card payment failed on the latest invoice. Will the workspace get locked?</div>
        <div className="rounded-2xl bg-linear-to-br from-violet-50 to-fuchsia-50 p-3.5 ring-1 ring-violet-200">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-violet-700 uppercase">
            <Sparkles className="size-3.5" /> AI draft
          </p>
          <p className="min-h-[5.4rem] text-[13px] leading-relaxed">
            {typed.shown}
            {!typed.done && <span className="lp-caret ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-violet-700" />}
          </p>
          <AnimatePresence>
            {typed.done && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-2 space-y-1.5">
                <p className="text-[11px] font-semibold text-neutral-500">Sources</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Resolving failed payments', 'Customer facts: INV-5120'].map((s) => (
                    <span key={s} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-violet-800 ring-1 ring-violet-200">
                      {s}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    )
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">Agent</p>
        <div className="rounded-2xl border p-3 text-[12px] leading-relaxed">Hi Marcus, your workspace stays fully active during the retry window. Saving a new card triggers an instant retry.</div>
        <motion.span initial={{ scale: 1 }} animate={{ scale: [1, 0.94, 1] }} transition={{ delay: 0.9, duration: 0.4 }} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white">
          <Send className="size-3.5" /> Sent
        </motion.span>
      </div>
      <div className="space-y-2">
        <p className="text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">Customer · live</p>
        <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2, duration: 0.5, ease: EASE }} className="rounded-2xl bg-emerald-50 p-3 text-[12px] leading-relaxed ring-1 ring-emerald-200">
          <span className="mb-1 flex items-center gap-1 font-semibold text-emerald-800">
            <Check className="size-3.5" /> New reply
          </span>
          Hi Marcus, your workspace stays fully active during the retry window…
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="rounded-2xl border p-3">
          <p className="mb-1 text-[11px] text-neutral-500">How did we do?</p>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2.1 + i * 0.1, type: 'spring', stiffness: 500 }}>
                <Star className="size-5 fill-amber-400 text-amber-400" />
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function useIsDesktop() {
  const [yes, setYes] = useState(() => (typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1024px)').matches))
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const on = () => setYes(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return yes
}

/** Stacked layout for phones, tablets and reduced-motion: text, then the mock on its tinted plate, huge gaps, no pinning. */
function StoryStacked() {
  return (
    <div className="relative mx-auto max-w-2xl space-y-28 px-5 pb-32 sm:space-y-40 sm:px-8 lg:max-w-6xl">
      {STEPS.map((s, i) => (
        <StackedStep key={s.n} step={s} index={i} />
      ))}
    </div>
  )
}

function StackedStep({ step, index }: { step: (typeof STEPS)[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { once: true, margin: '-15% 0px' })
  return (
    <div ref={ref} className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
      <div className={cn(index % 2 && 'lg:order-2')}>
        <p className="text-[clamp(4rem,14vw,7rem)] leading-none font-semibold tracking-[-0.06em] text-(--lp-violet)/15">{step.n}</p>
        <h3 className="-mt-3 text-[clamp(2rem,4.6vw,3.2rem)] leading-[1.04] font-semibold tracking-[-0.035em]">{step.title}</h3>
        <p className="mt-5 max-w-md text-base text-neutral-700 sm:text-lg">{step.body}</p>
      </div>
      <div className={cn('relative mx-2 sm:mx-4', index % 2 && 'lg:order-1')}>
        <div aria-hidden className="absolute -inset-3 -z-10 rounded-[2.4rem] opacity-90 sm:-inset-5" style={{ backgroundColor: STEP_COLORS[index], transform: `rotate(${index % 2 ? -2.5 : 2.5}deg)` }} />
        <Window label={step.view}>{seen ? <Panel step={index} /> : <div className="min-h-[20rem]" />}</Window>
      </div>
    </div>
  )
}

/** Desktop: a roomy pinned stage. 120vh of scroll per step, the text on the left, the mock on a tilting colour plate on the right. */
function StoryPinned() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const [step, setStep] = useState(0)
  useMotionValueEvent(scrollYProgress, 'change', (v) => setStep(Math.min(STEPS.length - 1, Math.max(0, Math.floor(v * STEPS.length * 0.999)))))
  const current = STEPS[step]

  return (
    <div ref={ref} className="relative h-[520vh]">
      <div className="sticky top-0 flex h-svh items-center pt-20">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-16 px-8 lg:grid-cols-[0.8fr_1.2fr] xl:gap-28">
          <div className="min-h-[24rem]">
            <div className="mb-10 flex items-center gap-2" role="tablist" aria-label="Steps">
              {STEPS.map((s, i) => (
                <span key={s.n} role="tab" aria-selected={i === step} aria-label={s.title} className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10">
                  <motion.span className="block h-full rounded-full bg-(--lp-violet)" animate={{ width: i <= step ? '100%' : '0%' }} transition={{ duration: 0.5, ease: EASE }} />
                </span>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={current.n} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} transition={{ duration: 0.45, ease: EASE }}>
                <p className="text-[clamp(5rem,10vw,9rem)] leading-none font-semibold tracking-[-0.06em] text-(--lp-violet)/15">{current.n}</p>
                <h3 className="-mt-3 text-[clamp(2rem,3.8vw,3.3rem)] leading-[1.04] font-semibold tracking-[-0.035em]">{current.title}</h3>
                <p className="mt-6 max-w-md text-lg text-neutral-700">{current.body}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="relative mx-4 xl:mx-8">
            <motion.div aria-hidden animate={{ backgroundColor: STEP_COLORS[step], rotate: step % 2 ? -2.5 : 2.5 }} transition={{ duration: 0.7, ease: EASE }} className="absolute -inset-5 -z-10 rounded-[2.6rem] opacity-90 xl:-inset-7" />
            <Window label={current.view}>
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35 }}>
                  <Panel step={step} />
                </motion.div>
              </AnimatePresence>
            </Window>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Story() {
  const reduce = useReducedMotion()
  const desktop = useIsDesktop()
  return (
    <section id="story" data-nav="light" className="relative -mt-10 rounded-t-[2.5rem] bg-(--lp-paper) text-(--lp-ink)">
      <div className="pointer-events-none absolute inset-0 hidden overflow-hidden rounded-t-[2.5rem] lg:block" aria-hidden>
        <Drift speed={0.8} rotate={30} className="top-[3%] left-[5%] size-28"><div className="size-full rounded-full border-[6px] border-(--lp-violet)/25" /></Drift>
        <Drift speed={0.5} className="top-[2%] right-[6%] size-44"><div className="size-full rounded-full bg-(--lp-lime)/70 blur-xl" /></Drift>
        <Drift speed={0.7} rotate={20} className="top-[88%] right-[5%] size-24"><div className="size-full rounded-full border-[6px] border-(--lp-coral)/30" /></Drift>
      </div>
      <Float speed={0.2} className="relative mx-auto max-w-6xl px-5 pt-28 pb-24 text-center sm:px-8 sm:pt-40 sm:pb-36">
        <p className="text-xs font-bold tracking-[0.2em] text-(--lp-violet) uppercase">How it works</p>
        <h2 className="mx-auto mt-4 max-w-4xl text-[clamp(2.2rem,6vw,4.6rem)] leading-[1] font-semibold tracking-[-0.04em] text-balance">
          <WordReveal text="From “help!” to “thank you” in four moves." />
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-neutral-600">Scroll to follow one ticket from the customer’s first message to a rated, resolved reply.</p>
      </Float>
      {reduce || !desktop ? <StoryStacked /> : <StoryPinned />}
      <div className="h-12 lg:h-20" aria-hidden />
    </section>
  )
}
