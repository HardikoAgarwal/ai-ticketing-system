import { AlertCircle, Check, Loader2, RotateCcw, ServerCog, Zap } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

import { SETUP_STEPS } from './setup-steps'

export interface SetupScreenProps {
  /** Company / template name shown as the title. */
  name: string
  /** Index of the active step (0-based). Completed steps are those before it. */
  step: number
  /** 0-100. */
  progress: number
  /** True when the API is slow to answer (free-tier server waking up). */
  waking?: boolean
  /** Sandbox is ready — show the handoff cue before navigating into the dashboard. */
  ready?: boolean
  error?: string | null
  onRetry?: () => void
  onBack: () => void
  /** `reveal` slides setup up to uncover the dashboard; default is a soft fade. */
  exitMode?: 'fade' | 'reveal'
}

/** Strong landing colours, just a touch lighter. */
const STEP_COLORS = ['#7c5cff', '#d4f07a', '#ff9eb8', '#ffc14d', '#2dd4bf'] as const
const PROGRESS_COLOR = '#6a4df4'
const HARD = 'border-2 border-(--lp-ink) shadow-[4px_4px_0_0_var(--lp-ink)]'

const TICKETS = [
  { id: 'a', label: 'Billing', color: '#7c5cff' },
  { id: 'b', label: 'SSO', color: '#ff6a4d' },
  { id: 'c', label: 'Ship', color: '#2dd4bf' },
  { id: 'd', label: 'Bug', color: '#ffc14d' },
  { id: 'e', label: 'Access', color: '#d4f07a' },
  { id: 'f', label: 'Refund', color: '#ff9eb8' },
] as const

type Floater = { key: number; ticket: (typeof TICKETS)[number]; x: number; y: number; delay: number }

/**
 * The landing page's setup screen hands over to a second copy at the app root (it covers the route change into the
 * dashboard). The game state lives here so that copy picks up the same score and tickets instead of starting over.
 */
const carried = { score: 0, combo: 0, floaters: [] as Floater[], nextKey: 0 }

