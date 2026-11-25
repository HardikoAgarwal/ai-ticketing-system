import { Check, ChevronDown, ChevronUp, Search, Send, Sparkles, Star } from 'lucide-react'
import { AnimatePresence, motion, useInView, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { EASE, useTypewriter, WordReveal } from './motion'

const STEPS = [
  { n: '01', title: 'A customer asks', short: 'Help appears while they type', body: 'They describe the problem in the portal. While they type, matching help articles appear, so many questions never become tickets.', view: 'Customer portal' },
  { n: '02', title: 'AI triages in seconds', short: 'Category, priority, mood, summary', body: 'Category, priority, sentiment and a one-line summary land before anyone opens the ticket. Urgent and unhappy customers rise to the top.', view: 'Agent queue' },
  { n: '03', title: 'A draft, with receipts', short: 'Written from your own knowledge', body: 'The reply is written from your knowledge base and the customer’s real account facts, with citations showing exactly where each line came from.', view: 'Ticket workspace' },
  { n: '04', title: 'You review and send', short: 'The customer sees it live', body: 'Your agent edits what they like and hits send. The customer sees the answer live, confirms the fix and rates the support.', view: 'Both sides, live' },
]

/** One coloured plate per step, tilting behind the mock. */
const STEP_COLORS = ['#5b3df5', '#ff6a4d', '#c8f560', '#ffb340']

const DRAFT = 'Hi Marcus, thanks for getting in touch. Your latest invoice (INV-5120, $145) failed on the card ending 8821, and 2 automatic retries remain. Your workspace stays fully active in the meantime.'

function Window({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-[0_40px_90px_-34px_rgba(70,60,150,0.4)] ring-1 ring-black/[0.06]">
      <div className="flex items-center gap-2 border-b bg-(--lp-paper)/60 px-4 py-3">
        <span className="size-2.5 rounded-full bg-(--lp-rose-2)" />
        <span className="size-2.5 rounded-full bg-(--lp-butter-2)" />
        <span className="size-2.5 rounded-full bg-(--lp-mint-2)" />
        <AnimatePresence mode="wait">
          <motion.span key={label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="ml-3 text-xs font-medium text-(--lp-muted)">
            {label}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="min-h-[min(27rem,60svh)] p-5 text-(--lp-ink) sm:min-h-[min(31rem,58svh)] sm:p-8">{children}</div>
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
        <div className="rounded-2xl border bg-(--lp-paper) p-3.5 text-[13px] leading-relaxed">
          <p className="text-[11px] font-medium text-(--lp-muted)/70 uppercase">Subject</p>
          <p className="min-h-[2.6rem]">
            {typedAsk.shown}
            {!typedAsk.done && <span className="lp-caret ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-(--lp-violet)" />}
          </p>
        </div>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6, duration: 0.5, ease: EASE }} className="rounded-2xl border border-(--lp-mint-2) bg-(--lp-mint) p-3.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#124a30]">
            <Search className="size-3.5" /> Does this answer your question?
          </p>
          <p className="mt-1 text-[13px] font-medium">Resolving failed payments</p>
          <p className="text-[12px] text-(--lp-muted)">Your workspace stays active during retries. Update the card in Billing to retry instantly.</p>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }} className="flex justify-end">
          <span className="rounded-full bg-(--lp-violet) px-4 py-2 text-xs font-semibold text-white">Still need help? Submit</span>
        </motion.div>
      </div>
    )
  if (step === 1)
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Queue</p>
          <span className="rounded-full bg-(--lp-lav) px-2.5 py-0.5 text-[11px] text-(--lp-muted)">just now</span>
        </div>
        <div className="rounded-2xl border border-l-4 border-l-(--lp-rose-2) p-3.5">
          <p className="text-[13px] font-semibold">Payment failed and we’re worried about access</p>
          <p className="text-[11px] text-(--lp-muted)">TKT-0002 · Marcus Webb</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <motion.span {...pop(0)} className="rounded-full bg-(--lp-peach-2) px-2.5 py-1 text-[11px] font-medium text-[#7a3414]">High</motion.span>
            <motion.span {...pop(1)} className="rounded-full bg-(--lp-lav-2) px-2.5 py-1 text-[11px] font-medium text-[#2f2a7a]">Billing &amp; Plans</motion.span>
            <motion.span {...pop(2)} className="rounded-full bg-(--lp-butter-2) px-2.5 py-1 text-[11px] font-medium text-[#6b4a00]">Concerned</motion.span>
          </div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="mt-3 rounded-xl bg-(--lp-lav) p-2.5 text-[12px] leading-snug text-(--lp-ink)">
            <Sparkles className="mr-1 inline size-3.5 text-(--lp-violet)" /> Customer’s payment failed and they want to know if access will be locked after updating the card.
          </motion.p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-(--lp-muted)">
            Confidence
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--lp-lav)">
              <motion.span initial={{ width: 0 }} animate={{ width: '90%' }} transition={{ delay: 1.4, duration: 1, ease: EASE }} className="block h-full rounded-full bg-(--lp-violet)" />
            </span>
            90%
          </div>
        </div>
        {['Entire company locked out via Okta SSO', 'Getting 429 errors on the ingestion API'].map((t, i) => (
          <div key={t} className={cn('flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] opacity-70', i === 0 && 'border-l-4 border-l-(--lp-rose-2)')}>
            <span className="rounded-full bg-(--lp-rose-2) px-2 py-0.5 text-[10px] font-medium text-[#7a1636]">{i === 0 ? 'Critical' : 'High'}</span>
            <span className="truncate">{t}</span>
          </div>
        ))}
      </div>
    )
  if (step === 2)
    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-(--lp-lav) px-3.5 py-2.5 text-[13px]">Our card payment failed on the latest invoice. Will the workspace get locked?</div>
        <div className="rounded-2xl bg-linear-to-br from-(--lp-lav) to-(--lp-rose) p-3.5 ring-1 ring-(--lp-lav-2)">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-(--lp-violet) uppercase">
            <Sparkles className="size-3.5" /> AI draft
          </p>
          <p className="min-h-[5.4rem] text-[13px] leading-relaxed">
            {typed.shown}
            {!typed.done && <span className="lp-caret ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-(--lp-violet)" />}
          </p>
          <AnimatePresence>
            {typed.done && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-2 space-y-1.5">
                <p className="text-[11px] font-semibold text-(--lp-muted)">Sources</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Resolving failed payments', 'Customer facts: INV-5120'].map((s) => (
                    <span key={s} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[#2f2a7a] ring-1 ring-(--lp-lav-2)">
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
        <p className="text-[11px] font-semibold tracking-wide text-(--lp-muted)/70 uppercase">Agent</p>
        <div className="rounded-2xl border p-3 text-[12px] leading-relaxed">Hi Marcus, your workspace stays fully active during the retry window. Saving a new card triggers an instant retry.</div>
        <motion.span initial={{ scale: 1 }} animate={{ scale: [1, 0.94, 1] }} transition={{ delay: 0.9, duration: 0.4 }} className="inline-flex items-center gap-1.5 rounded-full bg-(--lp-violet) px-4 py-2 text-xs font-semibold text-white">
          <Send className="size-3.5" /> Sent
        </motion.span>
      </div>
      <div className="space-y-2">
        <p className="text-[11px] font-semibold tracking-wide text-(--lp-muted)/70 uppercase">Customer · live</p>
        <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2, duration: 0.5, ease: EASE }} className="rounded-2xl bg-(--lp-mint) p-3 text-[12px] leading-relaxed ring-1 ring-(--lp-mint-2)">
          <span className="mb-1 flex items-center gap-1 font-semibold text-[#124a30]">
            <Check className="size-3.5" /> New reply
          </span>
          Hi Marcus, your workspace stays fully active during the retry window…
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="rounded-2xl border p-3">
          <p className="mb-1 text-[11px] text-(--lp-muted)">How did we do?</p>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2.1 + i * 0.1, type: 'spring', stiffness: 500 }}>
                <Star className="size-5 fill-(--lp-amber) text-(--lp-amber)" />
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

