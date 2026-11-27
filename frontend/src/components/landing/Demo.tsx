import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Loader2 } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { ApiError, errorMessage } from '@/lib/api'
import { demoApi } from '@/lib/endpoints'
import { beginSetupHandoff } from '@/features/auth/SetupHandoff'
import { SetupScreen } from '@/features/auth/SetupScreen'
import { SETUP_STEPS } from '@/features/auth/setup-steps'
import { cn } from '@/lib/utils'

import { TEMPLATES, type TemplateMeta } from './constants'
import { lpBtnPrimary, LpBtnIcon } from './cta'
import { EASE, WordReveal } from './motion'

const isColdStart = (err: unknown) => err instanceof ApiError && (err.status === 0 || err.status >= 502)

/** Solid accent strip + ink for each desk. */
const THEMES: Record<string, { accent: string; accentInk: string }> = {
  saas: { accent: '#6a4df4', accentInk: '#ffffff' },
  helpdesk: { accent: '#c8f560', accentInk: '#0b0a1d' },
  ecommerce: { accent: '#ffb3cc', accentInk: '#0b0a1d' },
}
const themeOf = (t: TemplateMeta) => THEMES[t.key] ?? { accent: t.hue, accentInk: '#ffffff' }

/** Neo-brutal desk card: slanted accent top, fixed bands so all three align. */
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
      whileHover={reduce ? undefined : { x: -3, y: -3 }}
      className="relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-[1.75rem] border-2 border-(--lp-ink) bg-white text-left text-(--lp-ink) shadow-[6px_6px_0_0_var(--lp-ink)] transition-[transform,box-shadow] duration-300 hover:shadow-[9px_9px_0_0_var(--lp-ink)]"
    >
      {/* Slanted colour header — fixed height + 2-line title so every card matches */}
      <div className="relative h-[11rem] shrink-0 sm:h-[11.75rem]">
        <div
          className="absolute inset-0 grid grid-rows-[auto_1fr] gap-3 px-5 pt-5 pb-7 sm:px-6 sm:pt-5 sm:pb-8 md:max-lg:px-4"
          style={{
            backgroundColor: th.accent,
            color: th.accentInk,
            clipPath: 'polygon(0 0, 100% 0, 100% 92%, 0 100%)',
          }}
        >
          <div className="flex h-14 items-center justify-between gap-3 sm:h-16">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-[1.2rem] bg-black/10 sm:size-16 sm:rounded-[1.35rem] md:max-lg:size-12 md:max-lg:rounded-2xl">
              <Icon className="size-8 sm:size-9 md:max-lg:size-7" strokeWidth={1.75} />
            </span>
            <span className="rounded-full border-2 border-(--lp-ink)/15 bg-white px-3 py-1.5 text-[11px] font-bold tracking-[0.05em] whitespace-nowrap text-(--lp-ink) uppercase md:max-lg:px-2.5 md:max-lg:text-[10px]">
              {t.industry}
            </span>
          </div>
          <h3 className="line-clamp-2 h-[3.5rem] self-end text-[1.5rem] leading-[1.15] font-semibold tracking-[-0.04em] sm:h-[3.7rem] sm:text-[1.65rem]">
            {t.name}
          </h3>
        </div>
      </div>

      {/* Fixed-band body: every row has a locked height so columns align */}
      <div className="grid flex-1 grid-rows-[2.7rem_3.25rem_auto_auto] gap-4 px-5 pt-2 pb-5 sm:px-6 sm:pb-6 md:max-lg:px-4 md:max-lg:pb-5">
        <p className="line-clamp-2 text-[0.92rem] leading-relaxed text-(--lp-muted)">{t.tagline}</p>

        <ul className="space-y-2">
          {t.highlights.slice(0, 2).map((h) => (
            <li key={h} className="flex h-[1.35rem] items-center gap-2.5 text-[13px] text-(--lp-ink)/80">
              <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: th.accent }} />
              <span className="line-clamp-1 font-medium">{h}</span>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-2 gap-3 border-y-2 border-(--lp-ink)/10 py-4">
          <div>
            <p className="text-2xl leading-none font-bold tracking-[-0.04em] tabular-nums">{t.stats.tickets}</p>
            <p className="mt-1 text-[11px] font-semibold tracking-[0.06em] text-(--lp-muted) uppercase">tickets</p>
          </div>
          <div>
            <p className="text-2xl leading-none font-bold tracking-[-0.04em] tabular-nums">{t.stats.articles}</p>
            <p className="mt-1 text-[11px] font-semibold tracking-[0.06em] text-(--lp-muted) uppercase">articles</p>
          </div>
        </div>

        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => onStart(t)}
          className={cn(lpBtnPrimary, 'mt-auto h-14 w-full justify-between gap-3 py-1.5 pr-1.5 pl-6 text-[0.95rem]')}
        >
          <span className="flex items-center gap-2">
            {working ? <Loader2 className="size-4 animate-spin" /> : null}
            Try demo
          </span>
          <LpBtnIcon tone="lime" className="size-10">
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </LpBtnIcon>
        </button>
      </div>
    </motion.div>
  )
}

export function Demo({ notice }: { notice?: string | null }) {
  const { startDemo } = useAuth()
  const navigate = useNavigate()
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
  const step = done ? SETUP_STEPS.length - 1 : Math.min(Math.floor(elapsed / 1.4), SETUP_STEPS.length - 2)
  const progress = done ? 100 : Math.min(90, 6 + elapsed * 11)

  const trigger = useRef<HTMLElement | null>(null)
  const launch = async (t: TemplateMeta) => {
    if (busy && !error) return
    if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) trigger.current = document.activeElement
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
      setDone(true)
      // Stay on setup while the dashboard chunk loads, then navigate under the same cover.
      await new Promise((r) => setTimeout(r, 420))
      beginSetupHandoff(t.name)
      await import('@/features/home/HomePage')
      navigate(`/w/${slug}/agent`)
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
        <p className="mt-5 max-w-xl text-lg font-medium text-(--lp-ink)/80">Three ready-made companies, each with real-looking tickets, a knowledge base and AI already at work. Choose one and step inside as a support agent.</p>

        {notice && (
          <p role="status" className="mt-6 max-w-xl rounded-2xl bg-white px-4 py-3 text-sm font-medium text-[#5a3d00] ring-1 ring-(--lp-butter-2)">
            {notice}
          </p>
        )}

        {/* three equal company cards: snapping row on phones, equal columns from md up */}
        <div className="-mx-5 mt-10 flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto px-5 pt-3 pb-5 md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:pb-3 [&::-webkit-scrollbar]:hidden">
          {templates.map((t, i) => (
            <div key={t.key} className="flex w-[80%] shrink-0 snap-center sm:w-[60%] md:w-auto md:shrink">
              <Selector t={t} index={i} busy={busy} onStart={launch} />
            </div>
          ))}
        </div>

        {live.isError && (
          <p className="mt-6 text-center text-sm font-medium text-(--lp-ink)/75">The demo server naps when idle, so the first start can take up to a minute.</p>
        )}
      </div>

      <AnimatePresence>
        {busy && (
          <SetupScreen
            name={busy.name}
            step={step}
            progress={progress}
            ready={done && !error}
            waking={elapsed > 7}
            error={error}
            onRetry={() => launch(busy)}
            onBack={() => {
              setBusy(null)
              setError(null)
              setDone(false)
              window.setTimeout(() => trigger.current?.focus(), 0)
            }}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
