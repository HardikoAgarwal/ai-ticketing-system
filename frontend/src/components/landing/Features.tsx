import { BookOpenCheck, Check, Clock, Copy, Lightbulb, LockKeyhole, Radio, ShieldCheck, Sparkles, Star, Users, type LucideIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { EASE, Reveal, SectionHeading } from './motion'

function Card({
  icon: Icon,
  title,
  body,
  className,
  tint,
  children,
  delay = 0,
}: {
  icon: LucideIcon
  title: string
  body: string
  className?: string
  tint: string
  children?: ReactNode
  delay?: number
}) {
  const reduce = useReducedMotion()
  const [pos, setPos] = useState({ x: 50, y: 0 })
  return (
    <Reveal delay={delay} className={cn('min-w-0', className)}>
      <motion.div
        whileHover={reduce ? undefined : { y: -4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
        }}
        className="group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-card p-6 shadow-xs transition-shadow hover:shadow-xl hover:shadow-black/5"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: `radial-gradient(260px circle at ${pos.x}% ${pos.y}%, ${tint}, transparent 70%)` }}
          aria-hidden
        />
        <span className="relative flex size-10 items-center justify-center rounded-xl text-white shadow-sm" style={{ background: tint.replace(/[\d.]+\)$/, '1)') }}>
          <Icon className="size-5" />
        </span>
        <h3 className="relative mt-4 text-lg font-semibold tracking-tight">{title}</h3>
        <p className="relative mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
        {children && <div className="relative mt-5 flex-1">{children}</div>}
      </motion.div>
    </Reveal>
  )
}

function ChipsVisual() {
  const chips = [
    ['Critical', 'bg-red-50 text-red-700 ring-red-600/20'],
    ['Billing & Plans', 'bg-cyan-50 text-cyan-700 ring-cyan-600/20'],
    ['Frustrated', 'bg-rose-50 text-rose-700 ring-rose-600/20'],
    ['93% sure', 'bg-violet-50 text-violet-700 ring-violet-600/20'],
  ]
  return (
    <div className="flex flex-wrap gap-1.5 text-[11px] font-medium">
      {chips.map(([l, c], i) => (
        <motion.span key={l} initial={{ opacity: 0, scale: 0.7 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.12, type: 'spring', stiffness: 400, damping: 20 }} className={`rounded-full px-2 py-0.5 ring-1 ring-inset ${c}`}>
          {l}
        </motion.span>
      ))}
    </div>
  )
}

function DuplicateVisual() {
  return (
    <div className="space-y-2 text-[12px]">
      <div className="rounded-lg border bg-muted/40 px-2.5 py-1.5">Refund request, annual plan</div>
      <div className="flex items-center gap-2 pl-3 text-muted-foreground">
        <Copy className="size-3.5 text-amber-500" />
        <span className="font-medium text-amber-700">92% similar</span>
      </div>
      <div className="rounded-lg border border-dashed bg-card px-2.5 py-1.5">Please refund my annual subscription</div>
    </div>
  )
}

