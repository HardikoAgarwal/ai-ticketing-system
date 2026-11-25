import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Check, CircleDot, Headphones, Loader2, UserRound } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { ApiError, errorMessage } from '@/lib/api'
import { demoApi } from '@/lib/endpoints'
import { cn } from '@/lib/utils'

import { TEMPLATES, type TemplateMeta } from './constants'
import { EASE, WordReveal } from './motion'

type Role = 'agent' | 'customer'

const STEPS = ['Creating your private workspace', 'Seeding customers and tickets', 'Teaching the AI the knowledge base', 'Opening your workspace']
const isColdStart = (err: unknown) => err instanceof ApiError && (err.status === 0 || err.status >= 502)

const PRIORITY_DOT: Record<string, string> = { Critical: '#ef4444', High: '#f97316', Medium: '#f59e0b', Low: '#38bdf8' }

/** All three cards share one structure and one colour treatment; only a small icon tint differs per company. */
function DemoCard({ t, index, busy, active, onStart }: { t: TemplateMeta; index: number; busy: boolean; active: boolean; onStart: (t: TemplateMeta, role: Role) => void }) {
  const reduce = useReducedMotion()
  const Icon = t.icon
  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay: index * 0.1, ease: EASE }}
      whileHover={reduce || busy ? undefined : { y: -6 }}
      className={cn(
        'group flex h-full min-w-0 flex-col rounded-3xl bg-white p-6 text-(--lp-ink) shadow-[0_26px_60px_-34px_rgba(120,90,40,0.45)] ring-1 transition-shadow duration-300 hover:shadow-[0_36px_70px_-30px_rgba(120,90,40,0.5)] sm:p-7',
        active ? 'ring-2 ring-(--lp-violet)' : 'ring-black/5 hover:ring-black/20',
      )}
    >
      {/* 1 · header */}
      <div className="flex items-center justify-between">
        <span className="flex size-12 items-center justify-center rounded-2xl" style={{ background: t.soft, color: t.hue }}>
          <Icon className="size-6" />
        </span>
        <span className="rounded-full bg-(--lp-lav) px-3 py-1 text-[11px] font-semibold tracking-wide text-(--lp-ink-2) uppercase">{t.industry}</span>
      </div>

      {/* 2 · name + one-line description (fixed two-line height keeps every card aligned) */}
      <h3 className="mt-5 line-clamp-2 min-h-[3.4rem] text-2xl leading-[1.15] font-semibold tracking-[-0.03em]">{t.name}</h3>
      <p className="mt-2 line-clamp-2 min-h-[2.6rem] text-sm leading-snug text-(--lp-ink-2)">{t.tagline}</p>

      <hr className="my-5 border-black/[0.07]" />

      {/* 3 · highlights */}
      <ul className="space-y-1">
        {t.highlights.map((h) => (
          <li key={h} className="flex h-10 items-center gap-2.5 text-sm font-medium">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-(--lp-violet)/10 text-(--lp-violet)">
              <Check className="size-3" strokeWidth={3} />
            </span>
            <span className="line-clamp-2 min-w-0 leading-snug">{h}</span>
          </li>
        ))}
      </ul>

      {/* 4 · mini queue */}
      <div className="mt-6 rounded-2xl bg-(--lp-paper) p-2 ring-1 ring-black/[0.05]">
        <p className="px-2 pt-1 pb-1.5 text-[10.5px] font-bold tracking-wide text-(--lp-ink-2) uppercase">Inside the queue · 53 tickets</p>
        {t.tickets.slice(0, 3).map((k) => (
          <div key={k.ref} className="flex h-9 items-center gap-2.5 rounded-lg px-2 text-[12px]">
            <span className="size-2 shrink-0 rounded-full" style={{ background: PRIORITY_DOT[k.priority] }} />
            <span className="min-w-0 flex-1 truncate font-medium">{k.subject}</span>
            <span className="w-12 shrink-0 text-right text-[10.5px] font-semibold text-(--lp-ink-2)">{k.priority}</span>
          </div>
        ))}
      </div>

      {/* 5 · actions, pinned to the bottom so all cards line up */}
      <div className="mt-auto grid gap-2 pt-6">
        <button type="button" disabled={busy} onClick={() => onStart(t, 'agent')} className="lp-focus group/btn flex h-12 items-center justify-center gap-2 rounded-full bg-(--lp-violet) text-[15px] font-semibold text-white transition-all hover:bg-(--lp-violet-2) active:scale-[0.99] disabled:opacity-60">
          {active ? <Loader2 className="size-4 animate-spin" /> : <Headphones className="size-4" />} Enter as agent <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-1" />
        </button>
        <button type="button" disabled={busy} onClick={() => onStart(t, 'customer')} className="lp-focus flex h-12 items-center justify-center gap-2 rounded-full bg-white text-[15px] font-semibold text-(--lp-ink) ring-1 ring-(--lp-lav-2) transition-colors hover:bg-(--lp-lav) disabled:opacity-60">
          <UserRound className="size-4" /> Enter as customer
        </button>
      </div>
    </motion.article>
  )
}

