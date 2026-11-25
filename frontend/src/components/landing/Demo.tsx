import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Check, Headphones, Loader2, UserRound } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { ApiError, errorMessage } from '@/lib/api'
import { demoApi } from '@/lib/endpoints'
import { cn } from '@/lib/utils'

import { TEMPLATES, type TemplateMeta } from './constants'
import { EASE, WordReveal } from './motion'

type Role = 'agent' | 'customer'

const STEPS: { title: string; hint: string }[] = [
  { title: 'Creating your private workspace', hint: 'A fresh, isolated sandbox just for you' },
  { title: 'Seeding customers and tickets', hint: 'Realistic conversations, SLAs and history' },
  { title: 'Indexing the knowledge base', hint: 'Articles the AI will cite in its answers' },
  { title: 'Warming up the AI', hint: 'Triage, sentiment and draft replies' },
  { title: 'Opening your workspace', hint: 'Taking you to the desk' },
]
const isColdStart = (err: unknown) => err instanceof ApiError && (err.status === 0 || err.status >= 502)

/** One solid colour per company, taken from the page palette. `bg`/`fg` colour the icon badge and the Try demo button. */
const THEMES: Record<string, { bg: string; fg: string }> = {
  saas: { bg: '#6a4df4', fg: '#ffffff' },
  helpdesk: { bg: '#c8f560', fg: '#0b0a1d' },
  ecommerce: { bg: '#ffb3cc', fg: '#0b0a1d' },
}
const themeOf = (t: TemplateMeta) => THEMES[t.key] ?? { bg: t.hue, fg: '#ffffff' }

/** Equal-size company card: coloured icon badge, name, tagline, counts, and one Try demo button pinned to the bottom. */
function Selector({ t, index, busy, onStart }: { t: TemplateMeta; index: number; busy: TemplateMeta | null; onStart: (t: TemplateMeta) => void }) {
  const reduce = useReducedMotion()
  const th = themeOf(t)
  const Icon = t.icon
  const working = busy?.key === t.key
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: EASE }}
      whileHover={reduce ? undefined : { y: -6 }}
      className="relative flex h-full min-h-[19rem] w-full min-w-0 flex-col rounded-[var(--lp-radius)] bg-white p-6 text-left text-(--lp-ink) shadow-(--lp-shadow) ring-1 ring-black/[0.06] transition-shadow duration-300 hover:shadow-[0_30px_60px_-26px_rgba(11,10,29,0.45)]"
    >
      <span className="flex size-16 items-center justify-center rounded-[1.4rem]" style={{ backgroundColor: th.bg, color: th.fg }}>
        <Icon className="size-8" />
      </span>
      <span className="mt-5 block text-[1.55rem] leading-[1.1] font-semibold tracking-[-0.03em]">{t.name}</span>
      <span className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm leading-snug text-(--lp-muted)">{t.tagline}</span>
      <span className="mt-4 block text-[13px] font-semibold text-(--lp-muted)">
        {t.stats.tickets} tickets · {t.stats.articles} articles
      </span>
      <button
        type="button"
        disabled={Boolean(busy)}
        onClick={() => onStart(t)}
        style={{ backgroundColor: th.bg, color: th.fg }}
        className="lp-focus group mt-auto flex h-13 w-full items-center justify-center gap-2 rounded-full px-5 text-base font-semibold whitespace-nowrap shadow-[0_12px_26px_-14px_rgba(11,10,29,0.6)] transition-[transform,opacity] hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60"
      >
        {working ? <Loader2 className="size-5 animate-spin" /> : null} Try demo <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
      </button>
    </motion.div>
  )
}