function StepCard({ step, index, active = true, compact = false }: { step: (typeof STEPS)[number]; index: number; active?: boolean; compact?: boolean }) {
  return (
    <div className={cn('relative overflow-hidden rounded-3xl p-6 ring-1 transition-all duration-500 sm:p-7', active ? 'bg-white shadow-[0_24px_50px_-30px_rgba(70,60,150,0.5)] ring-2' : 'bg-white/45 ring-black/[0.04]')} style={active ? { ['--tw-ring-color' as string]: STEP_COLORS[index] } : undefined}>
      <span aria-hidden className={cn('pointer-events-none absolute -top-3 right-4 text-[clamp(5rem,9vw,7.5rem)] leading-none font-semibold tracking-[-0.06em] transition-opacity duration-500', active ? 'text-(--lp-violet)/[0.12]' : 'text-(--lp-violet)/[0.05]')}>{step.n}</span>
      <div className="relative flex items-center gap-3">
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition-colors duration-500', active ? 'bg-(--lp-violet) text-white' : 'bg-white text-(--lp-muted) ring-1 ring-black/10')}>{index + 1}</span>
        <div className="min-w-0">
          <h3 className={cn('leading-tight font-semibold tracking-[-0.03em] transition-all duration-500', active ? 'text-[clamp(1.6rem,2.6vw,2.2rem)]' : 'text-lg text-(--lp-muted)')}>{step.title}</h3>
          {(!active || compact) && <p className="text-[13px] text-(--lp-muted)">{step.short}</p>}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {active && !compact && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: EASE }} className="relative overflow-hidden">
            <p className="mt-4 max-w-md text-base leading-relaxed text-(--lp-muted) sm:text-lg">{step.body}</p>
          </motion.div>
        )}
      </AnimatePresence>
      {active && compact && <p className="relative mt-4 max-w-md text-base leading-relaxed text-(--lp-muted) sm:text-lg">{step.body}</p>}
    </div>
  )
}

