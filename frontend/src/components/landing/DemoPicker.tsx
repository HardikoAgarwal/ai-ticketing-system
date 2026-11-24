import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Check, CircleDot, Headphones, Loader2, Sparkles, UserRound } from 'lucide-react'
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { ApiError, errorMessage } from '@/lib/api'
import { demoApi } from '@/lib/endpoints'
import { cn } from '@/lib/utils'

import { MOOD_STYLE, PRIORITY_STYLE, TEMPLATES, type TemplateMeta } from './constants'
import { EASE, Reveal, SectionHeading } from './motion'

type Role = 'agent' | 'customer'

const STEPS = ['Creating your private workspace', 'Seeding customers and tickets', 'Teaching the AI your knowledge base', 'Opening your workspace']

const isColdStart = (err: unknown) => err instanceof ApiError && (err.status === 0 || err.status >= 502)

function TemplateCard({ t, selected, onSelect, onHover }: { t: TemplateMeta; selected: boolean; onSelect: () => void; onHover: (on: boolean) => void }) {
  const reduce = useReducedMotion()
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [4, -4]), { stiffness: 220, damping: 20 })
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-5, 5]), { stiffness: 220, damping: 20 })
  const Icon = t.icon
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => {
        onHover(false)
        mx.set(0)
        my.set(0)
      }}
      onMouseMove={(e) => {
        if (reduce) return
        const r = e.currentTarget.getBoundingClientRect()
        mx.set((e.clientX - r.left) / r.width - 0.5)
        my.set((e.clientY - r.top) / r.height - 0.5)
      }}
      style={reduce ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      whileHover={reduce ? undefined : { y: -3, scale: 1.01 }}
      whileTap={reduce ? undefined : { scale: 0.985 }}
      className={cn(
        'relative w-full overflow-hidden rounded-2xl border bg-card p-4 text-left shadow-xs outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring',
        selected ? 'shadow-lg' : 'hover:shadow-md',
      )}
      animate={{ borderColor: selected ? t.hue : 'rgba(128,128,128,0.22)' }}
    >
      <div className="pointer-events-none absolute inset-0 transition-opacity duration-300" style={{ background: `linear-gradient(135deg, ${t.soft}, transparent 65%)`, opacity: selected ? 1 : 0 }} aria-hidden />
      <div className="relative flex items-start gap-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm" style={{ background: t.hue }}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{t.industry}</p>
          <p className="truncate text-base font-semibold tracking-tight">{t.name}</p>
          <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">{t.tagline}</p>
        </div>
        <span className={cn('mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors', selected ? 'border-transparent text-white' : 'bg-card')} style={selected ? { background: t.hue } : undefined} aria-hidden>
          {selected && <Check className="size-3" />}
        </span>
      </div>
      <AnimatePresence initial={false}>
        {selected && (
          <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="relative overflow-hidden">
            <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
              {t.highlights.map((h) => (
                <li key={h} className="list-none rounded-full bg-card/80 px-2.5 py-1 text-[11px] font-medium ring-1 ring-black/5">
                  {h}
                </li>
              ))}
            </div>
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

function Preview({ t, role }: { t: TemplateMeta; role: Role }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: EASE }} className="h-full">
      {role === 'agent' ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1">
            <p className="text-sm font-semibold">Queue</p>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">12 open</span>
          </div>
          {t.tickets.map((k, i) => (
            <motion.div key={k.ref} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i, duration: 0.35, ease: EASE }} className={cn('flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2', k.late && 'border-l-4 border-l-red-400')}>
              <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset', PRIORITY_STYLE[k.priority])}>{k.priority}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium">{k.subject}</p>
                <p className="truncate text-[10.5px] text-muted-foreground">
                  {k.who} · {k.category}
                </p>
              </div>
              {k.mood && <span className={cn('hidden shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset sm:inline', MOOD_STYLE[k.mood])}>{k.mood}</span>}
              <span className={cn('hidden shrink-0 text-[10.5px] font-medium md:inline', k.late ? 'text-red-600' : 'text-muted-foreground')}>{k.sla}</span>
            </motion.div>
          ))}
          <div className="flex items-center gap-2 rounded-xl border bg-violet-50/60 px-3 py-2 text-[11.5px] text-foreground/80">
            <Sparkles className="size-3.5 shrink-0 text-violet-600" /> Each ticket opens with an AI summary, triage and a cited draft reply.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1">
            <p className="text-sm font-semibold">My requests</p>
            <span className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">New request</span>
          </div>
          {t.tickets.map((k, i) => (
            <motion.div key={k.ref} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i, duration: 0.35, ease: EASE }} className="flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <UserRound className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium">{k.subject}</p>
                <p className="text-[10.5px] text-muted-foreground">{k.ref}</p>
              </div>
              <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset', i % 3 === 2 ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-sky-50 text-sky-700 ring-sky-600/20')}>{i % 3 === 2 ? 'Resolved' : 'In progress'}</span>
            </motion.div>
          ))}
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-[11.5px] text-emerald-900">
            <Check className="size-3.5 shrink-0" /> See replies live, confirm a fix, or rate the support you got.
          </div>
        </div>
      )}
    </motion.div>
  )
}

