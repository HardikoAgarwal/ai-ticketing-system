import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, ChevronUp, Headphones, Loader2, LogOut, Sparkles, UserRound } from 'lucide-react'
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
const OPEN_KEY = 'helpdesk.dock'
const SPRING = { type: 'spring', stiffness: 420, damping: 36, mass: 0.8 } as const

/**
 * Floating demo control, bottom-right. Open on first visit (remembers if you collapse it). Collapsed it is a small pill (countdown); on click it morphs into a panel
 * with the expiry, the view switcher and a way out. Only rendered inside demo workspaces.
 */
export function DemoDock() {
  const { slug, brief, isDemo, staff } = useWorkspace()
  const { demo, activeView, switchView, logout } = useAuth()
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
  const [busy, setBusy] = useState(false)
  const [, tick] = useState(0)
  const pillRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    requestAnimationFrame(() => pillRef.current?.focus())
  }, [setOpen])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    // Clicking anywhere else collapses it, without moving focus back to the pill (the click already put focus where the user wanted it).
    const onDown = (e: PointerEvent) => {
      if (busy || panelRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open, close, setOpen, busy])

  if (!isDemo) return null

  const expiresAt = brief?.expires_at ?? demo?.expiresAt ?? null
  const left = timeUntil(expiresAt)
  const leftShort = left && left !== 'expired' ? left.replace(/ (\d+m)$/, '') : null
  const remainingPct = expiresAt ? Math.max(0, Math.min(100, ((new Date(expiresAt).getTime() - Date.now()) / DEMO_TTL_MS) * 100)) : 0
  const canSwitch = !!demo && demo.slug === slug

  const flip = async (view: 'agent' | 'customer') => {
    if (view === activeView || busy) return
    setBusy(true)
    try {
      await switchView(view)
      setOpen(false)
      navigate(`/w/${slug}/${view === 'agent' ? 'agent' : 'help'}`)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const leave = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="pointer-events-none fixed right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] max-md:bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 sm:right-5 sm:bottom-[max(1.25rem,env(safe-area-inset-bottom))]">
      <AnimatePresence initial={false} mode="popLayout">
        {open ? (
          <motion.div
            key="panel"
            ref={panelRef}
            layoutId="demo-dock"
            transition={SPRING}
            style={{ borderRadius: 18, transformOrigin: 'bottom right' }}
            role="dialog"
            aria-label="Demo controls"
            className="pointer-events-auto w-[calc(100vw-1.5rem)] overflow-hidden border border-line bg-surface text-ink shadow-pop sm:w-[24rem]"
          >
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06, duration: 0.2 }}>
              <header className="flex items-start gap-3 bg-brand px-5 py-4 text-on-brand">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-control bg-on-brand/15">
                  <Sparkles className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    Live demo
                    <span className="inline-flex items-center gap-1.5 rounded-chip bg-on-brand/15 px-2 py-0.5 text-[11px] font-medium">
                      <span className="size-1.5 rounded-full bg-on-brand" /> Private sandbox
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-on-brand/75">{brief?.name}</p>
                </div>
                <Button ref={closeRef} variant="ghost" size="icon-sm" onClick={close} aria-label="Collapse demo controls" className="-mr-2 -mt-1 text-on-brand hover:bg-on-brand/15 hover:text-on-brand">
                  <ChevronDown />
                </Button>
              </header>

              <div className="space-y-5 px-5 py-5">
                <section aria-label="Time left">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-ink-3">Sandbox resets in</p>
                      <p className="mt-1 text-2xl leading-7 font-semibold tracking-tight tabular-nums">{left === 'expired' ? 'Expired' : (left ?? '—')}</p>
                    </div>
                    <span className="mb-0.5 text-xs font-medium text-ink-3 tabular-nums">{Math.round(remainingPct)}% left</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={Math.round(remainingPct)} aria-valuemin={0} aria-valuemax={100} aria-label="Time left in sandbox">
                    <motion.div className="h-full rounded-full bg-brand" initial={false} animate={{ width: `${remainingPct}%` }} transition={{ duration: 0.6 }} />
                  </div>
                  <p className="mt-1.5 text-xs text-ink-3">Everything you create here is private to you and cleaned up after 24 hours.</p>
                </section>

                {canSwitch && (
                  <section aria-label="Switch view">
                    <p className="mb-2 text-xs font-medium text-ink-3">You are viewing as</p>
                    <div role="radiogroup" aria-label="View" className="grid grid-cols-2 gap-1 rounded-[12px] border border-line bg-sunken p-1">
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
                            disabled={busy}
                            onClick={() => flip(view)}
                            className={cn(
                              'flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand disabled:opacity-60',
                              on ? 'bg-brand text-on-brand shadow-sm' : 'text-ink-2 hover:bg-surface hover:text-ink',
                            )}
                          >
                            <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', on ? 'bg-on-brand/15' : 'bg-surface ring-1 ring-line')}>
                              {busy && !on ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] leading-4 font-semibold">{label}</span>
                              <span className={cn('mt-0.5 block truncate text-[11px] leading-4', on ? 'text-on-brand/75' : 'text-ink-3')}>{hint}</span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </section>
                )}

                {!staff && (
                  <p className="rounded-control border border-line bg-surface-2 px-3.5 py-3 text-xs leading-relaxed text-ink-3">
                    <span className="font-medium text-foreground">Tip:</span> send a message here, then switch to Agent view to see it arrive in the queue and reply with AI.
                  </p>
                )}
              </div>

              <footer className="flex items-center justify-between gap-2 border-t border-line bg-surface-2 px-5 py-3">
                <span className="text-xs text-ink-3">Done exploring?</span>
                <Button size="sm" variant="outline" className="border-rose-line bg-rose text-rose-ink hover:bg-rose-ink hover:text-white dark:hover:text-canvas" onClick={leave} disabled={busy}>
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
            style={{ borderRadius: 20, transformOrigin: 'bottom right' }}
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={false}
            aria-haspopup="dialog"
            aria-label={`Demo controls${leftShort ? `, resets in ${left}` : ''}`}
            className="group pointer-events-auto flex h-10 items-center gap-2 bg-brand pr-3 pl-3.5 text-[13px] font-semibold text-on-brand shadow-[0_10px_28px_-10px_color-mix(in_srgb,var(--brand)_70%,transparent)] transition-[background-color,box-shadow] hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <span aria-hidden className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-on-brand/70 motion-reduce:hidden" />
              <span className="relative size-2 rounded-full bg-on-brand" />
            </span>
            <span>Live demo</span>
            {leftShort && <span className="font-medium text-on-brand/75 tabular-nums">· {leftShort} left</span>}
            <ChevronUp className="size-4 text-on-brand/70 transition-transform group-hover:-translate-y-0.5" aria-hidden />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
