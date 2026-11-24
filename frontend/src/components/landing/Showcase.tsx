import { BarChart3, BookOpenCheck, Check, Inbox, Lightbulb, MessagesSquare, Sparkles, Star, type LucideIcon } from 'lucide-react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { MOOD_STYLE, PRIORITY_STYLE, TEMPLATES } from './constants'
import { Counter, EASE, Reveal, SectionHeading } from './motion'

interface Tab {
  id: string
  label: string
  icon: LucideIcon
  title: string
  body: string
  points: string[]
}

const TABS: Tab[] = [
  {
    id: 'triage',
    label: 'Instant triage',
    icon: Inbox,
    title: 'Every ticket is sorted before a human sees it',
    body: 'Category, priority, sentiment and a one-line summary appear within seconds, with a confidence score and the reasoning behind them.',
    points: ['Angry or urgent customers rise to the top', 'Overdue and at-risk SLAs are impossible to miss', 'Your override always wins over the AI'],
  },
  {
    id: 'drafts',
    label: 'Drafts with receipts',
    icon: Sparkles,
    title: 'Open a ticket to a reply that is already written',
    body: 'The draft is grounded in your knowledge base and your customer’s real account facts, and every article it used is cited right under it.',
    points: ['Facts come from your data, never invented', 'One click to use it, edit it, or regenerate', 'Nothing is ever sent without a human'],
  },
  {
    id: 'portal',
    label: 'Customer portal',
    icon: MessagesSquare,
    title: 'Customers get answers before they even submit',
    body: 'As someone types a request, relevant help articles appear. If they still need you, the ticket, thread and satisfaction rating live in one clean portal.',
    points: ['Self-service suggestions deflect repeat questions', 'Live updates when your team replies', 'Confirm, reopen or rate in a click'],
  },
  {
    id: 'analytics',
    label: 'Team analytics',
    icon: BarChart3,
    title: 'See how your support is really doing',
    body: 'Volume, response and resolution times, SLA breaches, sentiment and satisfaction, plus how often your team keeps or rewrites the AI’s work.',
    points: ['First-response and resolution trends', 'CSAT and sentiment at a glance', 'Track how much time AI drafts save'],
  },
]

function Window({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_24px_70px_-34px_rgba(15,23,42,0.35)]">
      <div className="flex items-center gap-1.5 border-b bg-muted/50 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-red-300" />
        <span className="size-2.5 rounded-full bg-amber-300" />
        <span className="size-2.5 rounded-full bg-emerald-300" />
        <span className="ml-3 truncate text-[11px] text-muted-foreground">{title}</span>
      </div>
      <div className="min-h-[25rem] p-4 sm:p-5">{children}</div>
    </div>
  )
}

const rise = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay: 0.08 * i, ease: EASE },
})

function TriageMock() {
  const rows = TEMPLATES[0].tickets
  return (
    <Window title="Queue · most urgent first">
      <div className="space-y-2">
        {rows.map((t, i) => (
          <motion.div key={t.ref} {...rise(i)} className={cn('flex items-center gap-3 rounded-xl border px-3 py-2.5', t.late && 'border-l-4 border-l-red-400')}>
            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', PRIORITY_STYLE[t.priority])}>{t.priority}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{t.subject}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {t.ref} · {t.who} · {t.category}
              </p>
            </div>
            {t.mood && <span className={cn('hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset sm:inline', MOOD_STYLE[t.mood])}>{t.mood}</span>}
            <span className={cn('hidden shrink-0 text-[11px] font-medium md:inline', t.late ? 'text-red-600' : 'text-muted-foreground')}>{t.sla}</span>
          </motion.div>
        ))}
      </div>
      <motion.div {...rise(6)} className="mt-3 flex items-center gap-3 rounded-xl border bg-violet-50/60 px-3 py-2.5 text-[12px]">
        <Sparkles className="size-4 shrink-0 text-violet-600" />
        <span className="min-w-0 flex-1 truncate text-foreground/80">Customer’s Segment pipeline stopped delivering events; launch review today.</span>
        <span className="w-20 shrink-0">
          <span className="block h-1.5 overflow-hidden rounded-full bg-violet-100">
            <motion.span initial={{ width: 0 }} animate={{ width: '93%' }} transition={{ delay: 0.7, duration: 0.9, ease: EASE }} className="block h-full rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500" />
          </span>
        </span>
        <span className="shrink-0 font-medium text-violet-700">93%</span>
      </motion.div>
    </Window>
  )
}

