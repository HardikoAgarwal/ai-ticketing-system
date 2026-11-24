import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  GraduationCap,
  HeartPulse,
  Home,
  LifeBuoy,
  MessageSquareText,
  Monitor,
  Sparkles,
  ShoppingBag,
  Cloud,
  Briefcase,
  Landmark,
  Truck,
  type LucideIcon,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

import { BRAND, GITHUB_URL } from './constants'
import { EASE, Reveal, SectionHeading } from './motion'
import { GithubMark } from './Nav'

/* ------------------------------ How it works ------------------------------ */

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: MessageSquareText, title: 'A customer asks', body: 'Through your help centre, with helpful articles suggested as they type. Ticket created, SLA clock started.' },
  { icon: Sparkles, title: 'AI triages and drafts', body: 'Priority, category and mood are set in seconds, and a reply is drafted from your knowledge base with its sources cited.' },
  { icon: Check, title: 'Your team reviews and sends', body: 'Edit, regenerate or write your own. The customer sees the reply live, and rates it when it’s resolved.' },
]

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-16 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow="How it works" title="From question to resolution in three steps" />
        <div className="relative mt-14 grid gap-5 md:grid-cols-3">
          <motion.div
            aria-hidden
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1.1, delay: 0.3, ease: EASE }}
            style={{ transformOrigin: 'left' }}
            className="absolute top-[3.1rem] right-[16%] left-[16%] hidden h-px bg-linear-to-r from-primary/10 via-primary/50 to-primary/10 md:block"
          />
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={0.12 * i}>
              <div className="relative h-full rounded-3xl border bg-card p-6 text-center shadow-xs transition-shadow hover:shadow-lg">
                <div className="relative mx-auto flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-600/25">
                  <s.icon className="size-6" />
                  <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border-2 border-card bg-foreground text-[11px] font-semibold text-background">{i + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* -------------------------------- Use cases -------------------------------- */

const CASES: [LucideIcon, string][] = [
  [Cloud, 'SaaS support'],
  [Monitor, 'Internal IT helpdesk'],
  [ShoppingBag, 'E-commerce stores'],
  [Briefcase, 'Agencies'],
  [GraduationCap, 'Education'],
  [HeartPulse, 'Clinics and wellness'],
  [Home, 'Property management'],
  [Truck, 'Logistics'],
  [Landmark, 'Finance and fintech'],
  [Building2, 'Operations teams'],
]

export function UseCases() {
  const reduce = useReducedMotion()
  const row = (hidden: boolean) =>
    CASES.map(([Icon, label]) => (
      <li key={label + hidden} aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium shadow-xs">
        <Icon className="size-4 text-primary" /> {label}
      </li>
    ))
  return (
    <section aria-label="Who it's for" className="overflow-hidden border-y bg-muted/30 py-14">
      <Reveal>
        <p className="px-4 text-center text-sm font-medium text-muted-foreground">One helpdesk, shaped to any team that answers questions</p>
      </Reveal>
      {reduce ? (
        <ul className="mx-auto mt-6 flex max-w-4xl flex-wrap justify-center gap-2.5 px-4">{row(false)}</ul>
      ) : (
        <div className="group mt-7 [mask-image:linear-gradient(to_right,transparent,#000_10%,#000_90%,transparent)]">
          <ul className="lp-marquee flex w-max gap-2.5 pr-2.5 group-hover:[animation-play-state:paused]">
            {row(false)}
            {row(true)}
          </ul>
        </div>
      )}
    </section>
  )
}

/* ----------------------------------- FAQ ----------------------------------- */

