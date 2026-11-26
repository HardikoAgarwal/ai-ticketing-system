import { AlertCircle, Check, Loader2, RotateCcw, ServerCog } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'

import { AiSurface } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { BrandMark } from './BrandPanel'
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
  error?: string | null
  onRetry?: () => void
  onBack: () => void
}

/**
 * Full-screen "setting up your environment" view. Presentational: the caller owns the real request and tells it how far along it is;
 * the last step only completes when the caller says so. Announces each step to screen readers.
 */
export function SetupScreen({ name, step, progress, waking = false, error = null, onRetry, onBack }: SetupScreenProps) {
  const reduce = useReducedMotion()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const retryRef = useRef<HTMLButtonElement>(null)
  const current = SETUP_STEPS[Math.min(step, SETUP_STEPS.length - 1)]

  useEffect(() => {
    headingRef.current?.focus()
  }, [])
  useEffect(() => {
    if (error) retryRef.current?.focus()
  }, [error])

  const drift = (x: string[], y: string[], d: number) => (reduce ? undefined : { animate: { x, y }, transition: { duration: d, repeat: Infinity, ease: 'easeInOut' as const } })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-title"
      className="lp fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-(--lp-ink) p-5 text-white"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <motion.div className="absolute -top-40 left-1/4 size-[36rem] rounded-full bg-aurora-1 opacity-35 blur-[130px]" {...drift(['0%', '12%', '0%'], ['0%', '8%', '0%'], 13)} />
        <motion.div className="absolute -right-24 bottom-0 size-[30rem] rounded-full bg-aurora-2 opacity-20 blur-[120px]" {...drift(['0%', '-10%', '0%'], ['0%', '-8%', '0%'], 16)} />
        <motion.div className="absolute bottom-1/4 left-0 size-[24rem] rounded-full bg-aurora-3 opacity-20 blur-[110px]" {...drift(['0%', '8%', '0%'], ['0%', '-6%', '0%'], 11)} />
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      </div>

      {/* Announced to assistive tech: one short sentence per change, errors immediately. */}
      <p className="sr-only" role="status" aria-live="polite">
        {error ? '' : `Step ${Math.min(step, SETUP_STEPS.length - 1) + 1} of ${SETUP_STEPS.length}: ${current.title}.`}
      </p>

      <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="relative my-auto w-full max-w-lg">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            {!reduce && !error && <motion.span aria-hidden className="absolute inset-0 rounded-panel bg-aurora-1/40" animate={{ scale: [1, 1.7], opacity: [0.6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }} />}
            <BrandMark className="relative size-16 rounded-panel" />
          </div>
          <p className="mt-6 text-xs font-semibold tracking-[0.16em] text-white/65 uppercase">{error ? 'Setup stopped' : 'Setting up your environment'}</p>
          <h1 id="setup-title" ref={headingRef} tabIndex={-1} className="mt-2 text-4xl font-semibold tracking-[-0.04em] outline-none sm:text-5xl">
            {name}
          </h1>
        </div>

        <AiSurface working={!error} className="mt-9 p-2.5 text-ink">
          <ol className="space-y-1">
            {SETUP_STEPS.map((s, i) => {
              const complete = i < step || (i === step && progress >= 100)
              const active = i === step && !complete && !error
              const failed = i === step && !!error
              return (
                <li key={s.title} aria-current={active ? 'step' : undefined} className={cn('flex items-center gap-3.5 rounded-control px-3 py-3 transition-colors', active && 'bg-lav', failed && 'bg-rose',)}>
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-control text-xs font-semibold',
                      complete ? 'bg-mint-ink text-surface' : active ? 'bg-ink text-canvas' : failed ? 'bg-rose-ink text-surface' : 'bg-sunken text-ink-3',
                    )}
                  >
                    {complete ? <Check className="size-4" strokeWidth={3} aria-hidden /> : active ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : failed ? <AlertCircle className="size-4" aria-hidden /> : i + 1}
                    <span className="sr-only">{complete ? 'Done:' : active ? 'In progress:' : failed ? 'Failed:' : 'Pending:'}</span>
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className={cn('block text-[15px] font-semibold', i > step && 'text-ink-3')}>{s.title}</span>
                    {(active || failed) && <span className="mt-0.5 block text-[13px] text-ink-2">{s.hint}</span>}
                  </span>
                </li>
              )
            })}
          </ol>
        </AiSurface>

        <div className="mt-6 flex items-center gap-4" role="progressbar" aria-label="Setup progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
          <div className="relative h-2 flex-1 overflow-hidden rounded-chip bg-white/15">
            <motion.div className="h-full rounded-chip bg-linear-to-r from-aurora-1 via-aurora-2 to-aurora-3" animate={{ width: `${progress}%` }} transition={{ duration: reduce ? 0 : 0.6, ease: 'easeOut' }} />
          </div>
          <span className="w-10 text-right text-sm font-semibold tabular-nums">{Math.round(progress)}%</span>
        </div>

        {waking && !error && (
          <p className="mt-5 flex items-start justify-center gap-2 text-center text-sm text-white/75">
            <ServerCog className="mt-0.5 size-4 shrink-0" aria-hidden />
            The demo server naps when idle and is waking up. The first start can take up to a minute.
          </p>
        )}

        {error && (
          <div role="alert" className="mt-6 rounded-panel bg-rose/95 p-4 text-center text-rose-ink">
            <p className="text-sm font-semibold">{error}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {onRetry && (
                <Button ref={retryRef} size="sm" onClick={onRetry}>
                  <RotateCcw aria-hidden /> Try again
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={onBack}>
                Back
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