function DraftMock() {
  return (
    <Window title="TKT-0003 · Charged twice for this month’s invoice">
      <div className="space-y-3">
        <motion.div {...rise(0)} className="rounded-2xl rounded-tl-sm border bg-muted/40 px-3.5 py-2.5 text-[13px] text-foreground/85">
          I can see two identical charges of $392 for the same invoice. Please refund the duplicate as soon as possible.
        </motion.div>
        <motion.div {...rise(1)} className="ai-ring ai-ring-still rounded-2xl">
          <div className="rounded-[calc(var(--radius-2xl)-2px)] bg-card p-3.5">
            <p className="flex items-center gap-2 text-xs font-semibold">
              <span className="flex size-5 items-center justify-center rounded-md bg-linear-to-br from-violet-500 via-fuchsia-500 to-sky-400 text-white">
                <Sparkles className="size-3" />
              </span>
              <span className="bg-linear-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">AI draft</span>
              <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Ready</span>
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-foreground/90">
              Hi Tom, thanks for the heads-up, and sorry about the duplicate. Both <b>$392</b> charges are on <b>INV-5877</b>, and we refund duplicates in full. It returns to your <b>Visa ending 1111</b> within <b>5-10 business days</b>.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
              {['Refunds and credits', 'Plans, seats and overage'].map((c) => (
                <span key={c} className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-medium">
                  <BookOpenCheck className="size-3 text-violet-600" /> {c}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
        <motion.div {...rise(2)} className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">Account facts used: invoice, card, amount</span>
          <span className="flex gap-2 text-xs font-medium">
            <span className="rounded-lg border px-2.5 py-1.5">Regenerate</span>
            <span className="rounded-lg bg-primary px-2.5 py-1.5 text-primary-foreground">Use this draft</span>
          </span>
        </motion.div>
      </div>
    </Window>
  )
}

function PortalMock() {
  return (
    <Window title="Help centre · New request">
      <div className="space-y-3">
        <motion.div {...rise(0)} className="rounded-xl border px-3 py-2.5 text-[13px]">
          <p className="text-[11px] font-medium text-muted-foreground">Subject</p>
          <p className="mt-0.5">My payment failed and I’m worried about losing access</p>
        </motion.div>
        <motion.div {...rise(1)} className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-800">
            <Lightbulb className="size-3.5" /> Does this answer your question?
          </p>
          <div className="mt-2 rounded-lg border border-emerald-100 bg-card p-2.5">
            <p className="text-[13px] font-medium">Resolving failed payments</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">When a card payment fails we retry automatically and your workspace stays fully active during the retry window…</p>
          </div>
          <div className="mt-2.5 flex gap-2 text-xs font-medium">
            <span className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-white">Yes, that solved it</span>
            <span className="rounded-lg border bg-card px-2.5 py-1.5">No, send my request</span>
          </div>
        </motion.div>
        <motion.div {...rise(2)} className="flex items-center justify-between rounded-xl border px-3 py-2.5">
          <span className="text-[12px] text-muted-foreground">How did we do on your last ticket?</span>
          <span className="flex gap-0.5 text-amber-400">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7 + i * 0.09, type: 'spring', stiffness: 400, damping: 14 }}>
                <Star className="size-4 fill-current" />
              </motion.span>
            ))}
          </span>
        </motion.div>
      </div>
    </Window>
  )
}

function AnalyticsMock() {
  const bars = [38, 52, 44, 66, 58, 74, 62, 80, 70, 88, 76, 94]
  return (
    <Window title="Analytics · last 30 days">
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: 'First response', to: 38, suf: 'm' },
          { label: 'SLA met', to: 94, suf: '%' },
          { label: 'CSAT', to: 46, suf: '/5', dec: true },
        ].map((k, i) => (
          <motion.div key={k.label} {...rise(i)} className="rounded-xl border p-3">
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-xl font-semibold tracking-tight">
              {k.dec ? '4.6' : <Counter to={k.to} />}
              <span className="text-sm font-medium text-muted-foreground">{k.suf}</span>
            </p>
          </motion.div>
        ))}
      </div>
      <motion.div {...rise(3)} className="mt-3 rounded-xl border p-3">
        <p className="text-[11px] font-medium text-muted-foreground">Tickets created vs resolved</p>
        <div className="mt-3 flex h-28 items-end gap-1.5">
          {bars.map((h, i) => (
            <div key={i} className="flex flex-1 flex-col justify-end gap-0.5">
              <motion.span initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 0.3 + i * 0.05, duration: 0.7, ease: EASE }} className="block rounded-t bg-emerald-500/80" />
            </div>
          ))}
        </div>
      </motion.div>
      <motion.div {...rise(4)} className="mt-3 flex items-center justify-between rounded-xl border bg-violet-50/60 px-3 py-2.5 text-[12px]">
        <span className="flex items-center gap-1.5 text-foreground/80">
          <Sparkles className="size-3.5 text-violet-600" /> AI drafts sent as-is or lightly edited
        </span>
        <span className="font-semibold text-violet-700">
          <Counter to={71} suffix="%" />
        </span>
      </motion.div>
    </Window>
  )
}

