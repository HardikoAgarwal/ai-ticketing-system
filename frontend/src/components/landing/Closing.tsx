import { ArrowRight, ArrowUpRight, Plus } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

import { BRAND, GITHUB_URL } from './constants'
import { EASE, Reveal, WordReveal } from './motion'
import { GithubMark } from './Nav'

const FAQ_GROUPS: { label: string; items: { q: string; a: string }[] }[] = [
  {
    label: 'About the demo',
    items: [
      { q: 'Is the demo using real AI?', a: 'Yes. Tickets you create are triaged and drafted live by Gemini, grounded in the demo’s knowledge base. The seeded tickets already carry AI results, so the demo looks complete even when the free AI quota runs out for the day.' },
      { q: 'How long does my sandbox last?', a: 'Each demo is a private workspace made just for you. It is deleted automatically after 24 hours, and starting a new one takes about a second.' },
      { q: 'Is my data safe in the demo?', a: 'Nobody else can see your sandbox. Use made-up details anyway: it is a demo environment, not a production service.' },
    ],
  },
  {
    label: 'AI & safety',
    items: [
      { q: 'Does AI ever reply to customers on its own?', a: 'Never. AI suggests, a human reviews, edits and sends. Internal notes stay internal and are never shown to customers or used as reply context.' },
      { q: 'How do I know where an answer came from?', a: 'Every draft cites the knowledge-base articles it used, and account facts such as amounts and dates come from the customer’s real records, so the AI never has to guess a number.' },
      { q: 'What happens if the AI goes down?', a: 'Rule-based triage keeps every ticket categorised and on the SLA clock, and agents write replies as usual. A banner says AI is unavailable and nothing blocks.' },
    ],
  },
  {
    label: 'Using it for real',
    items: [
      { q: 'Can I bring my own knowledge base and categories?', a: 'Yes. Each workspace has its own articles, categories, SLA targets, tone of voice and team. Create a workspace in a minute and edit all of it in Settings.' },
      { q: 'Can my team and customers both log in?', a: 'Yes. Workspaces have owners, admins, agents and customers. Agents get the queue and AI tools; customers get a simple portal to raise and follow tickets.' },
      { q: 'Is it free and open source?', a: 'It is a portfolio project, open on GitHub, and runs entirely on free hosting tiers.' },
    ],
  },
]

function FaqItem({ n, q, a, open, onToggle }: { n: number; q: string; a: string; open: boolean; onToggle: () => void }) {
  const id = useId()
  return (
    <div className={cn('rounded-2xl bg-white ring-1 transition-all duration-300', open ? 'shadow-[0_20px_50px_-24px_rgba(91,61,245,0.45)] ring-(--lp-violet)/40' : 'ring-black/[0.07] hover:ring-black/20')}>
      <h4>
        <button type="button" id={`${id}-q`} aria-expanded={open} aria-controls={`${id}-a`} onClick={onToggle} className="lp-focus group flex w-full items-center gap-4 rounded-2xl px-5 py-5 text-left sm:gap-5 sm:px-6">
          <span className={cn('w-7 shrink-0 text-sm font-bold tabular-nums transition-colors', open ? 'text-(--lp-violet)' : 'text-neutral-300')}>{String(n).padStart(2, '0')}</span>
          <span className="flex-1 text-lg leading-snug font-semibold tracking-[-0.02em] sm:text-xl">{q}</span>
          <motion.span animate={{ rotate: open ? 135 : 0 }} transition={{ duration: 0.35, ease: EASE }} className={cn('flex size-9 shrink-0 items-center justify-center rounded-full transition-colors', open ? 'bg-(--lp-violet) text-white' : 'bg-neutral-100 text-neutral-600 group-hover:bg-neutral-200')}>
            <Plus className="size-4.5" />
          </motion.span>
        </button>
      </h4>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={`${id}-a`} role="region" aria-labelledby={`${id}-q`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: EASE }} className="overflow-hidden">
            <p className="max-w-2xl px-5 pb-6 pl-[3.75rem] text-base leading-relaxed text-neutral-600 sm:px-6 sm:pb-7 sm:pl-[4.25rem]">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Faq() {
  const [open, setOpen] = useState<string | null>(FAQ_GROUPS[0].items[0].q)
  let n = 0
  return (
    <section id="faq" data-nav="light" className="relative -mt-10 rounded-t-[2.5rem] bg-(--lp-lav) pb-32 text-(--lp-ink)">
      <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pt-24 sm:px-8 sm:pt-32 lg:grid-cols-[0.8fr_1.35fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="text-[clamp(2.4rem,5.4vw,4.4rem)] leading-[0.98] font-semibold tracking-[-0.045em]">
            <WordReveal text="Fair questions." />
          </h2>
          <p className="mt-4 max-w-xs text-neutral-600">Short, honest answers about the AI, the demo and your data.</p>
          <div className="mt-8 max-w-sm rounded-3xl bg-(--lp-ink) p-6 text-white">
            <p className="text-lg font-semibold tracking-tight">Still curious?</p>
            <p className="mt-1.5 text-sm text-white/65">The fastest answer is two minutes in a live sandbox: answer a ticket with an AI draft, then see the customer’s side.</p>
            <a href="#demo" className="lp-focus group mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-(--lp-lime) px-5 text-sm font-semibold text-(--lp-ink) transition-transform hover:scale-[1.03]">
              Try the demo <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>

        <div className="space-y-10">
          {FAQ_GROUPS.map((g) => (
            <Reveal key={g.label}>
              <h3 className="mb-3 text-base font-semibold tracking-tight text-(--lp-muted)">{g.label}</h3>
              <div className="space-y-3">
                {g.items.map((it) => (
                  <FaqItem key={it.q} n={++n} q={it.q} a={it.a} open={open === it.q} onToggle={() => setOpen(open === it.q ? null : it.q)} />
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export function FinalCta() {
  return (
    <section data-nav="dark" className="relative -mt-10 overflow-hidden rounded-t-[2.5rem] bg-(--lp-ink) py-28 text-center text-white sm:py-40">
      <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
        <h2 className="text-[clamp(2.8rem,8.6vw,7.4rem)] leading-[0.92] font-semibold tracking-[-0.05em] text-balance">
          <WordReveal text="Your next ticket is already waiting." />
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-white/70">Open a demo, answer one with an AI draft, and see the customer’s side live. It takes about two minutes.</p>
        <Reveal delay={0.1} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href="#demo" className="lp-focus group flex h-14 items-center gap-2 rounded-full bg-(--lp-lime) px-9 text-base font-semibold text-(--lp-ink) transition-transform hover:scale-[1.05]">
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
      <p className="text-base font-semibold opacity-60">{title}</p>
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