function Overlay({ name, step, progress, waking, error, onClose }: { name: string; step: number; progress: number; waking: boolean; error: string | null; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-(--lp-paper)/95 p-6 text-(--lp-ink) backdrop-blur-xl" role="status" aria-live="polite">
      <div className="relative w-full max-w-md">
        <p className="text-center text-xs font-bold tracking-[0.2em] text-(--lp-violet) uppercase">Building your sandbox</p>
        <h3 className="mt-3 text-center text-4xl font-semibold tracking-[-0.04em]">{name}</h3>
        <ol className="mt-9 space-y-3.5">
          {STEPS.map((s, i) => (
            <li key={s} className={cn('flex items-center gap-3 text-[15px] transition-colors', i <= step ? 'text-(--lp-ink)' : 'text-(--lp-ink-2)/45')}>
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
        {waking && !error && <p className="mt-5 text-center text-sm text-(--lp-ink-2)">The demo runs on a free server that naps when idle. Waking it up can take up to a minute the first time.</p>}
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

  return (
    <section id="demo" ref={ref} data-nav="light" className="relative -mt-10 rounded-t-[2.5rem] bg-(--lp-coral-soft) pb-32 text-(--lp-ink)">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-t-[2.5rem]" aria-hidden>
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pt-24 sm:px-8 sm:pt-32">
        <div>
        <p className="text-xs font-bold tracking-[0.2em] text-(--lp-violet) uppercase">Live demo</p>
        <h2 className="mt-4 max-w-4xl text-[clamp(2.6rem,7.4vw,6rem)] leading-[0.94] font-semibold tracking-[-0.05em] text-balance">
          <WordReveal text="Pick a desk. Run it yourself." />
        </h2>
        <p className="mt-5 max-w-xl text-lg font-medium text-(--lp-ink-2)">Three ready-made companies, each with real-looking tickets, a knowledge base and AI already at work. Choose one and step inside as the agent or the customer.</p>
        </div>

        {notice && (
          <p role="status" className="mt-6 max-w-xl rounded-2xl bg-white px-4 py-3 text-sm font-medium text-[#5a3d00] ring-1 ring-(--lp-butter-2)">
            {notice}
          </p>
        )}

        {/* three equal columns on desktop; one equal-width column (centred) everywhere else, so cards never differ in size */}
        <div className="mx-auto mt-14 grid max-w-md grid-cols-1 items-stretch gap-6 lg:max-w-none lg:grid-cols-3 lg:gap-7">
          {templates.map((t, i) => (
            <DemoCard key={t.key} t={t} index={i} busy={Boolean(busy)} active={busy?.key === t.key} onStart={launch} />
          ))}
        </div>
        <p className="mt-8 text-center text-sm font-semibold text-(--lp-ink-2)">No signup · private to you · wiped after 24 hours</p>
      </div>

      <AnimatePresence>
        {busy && <Overlay name={busy.name} step={step} progress={progress} waking={elapsed > 7} error={error} onClose={() => { setBusy(null); setError(null) }} />}
      </AnimatePresence>
    </section>
  )
}