const MOCKS: Record<string, () => ReactNode> = {
  triage: () => <TriageMock />,
  drafts: () => <DraftMock />,
  portal: () => <PortalMock />,
  analytics: () => <AnalyticsMock />,
}

const AUTO_MS = 7000

export function Showcase() {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: '-15% 0px' })
  const [active, setActive] = useState(TABS[0].id)
  const [auto, setAuto] = useState(true)
  const idx = TABS.findIndex((t) => t.id === active)
  const tab = TABS[idx]

  useEffect(() => {
    if (!auto || reduce || !inView) return
    const t = window.setTimeout(() => setActive(TABS[(idx + 1) % TABS.length].id), AUTO_MS)
    return () => window.clearTimeout(t)
  }, [active, auto, idx, inView, reduce])

  const pick = (id: string) => {
    setAuto(false)
    setActive(id)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
    const next = TABS[(idx + dir + TABS.length) % TABS.length]
    pick(next.id)
    document.getElementById(`tab-${next.id}`)?.focus()
  }

  return (
    <section id="showcase" className="scroll-mt-16 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="See it in action"
          title={
            <>
              One workspace for the whole <span className="lp-gradient-text">support loop</span>
            </>
          }
          intro="From the moment a customer asks to the moment they rate your answer."
        />

        <div ref={ref} className="mt-14 grid items-start gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)] lg:gap-12">
          <Reveal>
            <div role="tablist" aria-label="Product tour" aria-orientation="vertical" onKeyDown={onKey} className="flex flex-col gap-2">
              {TABS.map((t) => {
                const selected = t.id === active
                return (
                  <button
                    key={t.id}
                    id={`tab-${t.id}`}
                    role="tab"
                    type="button"
                    aria-selected={selected}
                    aria-controls={`panel-${t.id}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => pick(t.id)}
                    className={cn(
                      'group relative overflow-hidden rounded-2xl border p-4 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selected ? 'border-primary/30 bg-card shadow-lg shadow-primary/5' : 'border-transparent hover:bg-muted/60',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:text-foreground')}>
                        <t.icon className="size-[18px]" />
                      </span>
                      <span className="font-semibold tracking-tight">{t.label}</span>
                    </div>
                    <AnimatePresence initial={false}>
                      {selected && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} className="overflow-hidden">
                          <p className="mt-3 text-[15px] font-medium text-balance">{t.title}</p>
                          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
                          <ul className="mt-3 space-y-1.5">
                            {t.points.map((p) => (
                              <li key={p} className="flex items-start gap-2 text-sm text-foreground/80">
                                <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {p}
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {selected && auto && !reduce && (
                      <motion.span key={`${active}-bar`} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: AUTO_MS / 1000, ease: 'linear' }} style={{ transformOrigin: 'left' }} className="absolute inset-x-0 bottom-0 h-0.5 bg-primary/60" />
                    )}
                  </button>
                )
              })}
            </div>
          </Reveal>

          <Reveal delay={0.1} className="relative min-w-0">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-linear-to-br from-emerald-200/40 via-transparent to-violet-200/40 blur-2xl" aria-hidden />
            <div role="tabpanel" id={`panel-${tab.id}`} aria-labelledby={`tab-${tab.id}`} tabIndex={0} className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <AnimatePresence mode="wait">
                <motion.div key={tab.id} initial={reduce ? false : { opacity: 0, y: 14, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduce ? undefined : { opacity: 0, y: -10 }} transition={{ duration: 0.35, ease: EASE }}>
                  {MOCKS[tab.id]()}
                </motion.div>
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