/** Stacked layout for phones, tablets and reduced-motion: a text card, then the mock on its tinted plate, equal rhythm, no pinning. */
function StoryStacked() {
  return (
    <div className="relative mx-auto max-w-2xl space-y-24 px-5 pb-28 sm:space-y-32 sm:px-8 lg:max-w-5xl">
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
    <div ref={ref} className="space-y-10">
      <StepCard step={step} index={index} compact />
      <div className="relative mx-2 sm:mx-4">
        <div aria-hidden className="absolute -inset-3 -z-10 rounded-[2.4rem] sm:-inset-5" style={{ backgroundColor: STEP_COLORS[index], transform: `rotate(${index % 2 ? -2.5 : 2.5}deg)` }} />
        <Window label={step.view}>{seen ? <Panel step={index} /> : <div className="min-h-[20rem]" />}</Window>
      </div>
    </div>
  )
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** One row of the left-hand timeline: a node, the connector to the next node (filled by scroll) and the step copy. */
function TimelineRow({ step, index, active, done, last, progress, onSelect }: { step: (typeof STEPS)[number]; index: number; active: boolean; done: boolean; last: boolean; progress: MotionValue<number>; onSelect: () => void }) {
  const fill = useTransform(progress, (v) => clamp01(v * STEPS.length - index))
  return (
    <li className="relative flex gap-5">
      <div className="flex w-12 shrink-0 flex-col items-center">
        <button
          type="button"
          onClick={onSelect}
          aria-label={`Go to step ${index + 1}: ${step.title}`}
          aria-current={active ? 'step' : undefined}
          className={cn(
            'lp-focus relative z-10 flex shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-500',
            active && 'size-12 bg-white text-(--lp-violet) shadow-[0_10px_30px_-8px_rgba(91,61,245,0.55)] ring-[3px] ring-(--lp-violet)',
            done && 'size-10 bg-(--lp-violet) text-white',
            !active && !done && 'size-10 bg-white text-(--lp-muted) ring-1 ring-black/15',
          )}
        >
          {done ? <Check className="size-5" strokeWidth={3} /> : index + 1}
          {active && <span aria-hidden className="lp-pulse-ring absolute inset-0 rounded-full ring-2 ring-(--lp-violet)/50" />}
        </button>
        {!last && (
          <div aria-hidden className="relative my-2 w-0.5 flex-1 overflow-hidden rounded-full bg-black/10">
            <motion.div style={{ scaleY: fill }} className="absolute inset-0 origin-top rounded-full bg-(--lp-violet)" />
          </div>
        )}
      </div>
      <div className={cn('min-w-0 flex-1 pt-1.5 transition-opacity duration-500', last ? 'pb-0' : 'pb-7 [@media(max-height:960px)]:pb-4', !active && !done && 'opacity-60')}>
        <button type="button" onClick={onSelect} className="lp-focus block w-full rounded-lg text-left">
          <span className={cn('text-[11px] font-bold tracking-[0.18em] uppercase transition-colors', active ? 'text-(--lp-violet)' : 'text-(--lp-muted)')}>Step {step.n}</span>
          <span className={cn('mt-0.5 block leading-tight font-semibold tracking-[-0.03em] transition-all duration-500', active ? 'text-[clamp(1.5rem,2.3vw,2rem)]' : 'text-xl')}>{step.title}</span>
        </button>
        {!active && <p className="mt-1 text-[14px] text-(--lp-muted)">{step.short}</p>}
        <AnimatePresence initial={false}>
          {active && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: EASE }} className="overflow-hidden">
              <p className="mt-2.5 max-w-md text-base leading-relaxed text-(--lp-muted)">{step.body}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </li>
  )
}

