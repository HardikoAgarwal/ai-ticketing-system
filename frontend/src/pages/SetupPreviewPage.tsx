import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { SetupScreen } from '@/features/auth/SetupScreen'
import { SETUP_STEPS } from '@/features/auth/setup-steps'

const TEMPLATES = ['Lumen Analytics', 'Northstar IT Helpdesk', 'Tidewater Goods'] as const

/**
 * Hidden preview for the demo bootup screen.
 * Open `/_setup-preview` to scrub steps, progress, waking and error states.
 */
export function SetupPreviewPage() {
  const [name, setName] = useState<(typeof TEMPLATES)[number]>('Lumen Analytics')
  const [step, setStep] = useState(1)
  const [progress, setProgress] = useState(42)
  const [waking, setWaking] = useState(false)
  const [showError, setShowError] = useState(false)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(true)

  const hint = useMemo(() => SETUP_STEPS[Math.min(step, SETUP_STEPS.length - 1)]?.title ?? '', [step])

  return (
    <div className="lp min-h-svh bg-(--lp-paper) text-(--lp-ink)">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <Link to="/" className="lp-focus text-sm font-semibold text-(--lp-violet) underline-offset-2 hover:underline">
          ← Back to landing
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Setup screen preview</h1>
        <p className="mt-2 text-(--lp-muted)">Scrub the bootup UI without starting a real demo. This route is for design review only.</p>

        <div className="mt-8 space-y-5 rounded-[1.5rem] border-2 border-(--lp-ink) bg-white p-5 shadow-[3px_3px_0_0_var(--lp-ink)] sm:p-6">
          <label className="block text-sm font-bold">
            Template name
            <select value={name} onChange={(e) => setName(e.target.value as (typeof TEMPLATES)[number])} className="mt-1.5 w-full rounded-xl border-2 border-(--lp-ink) bg-(--lp-paper) px-3 py-2.5 text-sm font-medium">
              {TEMPLATES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-bold">
            Step {step + 1}/{SETUP_STEPS.length}: <span className="font-medium text-(--lp-muted)">{hint}</span>
            <input type="range" min={0} max={SETUP_STEPS.length - 1} value={step} onChange={(e) => setStep(Number(e.target.value))} className="mt-2 w-full" />
          </label>

          <label className="block text-sm font-bold">
            Progress {progress}%
            <input type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="mt-2 w-full" />
          </label>

          <div className="flex flex-wrap gap-4 text-sm font-semibold">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={waking} onChange={(e) => setWaking(e.target.checked)} />
              Waking server banner
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={showError} onChange={(e) => setShowError(e.target.checked)} />
              Error state
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={ready} onChange={(e) => setReady(e.target.checked)} />
              Ready / opening handoff
            </label>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="lp-focus inline-flex h-12 items-center rounded-full border-2 border-(--lp-ink) bg-(--lp-violet) px-5 text-sm font-bold text-white shadow-[3px_3px_0_0_var(--lp-ink)]"
          >
            Open setup screen
          </button>
        </div>
      </div>

      {open && (
        <SetupScreen
          name={name}
          step={ready ? SETUP_STEPS.length - 1 : step}
          progress={ready ? 100 : progress}
          ready={ready && !showError}
          waking={waking}
          error={showError ? 'Could not reach the demo API. Try again in a moment.' : null}
          onRetry={() => setShowError(false)}
          onBack={() => setOpen(false)}
        />
      )}
    </div>
  )
}
