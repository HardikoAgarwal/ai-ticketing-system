import { useQuery } from '@tanstack/react-query'
import { Eye, Headset, Loader2, RotateCcw, Sparkles, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { errorMessage } from '@/lib/api'
import { timeUntil } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Slim strip shown in demo workspaces: expiry, live AI budget, view switch, fresh demo. */
export function DemoBanner() {
  const { slug, api, brief, isDemo, staff } = useWorkspace()
  const { demo, activeView, switchView, startDemo } = useAuth()
  const navigate = useNavigate()
  const [, tick] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  const wsInfo = useQuery({ queryKey: ['workspace', slug], queryFn: api.workspace, enabled: isDemo && staff, staleTime: 5 * 60_000 })
  const usage = useQuery({ queryKey: ['ai-usage', slug], queryFn: api.tickets.aiUsage, enabled: isDemo && staff, refetchInterval: 60_000 })

  if (!isDemo) return null
  const left = timeUntil(brief?.expires_at)
  const canSwitch = !!demo && demo.slug === slug
  const u = usage.data
  const pct = u ? Math.min(100, Math.round((u.global_used / Math.max(u.global_cap, 1)) * 100)) : 0

  const flip = async (view: 'agent' | 'customer') => {
    if (view === activeView) return
    setBusy(true)
    try {
      await switchView(view)
      navigate(`/w/${slug}/${view === 'agent' ? 'agent' : 'help'}`)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const fresh = async () => {
    setBusy(true)
    try {
      const newSlug = await startDemo(wsInfo.data?.template || 'saas')
      navigate(`/w/${newSlug}/agent`)
      toast.success('Fresh demo workspace ready')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border-b bg-linear-to-r from-violet-50 via-fuchsia-50 to-sky-50 text-xs">
      <div className="mx-auto flex max-w-[1600px] items-center gap-x-3 gap-y-1.5 px-4 py-1.5 md:gap-x-4 md:px-6">
        <span className="flex items-center gap-1.5 font-medium whitespace-nowrap text-violet-800">
          <Sparkles className="size-3.5" /> Live demo{left && left !== 'expired' ? <span className="hidden sm:inline"> · resets in {left}</span> : null}
        </span>

        {canSwitch && (
          <div role="group" aria-label="Switch view" className="flex items-center rounded-full border bg-card p-0.5">
            {(
              [
                ['agent', 'Agent', Headset],
                ['customer', 'Customer', UserRound],
              ] as const
            ).map(([view, label, Icon]) => (
              <button
                key={view}
                disabled={busy}
                onClick={() => flip(view)}
                aria-pressed={activeView === view}
                className={cn(
                  'flex items-center gap-1 rounded-full px-2.5 py-1 font-medium whitespace-nowrap transition-colors',
                  activeView === view ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-3.5" /> {label}<span className="hidden sm:inline"> view</span>
              </button>
            ))}
          </div>
        )}

        {u && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="hidden items-center gap-2 text-muted-foreground md:flex">
                <Eye className="size-3.5" /> Live AI today
                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-black/10" aria-hidden>
                  <span className={cn('block h-full rounded-full', pct > 85 ? 'bg-amber-500' : 'bg-violet-500')} style={{ width: `${pct}%` }} />
                </span>
                <span className="tabular-nums">
                  {u.global_used}/{u.global_cap}
                </span>
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-64">
              The free Gemini tier is shared by every visitor, so live AI calls are capped per day ({u.workspace_used}/{u.workspace_cap} used in this
              workspace). Past the cap, tickets fall back to rule-based triage; seeded tickets keep their AI results.
            </TooltipContent>
          </Tooltip>
        )}

        <Button variant="ghost" size="xs" className="ml-auto h-6 shrink-0" aria-label="Start fresh demo" onClick={fresh} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <RotateCcw />} <span className="hidden sm:inline">Start fresh demo</span><span className="sr-only sm:hidden">Start fresh demo</span>
        </Button>
      </div>
    </div>
  )
}
