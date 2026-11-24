import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Boxes, Cloud, Headphones, Loader2, ServerCog, ShoppingBag, Sparkles, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { ApiError, errorMessage } from '@/lib/api'
import { demoApi } from '@/lib/endpoints'
import type { DemoTemplate } from '@/lib/types'
import { cn } from '@/lib/utils'

const ICONS: Record<string, LucideIcon> = { saas: Cloud, helpdesk: ServerCog, ecommerce: ShoppingBag }
const BLURBS: Record<string, string> = {
  saas: 'Billing disputes, SSO lockouts, API rate limits and a Segment pipeline outage.',
  helpdesk: 'Laptop provisioning, VPN trouble, access requests and a phishing report.',
  ecommerce: 'Late deliveries, damaged items, refunds and a wrong-size exchange.',
}

const STEPS = ['Creating your private workspace', 'Seeding customers, tickets and AI triage', 'Indexing the knowledge base', 'Almost there']

function isColdStart(err: unknown) {
  return err instanceof ApiError && (err.status === 0 || err.status >= 502)
}

/** Template picker + one-click demo start. Copes with a sleeping free-tier API (retries with a friendly message). */
export function DemoLauncher({ className }: { className?: string }) {
  const { startDemo } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const templates = useQuery({
    queryKey: ['demo-templates'],
    queryFn: demoApi.templates,
    retry: 6,
    retryDelay: (n) => Math.min(8000, 1500 * (n + 1)),
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    if (!busy && !templates.isLoading) return
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => {
      clearInterval(t)
      setElapsed(0)
    }
  }, [busy, templates.isLoading])

  const launch = async (key: string) => {
    setError(null)
    setBusy(key)
    try {
      let slug: string | null = null
      for (let attempt = 0; attempt < 4 && !slug; attempt++) {
        try {
          slug = await startDemo(key)
        } catch (err) {
          if (!isColdStart(err) || attempt === 3) throw err
          await new Promise((r) => setTimeout(r, 4000))
        }
      }
      if (slug) navigate(`/w/${slug}/agent`)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(null)
    }
  }

  const waking = (busy && elapsed > 6) || (templates.isLoading && elapsed > 4) || templates.failureCount > 0

  return (
    <div className={className}>
      {waking && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <Loader2 className="size-4 shrink-0 animate-spin" />
          The demo runs on a free server that naps when idle. Waking it up now, this takes up to a minute the first time.
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {templates.isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl border bg-muted/50" />
          ))}
        </div>
      ) : templates.isError ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Couldn't reach the demo server.
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={() => templates.refetch()}>
              Try again
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {templates.data?.map((t: DemoTemplate) => {
            const Icon = ICONS[t.key] ?? Boxes
            const loading = busy === t.key
            return (
              <button
                key={t.key}
                onClick={() => launch(t.key)}
                disabled={!!busy}
                className={cn(
                  'group relative flex flex-col rounded-2xl border bg-card p-5 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60',
                  loading && 'border-primary ring-2 ring-primary/20',
                )}
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="size-5" />
                </span>
                <p className="mt-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">{t.industry}</p>
                <p className="mt-0.5 text-lg font-semibold tracking-tight">{t.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t.tagline}</p>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground/90">{BLURBS[t.key]}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {loading ? STEPS[Math.min(Math.floor(elapsed / 3), STEPS.length - 1)] : 'Open this demo'}
                  {!loading && <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />}
                </span>
              </button>
            )
          })}
        </div>
      )}
      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Headphones className="size-3.5" /> No signup. You get a private workspace with sample data that resets after 24 hours.
      </p>
    </div>
  )
}
