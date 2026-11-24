import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Check, CircleDot, Headphones, Loader2, UserRound } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion, useScroll } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { ApiError, errorMessage } from '@/lib/api'
import { demoApi } from '@/lib/endpoints'
import { cn } from '@/lib/utils'

import { DEMO_THEMES, FALLBACK_THEME, TEMPLATES, type TemplateMeta } from './constants'
import { EASE, useParallax, WordReveal } from './motion'

type Role = 'agent' | 'customer'

const STEPS = ['Creating your private workspace', 'Seeding customers and tickets', 'Teaching the AI the knowledge base', 'Opening your workspace']
const isColdStart = (err: unknown) => err instanceof ApiError && (err.status === 0 || err.status >= 502)

const PRIORITY_DOT: Record<string, string> = { Critical: '#ef4444', High: '#f97316', Medium: '#f59e0b', Low: '#38bdf8' }

function DemoCard({ t, index, busy, onStart }: { t: TemplateMeta; index: number; busy: boolean; onStart: (t: TemplateMeta, role: Role) => void }) {
  const theme = DEMO_THEMES[t.key] ?? FALLBACK_THEME
  const reduce = useReducedMotion()
  const Icon = t.icon
  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 70 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8, delay: index * 0.12, ease: EASE }}
      whileHover={reduce ? undefined : { y: -10 }}
      style={{ background: theme.bg, color: theme.fg }}
      className="group relative flex min-h-[34rem] flex-col overflow-hidden rounded-[2rem] p-6 shadow-[0_40px_90px_-40px_rgba(60,15,0,0.65)] ring-1 ring-black/10 sm:p-7"
    >
      <div className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full opacity-60 blur-3xl transition-transform duration-700 group-hover:scale-125" style={{ background: theme.accent }} aria-hidden />
      <div className="lp-noise pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative flex items-start justify-between">
        <span className="flex size-14 items-center justify-center rounded-2xl shadow-lg" style={{ background: theme.accent, color: theme.fg === '#ffffff' ? '#0b0a1d' : '#fff' }}>
          <Icon className="size-7" />
        </span>
        <span className="rounded-full px-3 py-1 text-[11px] font-bold tracking-wide uppercase" style={{ background: theme.chip }}>
          {t.industry}
        </span>
      </div>

      <h3 className="relative mt-6 text-[2rem] leading-[1.02] font-semibold tracking-[-0.035em]">{t.name}</h3>
      <p className="relative mt-2 text-[15px]" style={{ color: theme.muted }}>
        {t.tagline}
      </p>

      <ul className="relative mt-5 space-y-2">
        {t.highlights.map((h) => (
          <li key={h} className="flex items-center gap-2.5 text-[14px] font-medium">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full" style={{ background: theme.accent, color: theme.fg === '#ffffff' ? '#0b0a1d' : '#fff' }}>
              <Check className="size-3" strokeWidth={3} />
            </span>
            {h}
          </li>
        ))}
      </ul>

      {/* mini queue: always visible, nudges forward on hover */}
      <div className="relative mt-6 space-y-1.5">
        {t.tickets.slice(0, 3).map((k, i) => (
          <div key={k.ref} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] backdrop-blur transition-transform duration-500 group-hover:translate-x-1.5" style={{ background: theme.row, transitionDelay: `${i * 60}ms` }}>
            <span className="size-2 shrink-0 rounded-full" style={{ background: PRIORITY_DOT[k.priority] }} />
            <span className="min-w-0 flex-1 truncate font-medium">{k.subject}</span>
            <span className="shrink-0 text-[10.5px] font-semibold opacity-70">{k.priority}</span>
          </div>
        ))}
      </div>

      <div className="relative mt-auto pt-6">
        <p className="mb-3 text-[12px] font-semibold" style={{ color: theme.muted }}>
          {theme.tickets} sample tickets · AI pre-loaded
        </p>
        <div className="grid gap-2">
          <button type="button" disabled={busy} onClick={() => onStart(t, 'agent')} className="lp-focus group/btn flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition-transform hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60" style={{ background: theme.accent, color: theme.fg === '#ffffff' ? '#0b0a1d' : '#fff' }}>
            <Headphones className="size-4" /> Enter as agent <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-1" />
          </button>
          <button type="button" disabled={busy} onClick={() => onStart(t, 'customer')} className="lp-focus flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold ring-1 transition-colors hover:bg-white/15 disabled:opacity-60" style={{ boxShadow: `inset 0 0 0 1px ${theme.fg === '#ffffff' ? 'rgba(255,255,255,0.4)' : 'rgba(43,22,8,0.3)'}` }}>
            <UserRound className="size-4" /> Enter as customer
          </button>
        </div>
      </div>
    </motion.article>
  )
}