/** Tap game: stamp floating tickets while the workspace boots. */
function TicketStampGame({ paused, carry = false }: { paused?: boolean; /** Continue the game the previous setup screen was showing. */ carry?: boolean }) {
  const reduce = useReducedMotion()
  const [initial] = useState(() => (carry ? carried : { score: 0, combo: 0, floaters: [], nextKey: carried.nextKey }))
  const [score, setScore] = useState(initial.score)
  const [combo, setCombo] = useState(initial.combo)
  const [floaters, setFloaters] = useState<Floater[]>(initial.floaters)
  const [burst, setBurst] = useState<{ id: number; x: number; y: number } | null>(null)
  const nextKey = useRef(initial.nextKey)
  useEffect(() => {
    Object.assign(carried, { score, combo, floaters, nextKey: nextKey.current })
  }, [score, combo, floaters])

  const spawn = useCallback(() => {
    if (paused || reduce) return
    const ticket = TICKETS[Math.floor(Math.random() * TICKETS.length)]
    const key = ++nextKey.current
    setFloaters((prev) => [
      ...prev.slice(-6),
      {
        key,
        ticket,
        x: 6 + Math.random() * 78,
        y: 14 + Math.random() * 58,
        delay: Math.random() * 0.2,
      },
    ])
  }, [paused, reduce])

  useEffect(() => {
    if (paused || reduce) return
    if (!carry) spawn()
    const id = window.setInterval(spawn, 1000)
    return () => window.clearInterval(id)
  }, [paused, reduce, spawn, carry])

  useEffect(() => {
    if (paused || reduce) return
    const id = window.setInterval(() => {
      setFloaters((prev) => prev.slice(1))
      setCombo(0)
    }, 3400)
    return () => window.clearInterval(id)
  }, [paused, reduce])

  const stamp = (f: Floater) => {
    setFloaters((prev) => prev.filter((x) => x.key !== f.key))
    setScore((s) => s + 1 + Math.min(combo, 4))
    setCombo((c) => c + 1)
    setBurst({ id: f.key, x: f.x, y: f.y })
    window.setTimeout(() => setBurst((b) => (b?.id === f.key ? null : b)), 450)
  }

  if (reduce) {
    return (
      <div className={cn('flex h-full min-h-0 flex-col justify-center rounded-[1.5rem] bg-white p-5 text-(--lp-ink)', HARD)}>
        <p className="text-base font-bold tracking-tight">Kill time while we finish cooking your desk.</p>
      </div>
    )
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col overflow-hidden rounded-[1.5rem] bg-white text-(--lp-ink)', HARD)}>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-(--lp-ink) bg-(--lp-lime) px-4 py-3 sm:px-5">
        <p className="min-w-0 truncate text-sm font-bold sm:text-[15px]">Kill time while we finish cooking your desk.</p>
        <div className={cn('flex h-9 shrink-0 items-center gap-2 rounded-full bg-white px-3', HARD.replace('shadow-[4px_4px_0_0_var(--lp-ink)]', 'shadow-[2px_2px_0_0_var(--lp-ink)]'))}>
          <Zap className="size-3.5 shrink-0" aria-hidden />
          <span className="min-w-[1.5ch] text-base font-bold tabular-nums leading-none">{score}</span>
          <span className="text-[11px] font-bold tracking-wide uppercase opacity-60">stamped</span>
          <span
            className={cn(
              'inline-flex h-5 min-w-7 items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none',
              combo > 1 ? 'bg-(--lp-violet) text-white' : 'invisible',
            )}
            aria-hidden={combo <= 1}
          >
            ×{Math.max(combo, 2)}
          </span>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 touch-manipulation select-none bg-[#fff8ef]">
        <AnimatePresence initial={!carry}>
          {floaters.map((f) => (
            <motion.button
              key={f.key}
              type="button"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, y: [0, -5, 0] }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ delay: f.delay, duration: 0.3, y: { repeat: Infinity, duration: 1.7 + f.delay, ease: 'easeInOut' } }}
              onClick={() => stamp(f)}
              className="absolute flex h-11 items-center gap-1.5 rounded-full border-2 border-(--lp-ink) px-3.5 text-sm font-bold text-(--lp-ink) shadow-[2px_2px_0_0_var(--lp-ink)] active:translate-x-px active:translate-y-px active:shadow-none"
              style={{ left: `${f.x}%`, top: `${f.y}%`, backgroundColor: f.ticket.color }}
            >
              <span className="size-1.5 rounded-full bg-(--lp-ink)/30" />
              {f.ticket.label}
            </motion.button>
          ))}
        </AnimatePresence>
        <AnimatePresence>
          {burst && (
            <motion.span
              key={burst.id}
              initial={{ scale: 0.6, opacity: 1 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute text-base font-black text-(--lp-violet)"
              style={{ left: `${burst.x}%`, top: `${burst.y}%` }}
            >
              +{1 + Math.min(combo, 4)}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/**
 * Full-screen "setting up your environment" view. Presentational: the caller owns the real request and tells it how far along it is;
 * the last one only completes when the caller says so. Announces each step to screen readers.
 */
export function SetupScreen({ name, step, progress, waking = false, ready = false, error = null, onRetry, onBack, exitMode = 'fade' }: SetupScreenProps) {
  const reduce = useReducedMotion()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const retryRef = useRef<HTMLButtonElement>(null)
  const current = SETUP_STEPS[Math.min(step, SETUP_STEPS.length - 1)]
  const reveal = exitMode === 'reveal'

  useEffect(() => {
    headingRef.current?.focus()
  }, [])
  useEffect(() => {
    if (error) retryRef.current?.focus()
  }, [error])

  return (
    <motion.div
      initial={reveal ? false : { opacity: 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={
        reduce
          ? { opacity: 0 }
          : reveal
            ? { y: '-108%', transition: { duration: 1.15, ease: [0.22, 1, 0.36, 1] } }
            : { opacity: 0, y: -16, scale: 0.985, filter: 'blur(6px)' }
      }
      transition={{ duration: reduce ? 0.2 : 0.55, ease: [0.22, 1, 0.36, 1] }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-title"
      className={cn('lp fixed inset-0 overflow-hidden bg-[#ffc9a8] text-(--lp-ink)', reveal ? 'z-[81]' : 'z-[80]')}
    >
      {/* Landing shapes, faded so content stays readable */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-16 -left-10 size-56 rotate-12 rounded-[2rem] border-2 border-(--lp-ink)/40 bg-(--lp-violet) opacity-35 shadow-[4px_4px_0_0_rgba(11,10,29,0.25)] sm:size-72" />
        <div className="absolute top-20 -right-8 size-44 -rotate-6 rounded-full border-2 border-(--lp-ink)/40 bg-(--lp-lime) opacity-40 shadow-[3px_3px_0_0_rgba(11,10,29,0.2)] sm:size-56" />
        <div className="absolute bottom-10 left-[12%] size-32 rotate-3 rounded-[1.5rem] border-2 border-(--lp-ink)/35 bg-(--lp-butter) opacity-45 shadow-[3px_3px_0_0_rgba(11,10,29,0.18)]" />
        <div className="absolute right-[14%] bottom-24 size-24 -rotate-12 rounded-full border-2 border-(--lp-ink)/35 bg-(--lp-rose-2) opacity-40 shadow-[2px_2px_0_0_rgba(11,10,29,0.15)]" />
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {error ? '' : `Step ${Math.min(step, SETUP_STEPS.length - 1) + 1} of ${SETUP_STEPS.length}: ${current.title}.`}
      </p>

      <div className="relative mx-auto grid h-dvh w-full max-w-6xl grid-rows-[auto_1fr] gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-6 lg:grid-cols-2 lg:grid-rows-1 lg:items-stretch lg:gap-6 lg:py-8">
        {/* Left: progress + steps */}
        <motion.div
          initial={reduce || reveal ? false : { opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className={cn('flex min-h-0 flex-col overflow-hidden rounded-[1.5rem] bg-white p-5 sm:p-6', HARD)}
        >
          <p className="text-[11px] font-bold tracking-[0.1em] uppercase opacity-55">
            {error ? 'Setup stopped' : ready ? 'Ready' : 'Booting sandbox'} · {Math.min(step, SETUP_STEPS.length - 1) + 1}/{SETUP_STEPS.length}
          </p>
          <h1 id="setup-title" ref={headingRef} tabIndex={-1} className="mt-2 truncate text-[clamp(1.7rem,3.5vw,2.4rem)] leading-[1.05] font-semibold tracking-[-0.04em] outline-none">
            {name}
          </h1>
          <p className="mt-1.5 line-clamp-2 text-sm font-medium opacity-70">
            {error ? 'Something went sideways.' : ready ? 'Opening your workspace…' : current.hint}
          </p>

          <div className="mt-5" role="progressbar" aria-label="Setup progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
            <div className="mb-2 flex items-end justify-between gap-3">
              <p className="text-sm font-bold">{error ? 'Paused' : ready ? 'Opening your workspace' : current.title}</p>
              <p className="text-3xl leading-none font-bold tabular-nums tracking-[-0.04em]">{Math.round(progress)}%</p>
            </div>
            <div className="h-3.5 overflow-hidden rounded-full border-2 border-(--lp-ink) bg-(--lp-paper)">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: error ? '#ff6a4d' : PROGRESS_COLOR }}
                initial={false}
                animate={{ width: `${Math.max(4, progress)}%` }}
                transition={{ duration: reduce ? 0 : 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          <ol className="mt-5 flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
            {SETUP_STEPS.map((s, i) => {
              const complete = i < step || (i === step && progress >= 100)
              const active = i === step && !complete && !error
              const failed = i === step && !!error
              const color = STEP_COLORS[i % STEP_COLORS.length]
              return (
                <li
                  key={s.title}
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'flex min-h-0 flex-1 items-center gap-3 rounded-2xl border-2 border-(--lp-ink) px-3 py-2.5',
                    complete && 'bg-(--lp-mint)',
                    active && 'bg-white shadow-[3px_3px_0_0_var(--lp-ink)]',
                    failed && 'bg-(--lp-rose)',
                    !complete && !active && !failed && 'bg-(--lp-paper)/80 opacity-70',
                  )}
                >
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-(--lp-ink) text-sm font-bold"
                    style={{ backgroundColor: complete || active || failed ? color : '#fff' }}
                  >
                    {complete ? <Check className="size-4" strokeWidth={3} aria-hidden /> : active ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : failed ? <AlertCircle className="size-4" aria-hidden /> : i + 1}
                    <span className="sr-only">{complete ? 'Done:' : active ? 'In progress:' : failed ? 'Failed:' : 'Pending:'}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{s.title}</span>
                    {(active || failed) && <span className="mt-0.5 block truncate text-[12px] font-medium opacity-65">{s.hint}</span>}
                  </span>
                </li>
              )
            })}
          </ol>

          {waking && !error && (
            <p className="mt-3 flex items-start gap-2 text-xs font-semibold opacity-75">
              <ServerCog className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Demo server is waking up — first start can take up to a minute.
            </p>
          )}

          {error && (
            <div role="alert" className={cn('mt-3 rounded-2xl bg-(--lp-rose) p-3', HARD.replace('shadow-[4px_4px_0_0_var(--lp-ink)]', 'shadow-[2px_2px_0_0_var(--lp-ink)]'))}>
              <p className="text-sm font-bold">{error}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {onRetry && (
                  <button
                    ref={retryRef}
                    type="button"
                    onClick={onRetry}
                    className={cn('lp-focus inline-flex h-9 items-center gap-1.5 rounded-full bg-(--lp-violet) px-3.5 text-sm font-bold text-white', HARD.replace('shadow-[4px_4px_0_0_var(--lp-ink)]', 'shadow-[2px_2px_0_0_var(--lp-ink)]'))}
                  >
                    <RotateCcw className="size-3.5" aria-hidden /> Try again
                  </button>
                )}
                <button type="button" onClick={onBack} className={cn('lp-focus inline-flex h-9 items-center rounded-full bg-white px-3.5 text-sm font-bold', HARD.replace('shadow-[4px_4px_0_0_var(--lp-ink)]', 'shadow-[2px_2px_0_0_var(--lp-ink)]'))}>
                  Back
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Right: game */}
        <motion.div initial={reduce || reveal ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="min-h-[14rem] lg:min-h-0">
          <TicketStampGame paused={Boolean(error)} carry={reveal} />
        </motion.div>
      </div>
    </motion.div>
  )
}
