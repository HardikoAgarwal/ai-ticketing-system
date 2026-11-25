import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, ChevronUp, Headphones, Loader2, LogOut, RotateCcw, Sparkles, UserRound, Zap } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/api'
import { timeUntil } from '@/lib/format'
import { cn } from '@/lib/utils'

const DEMO_TTL_MS = 24 * 60 * 60 * 1000
const TEMPLATE_BY_NAME: Record<string, string> = {
  'Lumen Analytics': 'saas',
  'Northstar IT Helpdesk': 'helpdesk',
  'Tidewater Goods': 'ecommerce',
}
const OPEN_KEY = 'helpdesk.dock'
const SPRING = { type: 'spring', stiffness: 420, damping: 36, mass: 0.8 } as const

/**
 * Floating demo control, bottom-right. Open on first visit (remembers if you collapse it). Collapsed it is a small pill (countdown); on click it morphs into a panel
 * with the view switcher, expiry, live AI budget and demo actions. Only rendered inside demo workspaces.
 */
export function DemoDock() {
  const { slug, api, brief, isDemo, staff } = useWorkspace()
  const { demo, activeView, switchView, startDemo, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpenRaw] = useState(() => {
    try {
      return sessionStorage.getItem(OPEN_KEY) !== 'closed'
    } catch {
      return true
    }
  })
  const setOpen = useCallback((v: boolean) => {
    setOpenRaw(v)
    try {
      sessionStorage.setItem(OPEN_KEY, v ? 'open' : 'closed')
    } catch {
      /* ignore */
    }
  }, [])
  const [busy, setBusy] = useState<null | 'view' | 'fresh'>(null)
  const [, tick] = useState(0)
  const pillRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  const usage = useQuery({
    queryKey: ['ai-usage', slug],
    queryFn: api.tickets.aiUsage,
    enabled: isDemo && staff,
    refetchInterval: 60_000,
  })

  const close = useCallback(() => {
    setOpen(false)
    requestAnimationFrame(() => pillRef.current?.focus())
  }, [setOpen])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  if (!isDemo) return null

  const expiresAt = brief?.expires_at ?? demo?.expiresAt ?? null
  const left = timeUntil(expiresAt)
  const leftShort = left && left !== 'expired' ? left.replace(/ (\d+m)$/, '') : null
  const remainingPct = expiresAt ? Math.max(0, Math.min(100, ((new Date(expiresAt).getTime() - Date.now()) / DEMO_TTL_MS) * 100)) : 0
  const canSwitch = !!demo && demo.slug === slug
  const u = usage.data
  const usedPct = u ? Math.min(100, Math.round((u.global_used / Math.max(u.global_cap, 1)) * 100)) : 0

  const flip = async (view: 'agent' | 'customer') => {
    if (view === activeView || busy) return
    setBusy('view')
    try {
      await switchView(view)
      setOpen(false)
      navigate(`/w/${slug}/${view === 'agent' ? 'agent' : 'help'}`)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const fresh = async () => {
    setBusy('fresh')
    try {
      const template = demo?.template ?? (brief?.name && TEMPLATE_BY_NAME[brief.name]) ?? 'saas'
      const newSlug = await startDemo(template)
      setOpen(false)
      navigate(`/w/${newSlug}/agent`)
      toast.success('Fresh demo workspace ready')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const leave = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="pointer-events-none fixed right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 sm:right-5 sm:bottom-[max(1.25rem,env(safe-area-inset-bottom))]">
      <AnimatePresence initial={false} mode="popLayout">
        {open ? (
          <motion.div
            key="panel"
            layoutId="demo-dock"
            transition={SPRING}
            style={{ borderRadius: 18, transformOrigin: 'bottom right' }}
            role="dialog"
            aria-label="Demo controls"
            className="pointer-events-auto w-[calc(100vw-1.5rem)] overflow-hidden border bg-card text-card-foreground shadow-2xl ring-1 ring-black/5 sm:w-[24rem]"
          >
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06, duration: 0.2 }}>
              <header className="flex items-start gap-3 border-b bg-primary px-5 py-4 text-primary-foreground">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
                  <Sparkles className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    Live demo
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2 py-1 text-[11px] font-medium text-white">
                      <span className="size-1.5 rounded-full bg-emerald-500" /> Private sandbox
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-primary-foreground/75">{brief?.name}</p>
                </div>
                <Button ref={closeRef} variant="ghost" size="icon-sm" onClick={close} aria-label="Collapse demo controls" className="-mr-2 -mt-1 text-white hover:bg-white/15 hover:text-white">
                  <ChevronDown />
                </Button>
              </header>

              <div className="space-y-5 px-5 py-5">
                <section aria-label="Time left">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-medium text-muted-foreground">Sandbox expires in</span>
                    <span className="text-sm font-semibold tabular-nums">{left === 'expired' ? 'Expired' : (left ?? '—')}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(remainingPct)} aria-valuemin={0} aria-valuemax={100} aria-label="Time left in sandbox">
                    <motion.div className="h-full rounded-full bg-primary" initial={false} animate={{ width: `${remainingPct}%` }} transition={{ duration: 0.6 }} />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">Everything you create here is private to you and cleaned up after 24 hours.</p>
                </section>

                {canSwitch && (
                  <section aria-label="Switch view">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">You are viewing as</p>
                    <div role="radiogroup" aria-label="View" className="grid grid-cols-2 gap-1.5 rounded-xl bg-muted p-1">
                      {(
                        [
                          ['agent', 'Agent view', 'Triage and reply', Headphones],
                          ['customer', 'Customer view', 'Ask and track', UserRound],
                        ] as const
                      ).map(([view, label, hint, Icon]) => {
                        const on = activeView === view
                        return (
                          <button
                            key={view}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            disabled={busy !== null}
                            onClick={() => flip(view)}
                            className={cn(
                              'flex flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-left transition-all focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-60',
                              on ? 'bg-card shadow-sm ring-1 ring-black/5' : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
                            )}
                          >
                            <span className={cn('flex items-center gap-1.5 text-sm font-semibold', on && 'text-primary')}>
                              {busy === 'view' && !on ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />} {label}
                            </span>
                            <span className="text-[11px] font-normal text-muted-foreground">{hint}</span>
                          </button>
                        )
                      })}
                    </div>
                  </section>
                )}

                {staff ? (
                  <section aria-label="Live AI budget" className="rounded-2xl border bg-muted/20 p-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Zap className="size-3.5 text-amber-500" /> Live AI calls today
                      </span>
                      <span className="font-semibold tabular-nums">{u ? `${u.global_used} / ${u.global_cap}` : '—'}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={usedPct} aria-valuemin={0} aria-valuemax={100} aria-label="Live AI calls used today">
                      <div className={cn('h-full rounded-full transition-all', usedPct > 85 ? 'bg-amber-500' : 'bg-primary')} style={{ width: `${usedPct}%` }} />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      The free Gemini quota is shared by every visitor{u ? ` (${u.workspace_used}/${u.workspace_cap} used in this workspace)` : ''}. When it runs out, new tickets fall
                      back to keyword triage and you write replies yourself; the seeded tickets keep their AI results.
                    </p>
                  </section>
                ) : (
                  <p className="rounded-2xl border bg-muted/20 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">Tip:</span> send a message here, then switch to Agent view to see it arrive in the queue and reply with AI.
                  </p>
                )}
              </div>

              <footer className="flex items-center gap-2 border-t bg-muted/40 px-5 py-3.5">
                <Button size="sm" variant="outline" onClick={fresh} disabled={busy !== null}>
                  {busy === 'fresh' ? <Loader2 className="animate-spin" /> : <RotateCcw />} Start fresh demo
                </Button>
                <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground" onClick={leave} disabled={busy !== null}>
                  <LogOut /> Leave demo
                </Button>
              </footer>
            </motion.div>
          </motion.div>
        ) : (
          <motion.button
            key="pill"
            ref={pillRef}
            layoutId="demo-dock"
            transition={SPRING}
            style={{ borderRadius: 999, transformOrigin: 'bottom right' }}
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={false}
            aria-haspopup="dialog"
            aria-label={`Demo controls${leftShort ? `, resets in ${left}` : ''}`}
            className="pointer-events-auto flex items-center gap-2 border bg-card py-2 pr-2.5 pl-3 text-xs font-medium shadow-lg ring-1 ring-black/5 transition-shadow hover:shadow-xl focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none sm:py-2.5 sm:pr-3 sm:pl-3.5 sm:text-[13px]"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span>Demo</span>
            {leftShort && <span className="text-muted-foreground tabular-nums">· {leftShort} left</span>}
            <ChevronUp className="size-3.5 text-muted-foreground" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