function Overlay({ name, step, progress, waking, error, onClose }: { name: string; step: number; progress: number; waking: boolean; error: string | null; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-(--lp-ink)/95 p-6 text-white backdrop-blur-xl" role="status" aria-live="polite">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="lp-drift absolute top-1/4 left-1/4 size-[30rem] rounded-full bg-(--lp-violet) opacity-40 blur-3xl" />
        <div className="lp-drift absolute right-1/4 bottom-1/4 size-[26rem] rounded-full bg-(--lp-coral) opacity-30 blur-3xl [animation-delay:-8s]" />
      </div>
      <div className="relative w-full max-w-md">
        <p className="text-center text-xs font-bold tracking-[0.2em] text-(--lp-lime) uppercase">Building your sandbox</p>
        <h3 className="mt-3 text-center text-4xl font-semibold tracking-[-0.04em]">{name}</h3>
        <ol className="mt-9 space-y-3.5">
          {STEPS.map((s, i) => (
            <li key={s} className={cn('flex items-center gap-3 text-[15px] transition-colors', i <= step ? 'text-white' : 'text-white/35')}>
              <span className="flex size-6 shrink-0 items-center justify-center">
                {i < step ? <Check className="size-5 text-(--lp-lime)" /> : i === step ? <Loader2 className="size-5 animate-spin text-(--lp-lime)" /> : <CircleDot className="size-4" />}
              </span>
              {s}
            </li>
          ))}
        </ol>
        <div className="mt-8 h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full rounded-full bg-(--lp-lime)" animate={{ width: `${progress}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
        </div>
        {waking && !error && <p className="mt-5 text-center text-sm text-white/60">The demo runs on a free server that naps when idle. Waking it up can take up to a minute the first time.</p>}
        {error && (
          <div className="mt-6 rounded-2xl bg-red-500/15 p-4 text-center ring-1 ring-red-400/30">
            <p role="alert" className="text-sm text-red-100">{error}</p>
            <button type="button" onClick={onClose} className="lp-focus mt-3 rounded-full bg-white px-5 py-2 text-sm font-semibold text-(--lp-ink)">
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
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const blobA = useParallax(scrollYProgress, -160)
  const blobB = useParallax(scrollYProgress, 120)
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
    <section id="demo" ref={ref} data-nav="light" className="relative -mt-10 rounded-t-[2.5rem] bg-[linear-gradient(170deg,#ff6a4d_0%,#ff8a4c_45%,#ffb340_100%)] pb-28 text-(--lp-ink)">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-t-[2.5rem]" aria-hidden>
        <motion.div style={{ y: blobA }} className="absolute -top-24 left-[-6rem] size-[30rem] rounded-full bg-(--lp-violet) opacity-30 blur-3xl" />
        <motion.div style={{ y: blobB }} className="absolute -right-24 bottom-10 size-[28rem] rounded-full bg-(--lp-paper) opacity-50 blur-3xl" />
        <div className="lp-noise absolute inset-0" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pt-24 sm:px-8 sm:pt-32">
        <p className="text-xs font-bold tracking-[0.2em] uppercase opacity-70">Live demo</p>
        <h2 className="mt-4 max-w-4xl text-[clamp(2.6rem,7.4vw,6rem)] leading-[0.94] font-semibold tracking-[-0.05em] text-balance">
          <WordReveal text="Pick a desk. Run it yourself." />
        </h2>
        <p className="mt-5 max-w-xl text-lg font-medium opacity-80">Three ready-made companies, each with real-looking tickets, a knowledge base and AI already at work. Choose one and step inside as the agent or the customer.</p>

        {notice && (
          <p role="status" className="mt-6 max-w-xl rounded-2xl bg-white/80 px-4 py-3 text-sm font-medium text-amber-900">
            {notice}
          </p>
        )}

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {templates.map((t, i) => (
            <DemoCard key={t.key} t={t} index={i} busy={Boolean(busy)} onStart={launch} />
          ))}
        </div>
        <p className="mt-8 text-center text-sm font-semibold opacity-80">No signup · private to you · wiped after 24 hours</p>
      </div>

      <AnimatePresence>
        {busy && <Overlay name={busy.name} step={step} progress={progress} waking={elapsed > 7} error={error} onClose={() => { setBusy(null); setError(null) }} />}
      </AnimatePresence>
    </section>
  )
}