export function DemoPicker({ notice }: { notice?: string | null }) {
  const { startDemo, switchView } = useAuth()
  const navigate = useNavigate()
  const [selected, setSelected] = useState('saas')
  const [hovered, setHovered] = useState<string | null>(null)
  const [role, setRole] = useState<Role>('agent')
  const [busy, setBusy] = useState(false)
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

  // Static fallback keeps the picker instant while a sleeping free-tier API wakes up; live data wins when present.
  const templates = useMemo(
    () =>
      TEMPLATES.map((m) => {
        const api = live.data?.find((x) => x.key === m.key)
        return api ? { ...m, name: api.name, tagline: api.tagline, industry: api.industry } : m
      }),
    [live.data],
  )

  useEffect(() => {
    if (!busy) return
    const t = window.setInterval(() => setElapsed((s) => s + 0.5), 500)
    return () => {
      window.clearInterval(t)
      setElapsed(0)
    }
  }, [busy])

  const current = templates.find((t) => t.key === selected) ?? templates[0]
  const shown = templates.find((t) => t.key === (hovered ?? selected)) ?? current
  const step = done ? STEPS.length - 1 : Math.min(Math.floor(elapsed / 1.1), STEPS.length - 1)
  const progress = done ? 100 : Math.min(92, 8 + elapsed * 14)
  const waking = busy && elapsed > 7

  const launch = async () => {
    if (busy) return
    setError(null)
    setDone(false)
    setBusy(true)
    try {
      let slug: string | null = null
      for (let attempt = 0; attempt < 4 && !slug; attempt++) {
        try {
          slug = await startDemo(current.key)
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
      setBusy(false)
    }
  }

  return (
    <section id="demo" className="relative scroll-mt-16 overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/30 to-transparent" />
        <div className="lp-drift absolute top-1/4 -left-32 size-[28rem] rounded-full bg-violet-300/25 blur-[100px]" />
        <div className="lp-drift absolute -right-32 bottom-0 size-[28rem] rounded-full bg-emerald-300/30 blur-[100px] [animation-delay:-8s]" />
      </div>

      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Live demo"
          title={
            <>
              Don’t take our word for it. <span className="lp-gradient-text">Run the desk.</span>
            </>
          }
          intro="Pick a company, choose your seat, and land in a private workspace full of real-looking tickets. Reply with an AI draft, then flip to the customer’s side."
        />

        {notice && (
          <p role="status" className="mx-auto mt-8 max-w-xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
            {notice}
          </p>
        )}

        <Reveal delay={0.05} className="mt-12">
          <div className="grid gap-4 rounded-[1.75rem] border bg-card/70 p-3 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.35)] backdrop-blur sm:p-4 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
            {/* left: choose */}
            <div className="flex flex-col gap-4 p-1 sm:p-2">
              <div>
                <p className="px-1 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">1 · Choose a company</p>
                <div role="radiogroup" aria-label="Demo company" className="space-y-2.5">
                  {templates.map((t) => (
                    <TemplateCard key={t.key} t={t} selected={t.key === selected} onSelect={() => setSelected(t.key)} onHover={(on) => setHovered(on ? t.key : null)} />
                  ))}
                </div>
              </div>

              <div>
                <p className="px-1 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">2 · Enter as</p>
                <div role="radiogroup" aria-label="Enter as" className="relative grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                  {(
                    [
                      ['agent', 'Support agent', Headphones],
                      ['customer', 'Customer', UserRound],
                    ] as const
                  ).map(([r, label, Icon]) => (
                    <button
                      key={r}
                      type="button"
                      role="radio"
                      aria-checked={role === r}
                      onClick={() => setRole(r)}
                      className={cn('relative z-10 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', role === r ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
                    >
                      {role === r && <motion.span layoutId="role-pill" className="absolute inset-0 -z-10 rounded-lg bg-card shadow-sm" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                      <Icon className="size-4" /> {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-auto">
                {error && (
                  <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  onClick={launch}
                  disabled={busy}
                  className="lp-gradient-btn group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl text-base font-semibold text-white shadow-lg shadow-emerald-700/30 outline-none transition-[filter,transform] hover:brightness-110 focus-visible:ring-3 focus-visible:ring-ring/60 active:translate-y-px disabled:opacity-80"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {busy ? 'Building your sandbox…' : `Start the ${current.name} demo`}
                  {!busy && <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />}
                </button>
                <p className="mt-2.5 text-center text-xs text-muted-foreground">No signup · private to you · resets after 24 hours</p>
              </div>
            </div>

            {/* right: live preview */}
            <div className="relative min-w-0 overflow-hidden rounded-2xl border bg-background shadow-inner">
              <div className="flex items-center gap-2 border-b px-4 py-2.5" style={{ background: shown.soft }}>
                <span className="size-2.5 rounded-full bg-red-300" />
                <span className="size-2.5 rounded-full bg-amber-300" />
                <span className="size-2.5 rounded-full bg-emerald-300" />
                <span className="ml-3 flex min-w-0 items-center gap-2 truncate text-[11px] text-muted-foreground">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: shown.hue }} />
                  {shown.name} · {role === 'agent' ? 'Agent workspace' : 'Help centre'}
                </span>
                <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[10.5px] font-medium text-muted-foreground">
                  <span className="relative flex size-1.5">
                    <span className="lp-pulse-ring absolute inline-flex size-1.5 rounded-full bg-emerald-400" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                  </span>
                  Live preview
                </span>
              </div>
              <div className="min-h-[26rem] p-3.5 sm:p-4">
                <AnimatePresence mode="wait">
                  <Preview key={`${shown.key}-${role}`} t={shown} role={role} />
                </AnimatePresence>
              </div>

              <AnimatePresence>
                {busy && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 flex items-center justify-center bg-background/85 p-6 backdrop-blur-sm" role="status" aria-live="polite">
                    <div className="w-full max-w-xs">
                      <p className="text-center text-sm font-semibold">Setting up {current.name}</p>
                      <ol className="mt-4 space-y-2.5">
                        {STEPS.map((s, i) => (
                          <li key={s} className={cn('flex items-center gap-2.5 text-sm transition-colors', i <= step ? 'text-foreground' : 'text-muted-foreground/60')}>
                            <span className="flex size-5 shrink-0 items-center justify-center">
                              {i < step || done ? <Check className="size-4 text-emerald-600" /> : i === step ? <Loader2 className="size-4 animate-spin text-primary" /> : <CircleDot className="size-3.5" />}
                            </span>
                            {s}
                          </li>
                        ))}
                      </ol>
                      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <motion.div className="lp-gradient-btn h-full rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
                      </div>
                      {waking && <p className="mt-4 text-center text-xs text-muted-foreground">The demo runs on a free server that naps when idle. Waking it up, this can take up to a minute the first time.</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
