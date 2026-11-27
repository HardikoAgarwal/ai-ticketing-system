import { AnimatePresence } from 'motion/react'
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'

import { SETUP_STEPS } from '@/features/auth/setup-steps'
import { SetupScreen } from '@/features/auth/SetupScreen'

const HANDOFF_KEY = 'helpdesk:setup-handoff'
const EXIT_MS = 720

type Handoff = {
  name: string
  /** covering = setup stays while dashboard loads; revealing = sliding away */
  phase: 'covering' | 'revealing'
  ts: number
}

type Listener = () => void

let handoff: Handoff | null = null
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((l) => l())
}

function persist(next: Handoff | null) {
  try {
    if (!next || next.phase === 'revealing') sessionStorage.removeItem(HANDOFF_KEY)
    else sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ name: next.name, ts: next.ts }))
  } catch {
    /* ignore */
  }
}

function readStored(): Handoff | null {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as { name?: string; ts?: number }
    if (!data?.ts || Date.now() - data.ts > 30_000) {
      sessionStorage.removeItem(HANDOFF_KEY)
      return null
    }
    return { name: data.name || 'Your workspace', phase: 'covering', ts: data.ts }
  } catch {
    return null
  }
}

function getSnapshot() {
  return handoff
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Start (or restore) the full-screen setup cover that bridges into the dashboard. */
export function beginSetupHandoff(name: string) {
  handoff = { name, phase: 'covering', ts: Date.now() }
  persist(handoff)
  emit()
}

export function peekSetupHandoff() {
  return handoff ?? readStored()
}

/** Dashboard shell is painted — slide setup away to reveal it. */
export function releaseSetupHandoff() {
  if (!handoff || handoff.phase === 'revealing') return
  handoff = { ...handoff, phase: 'revealing' }
  persist(handoff)
  emit()
  window.setTimeout(() => {
    handoff = null
    persist(null)
    emit()
  }, EXIT_MS)
}

export function clearSetupHandoff() {
  handoff = null
  persist(null)
  emit()
}

export function useSetupHandoff() {
  const live = useSyncExternalStore(subscribe, getSnapshot, () => null)
  // Restore after a hard remount / Suspense boundary so a refresh mid-handoff still covers.
  useEffect(() => {
    if (!live) {
      const stored = readStored()
      if (stored) {
        handoff = stored
        emit()
      }
    }
  }, [live])
  return live ?? (typeof window !== 'undefined' ? readStored() : null)
}

/**
 * Call once the destination page has mounted (put this inside the route Suspense so lazy
 * chunks finish before the setup screen slides away).
 */
export function useReleaseSetupWhenReady(enabled = true) {
  const active = useSetupHandoff()
  useEffect(() => {
    if (!enabled || !active || active.phase !== 'covering') return
    let cancelled = false
    const run = async () => {
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
      // Brief ready beat so setup never pops off the instant the chunk resolves.
      const elapsed = Date.now() - active.ts
      const wait = Math.max(180, 640 - elapsed)
      await new Promise((r) => setTimeout(r, wait))
      if (!cancelled) releaseSetupHandoff()
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [enabled, active?.phase, active?.ts])
}

/** Mount inside `<Suspense>` around the page outlet so release waits for the lazy route. */
export function ReleaseSetupWhenReady({ children }: { children: ReactNode }) {
  useReleaseSetupWhenReady()
  return children
}

/** App-root overlay: setup stays on top until the workspace shell releases it, then slides up. */
export function SetupHandoffOverlay() {
  const active = useSetupHandoff()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Safety: never leave the cover stuck if the shell never reports ready.
  useEffect(() => {
    if (!active || active.phase !== 'covering') return
    const id = window.setTimeout(() => releaseSetupHandoff(), 10_000)
    return () => window.clearTimeout(id)
  }, [active?.phase, active?.ts])

  if (!mounted) return null

  const show = Boolean(active && active.phase === 'covering')

  return (
    <AnimatePresence
      onExitComplete={() => {
        if (handoff?.phase === 'revealing') {
          handoff = null
          persist(null)
          emit()
        }
      }}
    >
      {show && (
        <SetupScreen
          key="setup-handoff"
          name={active!.name}
          step={SETUP_STEPS.length - 1}
          progress={100}
          ready
          exitMode="reveal"
          onBack={() => clearSetupHandoff()}
        />
      )}
    </AnimatePresence>
  )
}