function SlaVisual() {
  return (
    <div className="space-y-1.5 text-[11px] font-medium">
      {[
        ['Overdue 2h', 'bg-red-50 text-red-700 ring-red-600/20', true],
        ['Reply in 3h', 'bg-amber-50 text-amber-700 ring-amber-600/20', false],
        ['Responded', 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', false],
      ].map(([l, c, pulse]) => (
        <div key={l as string} className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ring-1 ring-inset ${c as string}`}>
            <Clock className="size-3" /> {l as string}
          </span>
          {pulse ? (
            <span className="relative flex size-2">
              <span className="lp-pulse-ring absolute inline-flex size-2 rounded-full bg-red-400" />
              <span className="relative inline-flex size-2 rounded-full bg-red-500" />
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function DeflectVisual() {
  return (
    <div className="space-y-2 text-[12px]">
      <div className="rounded-lg border px-2.5 py-1.5 text-muted-foreground">I can’t log in with SSO<span className="lp-caret ml-px inline-block h-3 w-px translate-y-0.5 bg-foreground/60" /></div>
      <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-2">
        <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-emerald-700" />
        <span className="text-emerald-900">Single sign-on and login issues</span>
      </div>
    </div>
  )
}

function RealtimeVisual() {
  return (
    <div className="flex items-center gap-3">
      <span className="relative flex size-3">
        <span className="lp-pulse-ring absolute inline-flex size-3 rounded-full bg-emerald-400" />
        <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
      </span>
      <div className="min-w-0 flex-1 rounded-lg border px-2.5 py-1.5 text-[12px]">
        <span className="font-medium">Priya replied</span> <span className="text-muted-foreground">· just now</span>
      </div>
    </div>
  )
}

function TeamVisual() {
  const people = [['AM', 'bg-violet-200 text-violet-800'], ['RP', 'bg-sky-200 text-sky-800'], ['JB', 'bg-amber-200 text-amber-800'], ['ER', 'bg-emerald-200 text-emerald-800']]
  return (
    <div className="space-y-2.5">
      <div className="flex -space-x-2">
        {people.map(([i, c]) => (
          <span key={i} className={`flex size-8 items-center justify-center rounded-full border-2 border-card text-[11px] font-semibold ${c}`}>
            {i}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 text-[11px] font-medium">
        {['Owner', 'Admin', 'Agent', 'Customer'].map((r) => (
          <span key={r} className="rounded-md bg-muted px-1.5 py-0.5">
            {r}
          </span>
        ))}
      </div>
    </div>
  )
}

function CsatVisual() {
  const pts = [18, 26, 22, 34, 30, 42, 38, 52]
  return (
    <div>
      <svg viewBox="0 0 120 40" className="h-12 w-full" aria-hidden>
        <motion.polyline fill="none" stroke="oklch(0.55 0.13 158)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts.map((p, i) => `${i * 17},${44 - p * 0.8}`).join(' ')} initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, ease: EASE }} />
      </svg>
      <div className="mt-1 flex items-center gap-0.5 text-amber-400">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} className="size-3.5 fill-current" />
        ))}
        <span className="ml-1.5 text-xs font-medium text-foreground">4.6 CSAT</span>
      </div>
    </div>
  )
}

export function Features() {
  return (
    <section id="features" className="relative scroll-mt-16 overflow-hidden border-y bg-muted/30 px-4 py-20 sm:px-6 sm:py-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/30 to-transparent" aria-hidden />
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Features"
          title="Everything your support team needs, nothing it doesn’t"
          intro="Built like a real product: permissions, SLAs, live updates, analytics and an AI layer that stays out of the way when it can’t help."
        />

        <div className="mt-14 grid gap-4 md:grid-cols-6">
          <Card className="md:col-span-3" icon={Sparkles} tint="rgba(124,58,237,0.16)" title="Triage that reads the room" body="Category, priority, sentiment and a one-line summary on every ticket, with the AI’s confidence and reasoning. Your override always wins.">
            <ChipsVisual />
          </Card>
          <Card className="md:col-span-3" icon={BookOpenCheck} tint="rgba(16,185,129,0.16)" title="Drafts grounded in your knowledge base" body="Replies cite the exact articles they used and quote real figures from your customer’s account, so there’s nothing to fact-check blind.">
            <div className="flex flex-wrap gap-1.5 text-[11px] font-medium">
              {['Refunds and credits', 'Resolving failed payments', 'API rate limits'].map((c) => (
                <span key={c} className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5">
                  <BookOpenCheck className="size-3 text-violet-600" /> {c}
                </span>
              ))}
            </div>
          </Card>

          <Card className="md:col-span-2" icon={Copy} tint="rgba(245,158,11,0.18)" title="Spot duplicates" body="Similar tickets are linked before anyone repeats the work.">
            <DuplicateVisual />
          </Card>
          <Card className="md:col-span-2" icon={Clock} tint="rgba(239,68,68,0.15)" title="SLAs you can see" body="Per-priority targets with live countdowns on every row.">
            <SlaVisual />
          </Card>
          <Card className="md:col-span-2" icon={Lightbulb} tint="rgba(14,165,233,0.16)" title="Deflect before they submit" body="Customers see helpful articles as they type.">
            <DeflectVisual />
          </Card>

          <Card className="md:col-span-2" icon={Radio} tint="rgba(16,185,129,0.16)" title="Live, not refreshed" body="New tickets and replies appear the moment they happen.">
            <RealtimeVisual />
          </Card>
          <Card className="md:col-span-2" icon={Users} tint="rgba(99,102,241,0.16)" title="Teams and workspaces" body="Separate workspaces with owners, admins, agents and customers.">
            <TeamVisual />
          </Card>
          <Card className="md:col-span-2" icon={Star} tint="rgba(234,179,8,0.18)" title="Analytics and CSAT" body="Response times, SLA breaches, sentiment and satisfaction.">
            <CsatVisual />
          </Card>

          <Reveal className="md:col-span-6">
            <div className="relative overflow-hidden rounded-3xl border bg-linear-to-br from-slate-900 via-slate-900 to-emerald-950 p-7 text-white shadow-xl sm:p-9">
              <div className="lp-drift pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-emerald-500/25 blur-3xl" aria-hidden />
              <div className="relative grid items-center gap-6 md:grid-cols-[1fr_1.4fr]">
                <div>
                  <span className="flex size-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                    <ShieldCheck className="size-5 text-emerald-300" />
                  </span>
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight">Safe by design</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">AI assists your team; it never replaces its judgement or leaks what it shouldn’t.</p>
                </div>
                <ul className="grid gap-3 text-sm sm:grid-cols-2">
                  {[
                    [Check, 'Nothing is sent without a human'],
                    [LockKeyhole, 'Internal notes never reach customers or the AI'],
                    [Sparkles, 'Still works with keyword rules if AI is down'],
                    [ShieldCheck, 'Every workspace is fully isolated'],
                  ].map(([Icon, text]) => {
                    const I = Icon as typeof Check
                    return (
                      <li key={text as string} className="flex items-start gap-2.5 rounded-xl bg-white/5 px-3.5 py-3 ring-1 ring-white/10">
                        <I className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                        <span className="text-white/90">{text as string}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
