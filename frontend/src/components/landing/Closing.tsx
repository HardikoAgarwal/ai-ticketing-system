import { ArrowRight, ArrowUpRight, Plus } from 'lucide-react'
import { AnimatePresence, motion, useScroll } from 'motion/react'
import { useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

import { BRAND, GITHUB_URL } from './constants'
import { EASE, Reveal, useParallax, WordReveal } from './motion'
import { GithubMark } from './Nav'

const FAQS = [
  ['Is the demo using real AI?', 'Yes. Tickets you create are triaged and drafted live by Gemini, grounded in the demo’s knowledge base. The seeded tickets already carry AI results so the demo looks complete even when the free AI quota runs out for the day.'],
  ['Is my data safe in the demo?', 'Each demo is a private workspace made just for you and deleted after 24 hours. Use made-up details anyway: it is a sandbox, not a production service.'],
  ['What happens if the AI goes down?', 'Rule-based triage keeps every ticket categorised and on the SLA clock, and agents write replies as usual. A banner tells them AI is unavailable. Nothing blocks.'],
  ['Does AI ever reply to customers on its own?', 'Never. AI suggests, a human reviews, edits and sends. Internal notes stay internal and are never shown to customers or sent to the AI as reply context.'],
  ['Can I bring my own knowledge base and categories?', 'Yes. Each workspace has its own articles, categories, SLA targets, tone of voice and team. Create a workspace in a minute and edit all of it in Settings.'],
  ['Is it free and open source?', 'It is a portfolio project, open on GitHub, and runs entirely on free hosting tiers.'],
]

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  const id = useId()
  return (
    <div className="border-b border-black/15">
      <h3>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={onToggle} className="lp-focus group flex w-full items-center gap-4 py-6 text-left sm:py-7">
          <span className="flex-1 text-xl font-semibold tracking-[-0.025em] sm:text-3xl">{q}</span>
          <motion.span animate={{ rotate: open ? 135 : 0 }} transition={{ duration: 0.35, ease: EASE }} className={cn('flex size-10 shrink-0 items-center justify-center rounded-full ring-1 transition-colors sm:size-12', open ? 'bg-(--lp-ink) text-(--lp-lime) ring-transparent' : 'ring-black/20 group-hover:bg-black/5')}>
            <Plus className="size-5" />
          </motion.span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} role="region" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: EASE }} className="overflow-hidden">
            <p className="max-w-3xl pb-7 text-base text-neutral-700 sm:text-lg">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" data-nav="light" className="relative -mt-10 rounded-t-[2.5rem] bg-(--lp-paper) pb-28 text-(--lp-ink)">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 pt-24 sm:px-8 sm:pt-32 lg:grid-cols-[0.8fr_1.4fr] lg:gap-16">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-(--lp-violet) uppercase">FAQ</p>
          <h2 className="mt-4 text-[clamp(2.4rem,5.4vw,4.4rem)] leading-[0.98] font-semibold tracking-[-0.045em]">
            <WordReveal text="Fair questions." />
          </h2>
          <p className="mt-4 max-w-xs text-neutral-600">Short, honest answers about the AI, the demo and your data.</p>
        </div>
        <Reveal>
          <div className="border-t border-black/15">
            {FAQS.map(([q, a], i) => (
              <FaqItem key={q} q={q} a={a} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export function FinalCta() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const a = useParallax(scrollYProgress, -140)
  const b = useParallax(scrollYProgress, 100)
  return (
    <section ref={ref} data-nav="dark" className="relative -mt-10 overflow-hidden rounded-t-[2.5rem] bg-(--lp-ink) py-28 text-center text-white sm:py-40">
      <motion.div style={{ y: a }} aria-hidden className="pointer-events-none absolute -top-20 left-1/4 size-[32rem] rounded-full bg-(--lp-violet) opacity-50 blur-3xl" />
      <motion.div style={{ y: b }} aria-hidden className="pointer-events-none absolute right-1/4 -bottom-24 size-[30rem] rounded-full bg-(--lp-coral) opacity-35 blur-3xl" />
      <div className="lp-noise pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
        <h2 className="text-[clamp(2.8rem,8.6vw,7.4rem)] leading-[0.92] font-semibold tracking-[-0.05em] text-balance">
          <WordReveal text="Your next ticket is already waiting." />
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-white/70">Open a demo, answer one with an AI draft, and see the customer’s side live. It takes about two minutes.</p>
        <Reveal delay={0.1} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href="#demo" className="lp-focus group flex h-14 items-center gap-2 rounded-full bg-(--lp-lime) px-9 text-base font-semibold text-(--lp-ink) shadow-[0_10px_50px_-8px_rgba(200,245,96,0.6)] transition-transform hover:scale-[1.05]">
            Pick a demo <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
          </a>
          <Link to="/signup" className="lp-focus flex h-14 items-center rounded-full px-7 text-base font-medium ring-1 ring-white/25 transition-colors hover:bg-white/10">
            Create your own workspace
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

function Col({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold tracking-[0.18em] uppercase opacity-60">{title}</p>
      <ul className="mt-4 space-y-2.5 text-[15px] font-medium">{children}</ul>
    </div>
  )
}

export function Footer() {
  const link = 'lp-focus inline-flex items-center gap-1 rounded underline-offset-4 hover:underline'
  return (
    <footer data-nav="light" className="relative -mt-10 overflow-hidden rounded-t-[2.5rem] bg-(--lp-lime) text-(--lp-ink)">
      <div className="mx-auto max-w-6xl px-5 pt-16 sm:px-8 sm:pt-20">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <p className="max-w-xs text-2xl leading-tight font-semibold tracking-[-0.03em]">Support that shows its work.</p>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="lp-focus mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-(--lp-ink) px-5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]">
              <GithubMark className="size-4" /> Star on GitHub
            </a>
          </div>
          <Col title="Product">
            <li><a className={link} href="#story">How it works</a></li>
            <li><a className={link} href="#features">Features</a></li>
            <li><a className={link} href="#faq">FAQ</a></li>
          </Col>
          <Col title="Try it">
            <li><a className={link} href="#demo">Live demo</a></li>
            <li><Link className={link} to="/signup">Create a workspace</Link></li>
            <li><Link className={link} to="/login">Log in</Link></li>
          </Col>
          <Col title="Project">
            <li><a className={link} href={GITHUB_URL} target="_blank" rel="noreferrer">Source code <ArrowUpRight className="size-3.5" /></a></li>
            <li className="text-sm font-normal opacity-70">Built with React, Django and Gemini.</li>
          </Col>
        </div>
        <p className="mt-12 text-sm opacity-70">A portfolio project: the demo data is fictional and no real customer data is stored.</p>
      </div>
      <div className="pointer-events-none mt-8 overflow-hidden px-2 pb-2 select-none" aria-hidden>
        <p className="text-center text-[clamp(3rem,13.4vw,15rem)] leading-[0.95] font-semibold tracking-[-0.07em] whitespace-nowrap text-(--lp-ink)">{BRAND}</p>
      </div>
    </footer>
  )
}
