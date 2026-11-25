import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Check, CircleDot, Headphones, Loader2, UserRound } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { ApiError, errorMessage } from '@/lib/api'
import { demoApi } from '@/lib/endpoints'
import { cn } from '@/lib/utils'

import { MOOD_STYLE, PRIORITY_STYLE, TEMPLATES, type TemplateMeta } from './constants'
import { EASE, WordReveal } from './motion'

type Role = 'agent' | 'customer'

const STEPS = ['Creating your private workspace', 'Seeding customers and tickets', 'Teaching the AI the knowledge base', 'Opening your workspace']
const isColdStart = (err: unknown) => err instanceof ApiError && (err.status === 0 || err.status >= 502)

const PRIORITY_DOT: Record<string, string> = { Critical: '#ef4444', High: '#f97316', Medium: '#f59e0b', Low: '#38bdf8' }

/** One solid colour per company, taken from the page palette. `bg`/`fg` fill the selected card; `tint` washes the preview panel. */
const THEMES: Record<string, { bg: string; fg: string; tint: string; check: string }> = {
  saas: { bg: '#6a4df4', fg: '#ffffff', tint: '#ece8ff', check: '#5b3df5' },
  helpdesk: { bg: '#c8f560', fg: '#0b0a1d', tint: '#effad0', check: '#4d7a0a' },
  ecommerce: { bg: '#ffb3cc', fg: '#0b0a1d', tint: '#ffe8ef', check: '#c2325f' },
}
const themeOf = (t: TemplateMeta) => THEMES[t.key] ?? { bg: t.hue, fg: '#ffffff', tint: t.soft, check: t.hue }

/** Equal-size selector card. Unselected: white with a coloured icon badge. Selected: the company's colour, lifted, with a check. */
function Selector({ t, selected, index, onSelect }: { t: TemplateMeta; selected: boolean; index: number; onSelect: () => void }) {
  const reduce = useReducedMotion()
  const th = themeOf(t)
  const Icon = t.icon
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      initial={reduce ? false : { opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: EASE }}
      whileHover={reduce ? undefined : { y: selected ? -10 : -5 }}
      animate={reduce ? undefined : { y: selected ? -8 : 0 }}
      style={selected ? { backgroundColor: th.bg, color: th.fg } : undefined}
      className={cn(
        'lp-focus relative flex h-full min-h-[14.5rem] w-full min-w-0 flex-col rounded-[var(--lp-radius)] p-6 text-left ring-1 transition-[box-shadow,background-color,color] duration-300',
        selected ? 'shadow-[0_30px_60px_-24px_rgba(11,10,29,0.55)] ring-2 ring-(--lp-ink)/80' : 'bg-white text-(--lp-ink) shadow-(--lp-shadow) ring-black/[0.06] hover:shadow-[0_30px_60px_-26px_rgba(11,10,29,0.45)]',
      )}
    >
      <span className="flex items-start justify-between">
        <span className="flex size-16 items-center justify-center rounded-[1.4rem]" style={{ backgroundColor: selected ? th.fg : th.bg, color: selected ? th.bg : th.fg }}>
          <Icon className="size-8" />
        </span>
        <span
          aria-hidden
          className={cn('flex size-8 items-center justify-center rounded-full ring-2 transition-all duration-300', selected ? 'scale-100 bg-white text-(--lp-ink) ring-white' : 'scale-90 bg-transparent text-transparent ring-black/15')}
        >
          <Check className="size-4" strokeWidth={3} />
        </span>
      </span>
      <span className="mt-5 block text-[1.55rem] leading-[1.1] font-semibold tracking-[-0.03em]">{t.name}</span>
      <span className={cn('mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm leading-snug', selected ? 'opacity-85' : 'text-(--lp-muted)')}>{t.tagline}</span>
      <span className={cn('mt-auto block pt-4 text-[13px] font-semibold', selected ? 'opacity-90' : 'text-(--lp-muted)')}>
        {t.stats.tickets} tickets · {t.stats.articles} articles
      </span>
    </motion.button>
  )
}

const list = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } }
const row = { hidden: { opacity: 0, x: -18 }, show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE } } }

/** The big preview: a browser window showing the selected company's queue, what to try, and the two ways in. */
function Preview({ t, busy, loadingNote, onStart }: { t: TemplateMeta; busy: TemplateMeta | null; loadingNote: boolean; onStart: (t: TemplateMeta, role: Role) => void }) {
  const th = themeOf(t)
  const slug = t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const working = busy?.key === t.key
  return (
    <div className="overflow-hidden rounded-[2rem] bg-white text-(--lp-ink) shadow-[0_40px_90px_-36px_rgba(11,10,29,0.55)] ring-1 ring-black/[0.06]">
      <div className="flex items-center gap-3 border-b border-black/[0.07] bg-(--lp-paper) px-4 py-3">
        <span className="size-3 rounded-full bg-(--lp-rose-2)" />
        <span className="size-3 rounded-full bg-(--lp-butter-2)" />
        <span className="size-3 rounded-full bg-(--lp-mint-2)" />
        <span className="mx-auto w-full max-w-sm truncate rounded-full bg-white px-4 py-1 text-center text-xs font-medium text-(--lp-muted) ring-1 ring-black/[0.06]">helpdesk.ai/w/{slug}/agent</span>
        <span className="hidden w-12 sm:block" />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={t.key} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease: EASE }} className="grid lg:min-h-[28rem] lg:grid-cols-[1.4fr_1fr]">
          {/* queue */}
          <div className="min-w-0 p-5 sm:p-7">
            <p className="mb-3 flex items-center justify-between text-xs font-bold tracking-wide text-(--lp-muted) uppercase">
              <span>Queue</span>
              <span className="font-semibold normal-case">{t.stats.tickets} open and resolved</span>
            </p>
            <motion.ul variants={list} initial="hidden" animate="show" className="space-y-2">
              {t.tickets.map((k) => (
                <motion.li key={k.ref} variants={row} className="flex items-center gap-3 rounded-2xl border border-black/[0.07] bg-white px-3.5 py-3">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: PRIORITY_DOT[k.priority] }} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold">{k.subject}</span>
                    <span className="mt-0.5 block truncate text-xs text-(--lp-muted)">
                      {k.ref} · {k.who} · {k.category}
                    </span>
                  </span>
                  <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
                    {k.mood && <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', MOOD_STYLE[k.mood])}>{k.mood}</span>}
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', PRIORITY_STYLE[k.priority])}>{k.priority}</span>
                  </span>
                </motion.li>
              ))}
            </motion.ul>
          </div>

          {/* what to try + actions */}
          <div className="flex min-w-0 flex-col p-5 sm:p-7" style={{ backgroundColor: th.tint }}>
            <h3 className="text-2xl leading-tight font-semibold tracking-[-0.03em]">{t.name}</h3>
            <p className="mt-1 text-sm text-(--lp-muted)">{t.blurb}</p>
            <ul className="mt-5 space-y-2.5">
              {t.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2.5 text-sm font-medium">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white" style={{ color: th.check }}>
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  <span className="min-w-0 leading-snug">{h}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto grid gap-3 pt-7">
              <button type="button" disabled={Boolean(busy)} onClick={() => onStart(t, 'agent')} className="lp-focus group flex h-14 w-full items-center justify-center gap-2 rounded-full bg-(--lp-violet) px-5 text-base font-semibold whitespace-nowrap text-white shadow-[0_14px_30px_-14px_rgba(91,61,245,0.8)] transition-all hover:bg-(--lp-violet-2) active:scale-[0.99] disabled:opacity-60">
                {working ? <Loader2 className="size-5 animate-spin" /> : <Headphones className="size-5" />} Enter as agent <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </button>
              <button type="button" disabled={Boolean(busy)} onClick={() => onStart(t, 'customer')} className="lp-focus flex h-14 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-base font-semibold whitespace-nowrap text-(--lp-ink) ring-1 ring-black/20 transition-colors hover:bg-(--lp-paper) disabled:opacity-60">
                <UserRound className="size-5" /> Enter as customer
              </button>
              {loadingNote && <p className="text-center text-xs text-(--lp-muted)">The demo server naps when idle, so the first start can take up to a minute.</p>}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function Overlay({ name, step, progress, waking, error, onClose }: { name: string; step: number; progress: number; waking: boolean; error: string | null; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-(--lp-paper) p-6 text-(--lp-ink)" role="status" aria-live="polite">
      <div className="relative w-full max-w-md">
        <p className="text-center text-sm font-semibold text-(--lp-muted)">Building your sandbox</p>
        <h3 className="mt-2 text-center text-4xl font-semibold tracking-[-0.04em]">{name}</h3>
        <ol className="mt-9 space-y-3.5">
          {STEPS.map((s, i) => (
            <li key={s} className={cn('flex items-center gap-3 text-[15px] transition-colors', i <= step ? 'text-(--lp-ink)' : 'text-(--lp-muted)/45')}>
              <span className="flex size-6 shrink-0 items-center justify-center">
                {i < step ? <Check className="size-5 text-(--lp-violet)" /> : i === step ? <Loader2 className="size-5 animate-spin text-(--lp-violet)" /> : <CircleDot className="size-4" />}
              </span>
              {s}
            </li>
          ))}
        </ol>
        <div className="mt-8 h-2 overflow-hidden rounded-full bg-black/10">
          <motion.div className="h-full rounded-full bg-(--lp-violet)" animate={{ width: `${progress}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
        </div>
        {waking && !error && <p className="mt-5 text-center text-sm text-(--lp-muted)">The demo runs on a free server that naps when idle. Waking it up can take up to a minute the first time.</p>}
        {error && (
          <div className="mt-6 rounded-2xl bg-(--lp-rose) p-4 text-center ring-1 ring-(--lp-rose-2)">
            <p role="alert" className="text-sm text-[#7a1636]">{error}</p>
            <button type="button" onClick={onClose} className="lp-focus mt-3 rounded-full bg-(--lp-violet) px-5 py-2 text-sm font-semibold text-white">
              Back to the demos
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function Demo({ notice }: { notice?: string | null }) {
  const { startDemo, switchView } = useAuth()
  const navigate = useNavigate()
  const ref = useRef<HTMLElement>(null)
  const [selected, setSelected] = useState(0)
  const [busy, setBusy] = useState<TemplateMeta | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const live = useQuery({
    queryKey: ['demo-templates'],
    queryFn: demoApi.templates,
    retry: 4,
    retryDelay: (n) => Math.min(6000, 1500 * (n + 1)),
    staleTime: 5 * 60_000,
  })
  // Static fallback keeps the cards instant while a sleeping free-tier API wakes up; live data wins when present.
  const templates = useMemo(
    () =>
      TEMPLATES.map((m) => {
        const api = live.data?.find((x) => x.key === m.key)
        return api ? { ...m, name: api.name, tagline: api.tagline, industry: api.industry } : m
      }),
    [live.data],
  )

  useEffect(() => {
    if (!busy || error) return
    const id = window.setInterval(() => setElapsed((s) => s + 0.5), 500)
    return () => {
      window.clearInterval(id)
      setElapsed(0)
    }
  }, [busy, error])

  const step = done ? STEPS.length - 1 : Math.min(Math.floor(elapsed / 1.1), STEPS.length - 1)
  const progress = done ? 100 : Math.min(92, 8 + elapsed * 14)

  const launch = async (t: TemplateMeta, role: Role) => {
    if (busy) return
    setError(null)
    setDone(false)
    setBusy(t)
    try {
      let slug: string | null = null
      for (let attempt = 0; attempt < 4 && !slug; attempt++) {
        try {
          slug = await startDemo(t.key)
        } catch (err) {
          if (!isColdStart(err) || attempt === 3) throw err
          await new Promise((r) => setTimeout(r, 4000))
        }
      }
      if (!slug) return
      if (role === 'customer') await switchView('customer')
      setDone(true)
      await new Promise((r) => setTimeout(r, 450))
      navigate(`/w/${slug}/${role === 'customer' ? 'help' : 'agent'}`)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const current = templates[selected]

  return (
    <section id="demo" ref={ref} data-nav="light" className="relative -mt-10 rounded-t-[2.5rem] bg-(--lp-demo) pb-32 text-(--lp-ink)">
      <div className="relative mx-auto max-w-6xl px-5 pt-24 sm:px-8 sm:pt-32">
        <h2 className="max-w-4xl text-[clamp(2.6rem,7.4vw,6rem)] leading-[0.94] font-semibold tracking-[-0.05em] text-balance">
          <WordReveal text="Pick a desk. Run it yourself." />
        </h2>
        <p className="mt-5 max-w-xl text-lg font-medium text-(--lp-ink)/80">Three ready-made companies, each with real-looking tickets, a knowledge base and AI already at work. Choose one and step inside as the agent or the customer.</p>

        {notice && (
          <p role="status" className="mt-6 max-w-xl rounded-2xl bg-white px-4 py-3 text-sm font-medium text-[#5a3d00] ring-1 ring-(--lp-butter-2)">
            {notice}
          </p>
        )}

        {/* three equal selector cards: snapping row on phones, equal columns from md up */}
        <div role="radiogroup" aria-label="Choose a company" className="-mx-5 mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pt-3 pb-5 md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:pb-3 [&::-webkit-scrollbar]:hidden">
          {templates.map((t, i) => (
            <div key={t.key} className="w-[80%] shrink-0 snap-center sm:w-[60%] md:w-auto md:shrink">
              <Selector t={t} index={i} selected={i === selected} onSelect={() => setSelected(i)} />
            </div>
          ))}
        </div>

        <div className="mt-6">
          <Preview t={current} busy={busy} loadingNote={live.isError} onStart={launch} />
        </div>
      </div>

      <AnimatePresence>
        {busy && <Overlay name={busy.name} step={step} progress={progress} waking={elapsed > 7} error={error} onClose={() => { setBusy(null); setError(null) }} />}
      </AnimatePresence>
    </section>
  )
}