/** Desktop: a pinned stage. About 100vh of scroll per step. Left: heading, a scroll-filled timeline and a step counter. Right: the mock on a tilting colour plate. */
function StoryPinned() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 })
  const [step, setStep] = useState(0)
  useMotionValueEvent(scrollYProgress, 'change', (v) => setStep(Math.min(STEPS.length - 1, Math.max(0, Math.floor(v * STEPS.length * 0.999)))))
  const current = STEPS[step]

  const goTo = (i: number) => {
    const el = ref.current
    if (!el) return
    const next = Math.min(STEPS.length - 1, Math.max(0, i))
    // Each step owns one viewport of scroll; aim for the middle of that step's range.
    window.scrollTo({ top: el.offsetTop + (next + 0.5) * window.innerHeight, behavior: 'smooth' })
  }

  return (
    <div ref={ref} className="relative" style={{ height: `${(STEPS.length + 1) * 100}svh` }}>
      <div className="sticky top-0 flex h-svh items-center pt-24 pb-8">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-8 lg:grid-cols-[0.9fr_1.1fr] xl:gap-24">
          {/* left: heading + timeline */}
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-(--lp-violet) uppercase">How it works</p>
            <h2 className="mt-3 max-w-xl text-[clamp(2rem,3.4vw,3rem)] leading-[1.02] font-semibold tracking-[-0.04em] text-balance [@media(max-height:960px)]:text-[clamp(1.7rem,2.5vw,2.3rem)]">From “help!” to “thank you” in four moves.</h2>
            <p className="mt-3 max-w-md text-[15px] text-(--lp-muted) [@media(max-height:960px)]:hidden">Scroll to follow one ticket from the customer’s first message to a rated, resolved reply.</p>

            <ol className="mt-8 [@media(max-height:960px)]:mt-5" aria-label="Steps">
              {STEPS.map((s, i) => (
                <TimelineRow key={s.n} step={s} index={i} active={i === step} done={i < step} last={i === STEPS.length - 1} progress={smooth} onSelect={() => goTo(i)} />
              ))}
            </ol>

            <div className="mt-6 flex items-center gap-4 [@media(max-height:960px)]:mt-3">
              <p className="text-sm font-semibold tabular-nums">
                Step {step + 1} <span className="text-(--lp-muted)">of {STEPS.length}</span>
              </p>
              <div className="h-px flex-1 bg-black/10" aria-hidden />
              <div className="flex gap-2">
                <button type="button" onClick={() => goTo(step - 1)} disabled={step === 0} aria-label="Previous step" className="lp-focus flex size-9 items-center justify-center rounded-full bg-white ring-1 ring-black/15 transition hover:ring-black/40 disabled:opacity-35">
                  <ChevronUp className="size-4" />
                </button>
                <button type="button" onClick={() => goTo(step + 1)} disabled={step === STEPS.length - 1} aria-label="Next step" className="lp-focus flex size-9 items-center justify-center rounded-full bg-(--lp-violet) text-white transition hover:bg-(--lp-violet-2) disabled:opacity-35">
                  <ChevronDown className="size-4" />
                </button>
              </div>
            </div>
          </div>

          {/* right: stage */}
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
  const stacked = reduce || !desktop
  return (
    <section id="story" data-nav="light" className="relative -mt-10 rounded-t-[2.5rem] bg-(--lp-paper) text-(--lp-ink)">
      {stacked && (
        <div className="relative mx-auto max-w-6xl px-5 pt-28 pb-20 text-center sm:px-8 sm:pt-40 sm:pb-28">
          <p className="text-xs font-bold tracking-[0.2em] text-(--lp-violet) uppercase">How it works</p>
          <h2 className="mx-auto mt-4 max-w-4xl text-[clamp(2.2rem,6vw,4.6rem)] leading-[1] font-semibold tracking-[-0.04em] text-balance">
            <WordReveal text="From “help!” to “thank you” in four moves." />
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-(--lp-muted)">Follow one ticket from the customer’s first message to a rated, resolved reply.</p>
        </div>
      )}
      {stacked ? <StoryStacked /> : <StoryPinned />}
      <div className="h-12 lg:h-20" aria-hidden />
    </section>
  )
}