const FAQS = [
  { q: 'Is the demo using real AI?', a: 'Yes. New tickets are triaged and drafted by Google’s Gemini models, grounded in the demo company’s knowledge base. The sample tickets already carry AI results so the demo looks complete from the first second, and a small daily budget keeps live AI free to run. If it runs out, the demo falls back to simple keyword rules and says so.' },
  { q: 'How long does my demo workspace last?', a: 'Each demo is a private workspace created just for you, and it’s deleted automatically after 24 hours. Nothing you do in it is visible to anyone else.' },
  { q: 'Is my data safe?', a: 'Every workspace is fully isolated: one team can never read another’s tickets. Internal notes are never shown to customers or sent to the AI, and the AI never sends a message by itself.' },
  { q: 'Can I use my own knowledge base?', a: 'Yes. Create a workspace, add articles in the built-in editor, and the AI starts drafting from them. You can test what it retrieves for any question before relying on it.' },
  { q: 'What happens if the AI is unavailable?', a: 'Tickets are still categorised and prioritised by built-in rules the moment they arrive, and your team replies as usual. AI is an accelerator, never a single point of failure.' },
  { q: 'Is it free or open source?', a: `The project is open source and runs on free hosting tiers, so you can read the code, run it yourself or fork it. ${BRAND} is a portfolio project, not a commercial service.` },
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className="scroll-mt-16 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <SectionHeading eyebrow="FAQ" title="Questions, answered" />
        <div className="mt-12 space-y-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i
            return (
              <Reveal key={f.q} delay={0.05 * i}>
                <div className={cn('rounded-2xl border bg-card transition-shadow', isOpen ? 'shadow-md' : 'shadow-xs')}>
                  <h3>
                    <button type="button" aria-expanded={isOpen} aria-controls={`faq-${i}`} id={`faq-btn-${i}`} onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {f.q}
                      <ChevronDown className={cn('size-5 shrink-0 text-muted-foreground transition-transform duration-300', isOpen && 'rotate-180 text-primary')} />
                    </button>
                  </h3>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div id={`faq-${i}`} role="region" aria-labelledby={`faq-btn-${i}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
                        <p className="px-5 pb-5 text-[15px] leading-relaxed text-muted-foreground">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* -------------------------------- Final CTA -------------------------------- */

export function FinalCta() {
  return (
    <section className="px-4 pb-24 sm:px-6">
      <Reveal>
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-16 text-center text-white shadow-2xl sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="lp-drift absolute -top-24 left-1/4 size-80 rounded-full bg-violet-500/35 blur-[90px]" />
            <div className="lp-drift absolute -right-10 -bottom-24 size-80 rounded-full bg-emerald-500/35 blur-[90px] [animation-delay:-7s]" />
            <div className="lp-grid absolute inset-0 opacity-30 invert" />
          </div>
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl sm:leading-[1.08]">See your support desk answer back.</h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/70">Open a private demo in about a second. Reply with an AI draft, then switch to the customer side and watch it arrive live.</p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href="#demo" className="group inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-base font-semibold text-slate-900 shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-white/50 focus-visible:outline-none">
                Start the live demo <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </a>
              <Link to="/signup" className="inline-flex h-12 items-center rounded-xl px-5 text-base font-medium text-white/85 ring-1 ring-white/20 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none">
                Create your workspace
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

/* ---------------------------------- Footer ---------------------------------- */

export function Footer() {
  return (
    <footer className="border-t bg-muted/20 px-4 py-12 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <a href="#top" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-xl bg-linear-to-br from-emerald-600 to-teal-500 text-white">
              <LifeBuoy className="size-4" />
            </span>
            {BRAND}
          </a>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">An AI-assisted helpdesk that drafts replies from your knowledge base and shows its sources.</p>
        </div>
        <FooterCol title="Product" links={[['Product tour', '#showcase'], ['Features', '#features'], ['How it works', '#how'], ['FAQ', '#faq']]} />
        <FooterCol title="Try it" links={[['Live demo', '#demo']]} routes={[['Log in', '/login'], ['Create a workspace', '/signup']]} />
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Project</p>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <GithubMark className="size-4" /> Source on GitHub
          </a>
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-wrap items-center justify-between gap-2 border-t pt-6 text-xs text-muted-foreground">
        <span>{BRAND} is a portfolio project, not a commercial service.</span>
        <span>Built with React, Django and Gemini.</span>
      </div>
    </footer>
  )
}

function FooterCol({ title, links, routes }: { title: string; links: [string, string][]; routes?: [string, string][] }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map(([l, h]) => (
          <li key={l}>
            <a href={h} className="text-muted-foreground transition-colors hover:text-foreground">
              {l}
            </a>
          </li>
        ))}
        {routes?.map(([l, h]) => (
          <li key={l}>
            <Link to={h} className="text-muted-foreground transition-colors hover:text-foreground">
              {l}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