/** Small segmented control: which side of the sandbox the Try demo buttons open. */
function RoleToggle({ role, onChange }: { role: Role; onChange: (r: Role) => void }) {
  const opts: { key: Role; label: string; Icon: typeof Headphones }[] = [
    { key: 'agent', label: 'Support agent', Icon: Headphones },
    { key: 'customer', label: 'Customer', Icon: UserRound },
  ]
  return (
    <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
      <span className="text-sm font-semibold">Enter as</span>
      <div role="radiogroup" aria-label="Enter the demo as" className="inline-flex rounded-full bg-white p-1 shadow-(--lp-shadow) ring-1 ring-black/[0.06]">
        {opts.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={role === key}
            onClick={() => onChange(key)}
            className={cn('lp-focus flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors', role === key ? 'bg-(--lp-ink) text-white' : 'text-(--lp-ink)/70 hover:text-(--lp-ink)')}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Overlay({ name, step, progress, waking, error, onClose }: { name: string; step: number; progress: number; waking: boolean; error: string | null; onClose: () => void }) {
  const reduce = useReducedMotion()
  const blobs = [
    { c: '#6a4df4', x: ['-10%', '8%', '-10%'], y: ['-12%', '6%', '-12%'], s: 'left-[8%] top-[10%] size-[34rem]' },
    { c: '#2dd4bf', x: ['6%', '-8%', '6%'], y: ['8%', '-6%', '8%'], s: 'right-[4%] bottom-[6%] size-[30rem]' },
    { c: '#f472b6', x: ['0%', '10%', '0%'], y: ['6%', '-8%', '6%'], s: 'right-[30%] top-[-8%] size-[22rem]' },
  ]
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-[#0d0b24] p-6 text-white" role="status" aria-live="polite">
      {/* drifting colour fields + faint grid */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {blobs.map((b, i) => (
          <motion.div
            key={i}
            className={cn('absolute rounded-full opacity-30 blur-[110px]', b.s)}
            style={{ background: b.c }}
            animate={reduce ? undefined : { x: b.x, y: b.y }}
            transition={{ duration: 9 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.45, ease: EASE }} className="relative w-full max-w-lg">
        <div className="flex flex-col items-center text-center">
          <div className="relative flex size-16 items-center justify-center">
            <motion.span className="absolute inset-0 rounded-2xl border border-white/30" animate={reduce ? undefined : { scale: [1, 1.5], opacity: [0.6, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }} />
            <span className="relative flex size-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-semibold ring-1 ring-white/25 backdrop-blur">{name.trim().charAt(0)}</span>
          </div>
          <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-white/55 uppercase">Building your sandbox</p>
          <h3 className="mt-2 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{name}</h3>
        </div>

        <ol className="mt-10 space-y-2.5 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10 backdrop-blur-md">
          {STEPS.map((s, i) => {
            const active = i === step && !error
            const complete = i < step
            return (
              <motion.li
                key={s.title}
                initial={false}
                animate={{ opacity: i <= step ? 1 : 0.4, backgroundColor: active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0)' }}
                transition={{ duration: 0.35 }}
                className="flex items-center gap-3.5 rounded-xl px-3.5 py-3"
              >
                <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors', complete ? 'bg-emerald-400 text-[#06281f]' : active ? 'bg-white text-[#2a1d7a]' : 'bg-white/10 text-white/60')}>
                  {complete ? (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
                      <Check className="size-[18px]" strokeWidth={3} />
                    </motion.span>
                  ) : active ? (
                    <Loader2 className="size-[18px] animate-spin" />
                  ) : (
                    <span className="text-xs font-semibold">{i + 1}</span>
                  )}
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block text-[15px] font-semibold">{s.title}</span>
                  <AnimatePresence initial={false}>
                    {active && (
                      <motion.span initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="block overflow-hidden text-[13px] text-white/60">
                        <span className="block pt-0.5">{s.hint}</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </motion.li>
            )
          })}
        </ol>

        <div className="mt-7 flex items-center gap-4">
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/15">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-[#8b74ff] via-[#5eead4] to-[#f9a8d4]" animate={{ width: `${progress}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
            {!reduce && <motion.span className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/40 to-transparent" animate={{ x: ['-6rem', '36rem'] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }} />}
          </div>
          <span className="w-10 text-right text-sm font-semibold tabular-nums">{Math.round(progress)}%</span>
        </div>

        {waking && !error && <p className="mt-5 text-center text-sm text-white/60">The demo runs on a free server that naps when idle. Waking it up can take up to a minute the first time.</p>}
        {error && (
          <div className="mt-6 rounded-2xl bg-rose-500/15 p-4 text-center ring-1 ring-rose-400/40">
            <p role="alert" className="text-sm text-rose-100">{error}</p>
            <button type="button" onClick={onClose} className="lp-focus mt-3 rounded-lg bg-white px-5 py-2 text-sm font-semibold text-[#1b1352]">
              Back to the demos
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export function Demo({ notice }: { notice?: string | null }) {
  const { startDemo, switchView } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('agent')
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

  // steps advance on a timer, but the last one only lights up once the API call has really finished
  const step = done ? STEPS.length - 1 : Math.min(Math.floor(elapsed / 1.4), STEPS.length - 2)
  const progress = done ? 100 : Math.min(90, 6 + elapsed * 11)

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
    <section id="demo" data-nav="light" className="relative -mt-10 rounded-t-[2.5rem] bg-(--lp-demo) pb-28 text-(--lp-ink) sm:pb-32">
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

        <RoleToggle role={role} onChange={setRole} />

        {/* three equal company cards: snapping row on phones, equal columns from md up */}
        <div className="-mx-5 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pt-3 pb-5 md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:pb-3 [&::-webkit-scrollbar]:hidden">
          {templates.map((t, i) => (
            <div key={t.key} className="w-[80%] shrink-0 snap-center sm:w-[60%] md:w-auto md:shrink">
              <Selector t={t} index={i} busy={busy} onStart={(m) => launch(m, role)} />
            </div>
          ))}
        </div>

        {live.isError && (
          <p className="mt-6 text-center text-sm font-medium text-(--lp-ink)/75">The demo server naps when idle, so the first start can take up to a minute.</p>
        )}
      </div>

      <AnimatePresence>
        {busy && <Overlay name={busy.name} step={step} progress={progress} waking={elapsed > 7} error={error} onClose={() => { setBusy(null); setError(null) }} />}
      </AnimatePresence>
    </section>
  )
}
