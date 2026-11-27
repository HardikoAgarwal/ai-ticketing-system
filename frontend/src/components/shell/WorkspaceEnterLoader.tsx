import { LayoutDashboard, Loader2 } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { cn } from '@/lib/utils'

export type EnterWorkspaceState = {
  enteringWorkspace?: boolean
  workspaceName?: string
}

/**
 * Reads navigation state set by the demo setup screen, shows a dashboard-themed
 * enter overlay once, then clears history state so a refresh won't replay it.
 */
export function useWorkspaceEnter(durationMs = 1400) {
  const location = useLocation()
  const navigate = useNavigate()
  const incoming = (location.state as EnterWorkspaceState | null)?.enteringWorkspace
  const incomingName = (location.state as EnterWorkspaceState | null)?.workspaceName
  const [show, setShow] = useState(Boolean(incoming))
  const [name] = useState(incomingName)

  useEffect(() => {
    if (!incoming) return
    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: {} })
    const id = window.setTimeout(() => setShow(false), durationMs)
    return () => window.clearTimeout(id)
    // Only run for the arrival that carried enteringWorkspace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { show, name }
}

/** Soft dashboard-themed overlay while the agent/customer shell settles after demo setup. */
export function WorkspaceEnterLoader({ show, name, className }: { show: boolean; name?: string; className?: string }) {
  const reduce = useReducedMotion()

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.15 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          role="status"
          aria-live="polite"
          aria-label="Opening workspace"
          className={cn('fixed inset-0 z-[70] flex items-center justify-center bg-canvas', className)}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div className="absolute -top-24 left-1/4 size-[22rem] rounded-full bg-lav/80 blur-3xl" />
            <div className="absolute top-1/3 -right-16 size-[18rem] rounded-full bg-mint/70 blur-3xl" />
            <div className="absolute bottom-10 left-1/3 size-[14rem] rounded-full bg-rose/50 blur-3xl" />
          </div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-sm px-5"
          >
            <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
              {/* Mini shell chrome */}
              <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-3">
                <span className="flex size-8 items-center justify-center rounded-lg bg-lav text-lav-ink">
                  <LayoutDashboard className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{name || 'Your workspace'}</p>
                  <p className="text-[11px] font-medium text-ink-3">Opening desk…</p>
                </div>
                <Loader2 className="size-4 animate-spin text-aurora-1 motion-reduce:animate-none" aria-hidden />
              </div>

              <div className="space-y-3 p-4">
                <div className="grid grid-cols-3 gap-2">
                  {['bg-lav', 'bg-mint', 'bg-peach'].map((tone) => (
                    <div key={tone} className={cn('h-14 rounded-xl', tone)}>
                      <div className="m-2.5 h-2 w-1/2 rounded-full bg-ink/10" />
                      <div className="mx-2.5 h-2 w-3/4 rounded-full bg-ink/8" />
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {[0.95, 0.8, 0.88].map((w, i) => (
                    <motion.div
                      key={i}
                      className="h-9 rounded-xl bg-sunken"
                      initial={reduce ? false : { opacity: 0.45 }}
                      animate={reduce ? undefined : { opacity: [0.45, 0.85, 0.45] }}
                      transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                      style={{ width: `${w * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <p className="mt-4 text-center text-sm font-medium text-ink-2">
              Settling into your inbox
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
