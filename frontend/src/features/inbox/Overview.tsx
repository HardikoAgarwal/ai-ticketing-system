import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Clock, Flame, Inbox, Sparkles, UserX } from 'lucide-react'

import { useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { AiSpark, AiSurface, Kbd, ProgressBar, Stat } from '@/components/ds'
import { Button } from '@/components/ui/button'
import type { QueueStats } from '@/lib/types'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

import type { ViewKey } from './model'

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: 'j', label: 'Next ticket' },
  { keys: 'k', label: 'Previous ticket' },
  { keys: 'enter', label: 'Open ticket' },
  { keys: 'x', label: 'Select ticket' },
  { keys: 'e', label: 'Resolve' },
  { keys: 'a', label: 'Assign to me' },
  { keys: '/', label: 'Search' },
  { keys: 'mod+k', label: 'Command bar' },
]

/** Shown in the right pane when no ticket is open: queue health, AI activity, and a way in. */
export function Overview({ stats, onView, onOpenFirst, hasTickets }: {
  stats?: QueueStats
  onView: (view: ViewKey, filter?: Record<string, string>) => void
  onOpenFirst: () => void
  hasTickets: boolean
}) {
  const { user } = useAuth()
  const { slug, api } = useWorkspace()
  const refetchInterval = useFallbackInterval()
  const usage = useQuery({ queryKey: ['ai-usage', slug], queryFn: api.tickets.aiUsage, refetchInterval: refetchInterval || 60_000 })
  const first = user?.full_name?.split(' ')[0]
  const open = stats ? stats.open + stats.in_progress : undefined
  const u = usage.data

  return (
    <div className="scroll-quiet h-full overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center gap-6 px-6 py-10">
        <header>
          <p className="text-sm font-medium text-ink-3">Inbox overview</p>
          <h2 className="mt-1 text-[28px] leading-9 font-semibold tracking-tight text-ink">
            {greeting()}
            {first ? `, ${first}` : ''}
          </h2>
          <p className="mt-1 text-[15px] text-ink-2">
            {stats ? (open ? `${open} open ticket${open === 1 ? '' : 's'}${stats.overdue ? `, ${stats.overdue} past the response target.` : ', all within target.'}` : 'Nothing open. Enjoy the quiet.') : 'Checking the queue…'}
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <Stat label="Open" value={open ?? '–'} hint={stats ? `${stats.in_progress} in progress` : undefined} icon={Inbox} tone="blue" onClick={() => onView('attention')} />
          <Stat label="Overdue first reply" value={stats?.overdue ?? '–'} hint="Past the response target" icon={Clock} tone="red" onClick={() => onView('attention', { sla: 'overdue' })} />
          <Stat label="Unassigned" value={stats?.unassigned ?? '–'} hint="Waiting for an owner" icon={UserX} tone="violet" onClick={() => onView('unassigned')} />
          <Stat label="Critical" value={stats?.critical ?? '–'} hint="Highest priority" icon={Flame} tone="peach" onClick={() => onView('attention', { priority: 'CRITICAL' })} />
        </div>

        <AiSurface tone="quiet" className="p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-lav text-violet">
              <Sparkles className="size-[18px]" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <AiSpark className="size-3.5" /> AI today
              </p>
              {u ? (
                <>
                  <p className="mt-0.5 text-sm text-ink-2">
                    <span className="font-semibold tabular-nums">{u.workspace_used}</span> of <span className="tabular-nums">{u.workspace_cap}</span> AI calls used in this workspace
                  </p>
                  <ProgressBar className="mt-2.5" tone="ai" value={u.workspace_used} max={u.workspace_cap} label="AI calls used today" />
                </>
              ) : (
                <p className="mt-0.5 text-sm text-ink-3">Triage, summaries and drafts run automatically on new tickets.</p>
              )}
              {!!stats?.ai_failed && (
                <p className="mt-2.5 text-[13px] font-medium text-butter-ink">
                  {stats.ai_failed} ticket{stats.ai_failed === 1 ? '' : 's'} could not be triaged automatically and need a manual look.
                </p>
              )}
            </div>
          </div>
        </AiSurface>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onOpenFirst} disabled={!hasTickets}>
            Start with the most urgent <ArrowRight />
          </Button>
          <p className="text-[13px] text-ink-3">or pick any ticket from the list.</p>
        </div>

        <section aria-label="Keyboard shortcuts" className="border-t border-line pt-5">
          <h3 className="mb-3 text-xs font-semibold tracking-wide text-ink-3 uppercase">Move faster</h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-4">
            {SHORTCUTS.map((s) => (
              <div key={s.keys} className="flex items-center gap-2">
                <dt>
                  <Kbd keys={s.keys} />
                </dt>
                <dd className="text-[13px] text-ink-2">{s.label}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  )
}
