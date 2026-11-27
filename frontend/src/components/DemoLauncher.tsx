import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Boxes, Cloud, Headphones, RotateCcw, ServerCog, ShoppingBag, UserRound, type LucideIcon } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { Chip, SegmentedControl, Skeleton, type ChipTone } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { SetupScreen } from '@/features/auth/SetupScreen'
import { useColdStartRetry, useSetupProgress } from '@/features/auth/useSandboxSetup'
import { friendlyError } from '@/features/auth/errors'
import { demoApi } from '@/lib/endpoints'
import type { DemoTemplate } from '@/lib/types'
import { cn } from '@/lib/utils'

type Role = 'agent' | 'customer'

const META: Record<string, { icon: LucideIcon; tile: string; tone: ChipTone; blurb: string }> = {
  saas: { icon: Cloud, tile: 'bg-lav text-lav-ink', tone: 'violet', blurb: 'Billing disputes, SSO lockouts, API limits and a pipeline outage.' },
  helpdesk: { icon: ServerCog, tile: 'bg-mint text-mint-ink', tone: 'green', blurb: 'Laptop provisioning, VPN trouble, access requests and a phishing report.' },
  ecommerce: { icon: ShoppingBag, tile: 'bg-peach text-peach-ink', tone: 'peach', blurb: 'Late deliveries, damaged items, refunds and a wrong-size exchange.' },
}

/** Template picker + one-click demo start. Copes with a sleeping free-tier API and shows the setup screen while the sandbox is built. */
export function DemoLauncher({ className }: { className?: string }) {
  const { startDemo, switchView } = useAuth()
  const navigate = useNavigate()
  const withRetry = useColdStartRetry()
  const [role, setRole] = useState<Role>('agent')
  const [busy, setBusy] = useState<DemoTemplate | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trigger = useRef<HTMLElement | null>(null)

  const templates = useQuery({
    queryKey: ['demo-templates'],
    queryFn: demoApi.templates,
    retry: 6,
    retryDelay: (n) => Math.min(8000, 1500 * (n + 1)),
    staleTime: 5 * 60_000,
  })
  const progress = useSetupProgress({ active: !!busy, done, error: !!error })

  const launch = async (t: DemoTemplate) => {
    if (busy && !error) return
    if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) trigger.current = document.activeElement
    setError(null)
    setDone(false)
    setBusy(t)
    try {
      const slug = await withRetry(() => startDemo(t.key))
      if (role === 'customer') await switchView('customer')
      setDone(true)
      await new Promise((r) => setTimeout(r, 750))
      setBusy(null)
      await new Promise((r) => setTimeout(r, 560))
      navigate(`/w/${slug}/${role === 'customer' ? 'help' : 'agent'}`, {
        state: { enteringWorkspace: true, workspaceName: t.name },
      })
    } catch (err) {
      setError(friendlyError(err))
    }
  }
  const close = () => {
    setBusy(null)
    setError(null)
    setDone(false)
    // hand focus back to the card that started the setup
    window.setTimeout(() => trigger.current?.focus(), 0)
  }

  const waking = templates.isLoading && templates.failureCount > 0

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p id="demo-role-label" className="text-[13px] font-semibold text-ink">
          Enter as
        </p>
        <SegmentedControl<Role>
          ariaLabel="Enter the demo as"
          size="sm"
          value={role}
          onChange={setRole}
          options={[
            { value: 'agent', label: 'Agent', icon: Headphones },
            { value: 'customer', label: 'Customer', icon: UserRound },
          ]}
        />
      </div>

      {waking && (
        <p role="status" className="mb-3 rounded-control border border-sky-line bg-sky px-3 py-2.5 text-[13px] font-medium text-sky-ink">
          The demo server naps when idle. Waking it up can take up to a minute the first time.
        </p>
      )}

      {templates.isLoading ? (
        <div className="space-y-2.5" role="status" aria-label="Loading demos">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[4.5rem] rounded-panel" />
          ))}
        </div>
      ) : templates.isError ? (
        <div className="rounded-panel border border-dashed border-line-strong bg-surface-2 p-6 text-center text-sm text-ink-2">
          We couldn't reach the demo server.
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={() => templates.refetch()}>
              <RotateCcw aria-hidden /> Try again
            </Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {templates.data?.map((t) => {
            const m = META[t.key] ?? { icon: Boxes, tile: 'bg-sunken text-ink-2', tone: 'slate' as ChipTone, blurb: '' }
            const Icon = m.icon
            return (
              <li key={t.key}>
                <button
                  type="button"
                  onClick={() => launch(t)}
                  disabled={!!busy}
                  className={cn(
                    'group flex w-full items-center gap-3.5 rounded-panel border border-line bg-surface p-3.5 text-left shadow-card transition-all',
                    'hover:border-line-strong hover:shadow-pop focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet disabled:opacity-60',
                  )}
                >
                  <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-control', m.tile)}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[15px] font-semibold tracking-tight text-ink">{t.name}</span>
                      <Chip tone={m.tone} size="sm">{t.industry}</Chip>
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">{m.blurb || t.tagline}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
                  <span className="sr-only">Open this demo as {role}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-3 text-[13px] text-ink-3">No signup needed. You get a private workspace with sample data that resets after 24 hours.</p>

      <AnimatePresence mode="wait">
        {busy && (
          <SetupScreen
            name={busy.name}
            step={progress.step}
            progress={progress.progress}
            ready={done && !error}
            waking={progress.waking}
            error={error}
            onRetry={() => launch(busy)}
            onBack={close}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
