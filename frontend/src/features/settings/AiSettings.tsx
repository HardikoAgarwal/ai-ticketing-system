import { useQuery } from '@tanstack/react-query'
import { Gauge, Info, MessageSquareQuote, ScanText, Sparkles, UserRoundCheck } from 'lucide-react'

import { useWorkspace } from '@/auth/workspace'
import { AiSpark, AiSurface, Chip, ProgressBar } from '@/components/ds'
import { Switch } from '@/components/ui/switch'

import { SettingsCard } from './rows'
import type { WorkspaceFormApi } from './use-workspace-form'

const FEATURES = [
  { icon: ScanText, title: 'Triages every ticket', body: 'Picks a category and priority, reads the customer’s mood and writes a one-line summary, in seconds.' },
  { icon: MessageSquareQuote, title: 'Drafts grounded replies', body: 'Writes from your knowledge base and the customer’s own details, and cites its sources. Never sent automatically.' },
  { icon: UserRoundCheck, title: 'Spots duplicates', body: 'Flags tickets that look like ones you already have, so the team can answer once.' },
]

export function AiSettings({ f, readOnly }: { f: WorkspaceFormApi; readOnly: boolean }) {
  const { slug, api, isDemo } = useWorkspace()
  const usage = useQuery({ queryKey: ['ai-usage', slug], queryFn: api.tickets.aiUsage })
  const { form, set } = f
  const u = usage.data
  const pct = u ? Math.min(100, Math.round((u.workspace_used / Math.max(1, u.workspace_cap)) * 100)) : 0
  return (
    <div className="space-y-6">
      <SettingsCard title="Assistant" description="Switch the AI on or off and see what it does while it is on.">
        <div>
          <AiSurface tone={form.ai_enabled ? 'bold' : 'quiet'} className="p-4">
            <div className="flex items-center gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-lav text-ai">
                <Sparkles className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <label htmlFor="ai-on" className={readOnly ? 'block' : 'block cursor-pointer'}>
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    {form.ai_enabled ? 'AI assistant is on' : 'AI assistant is off'}
                    <Chip size="sm" tone={form.ai_enabled ? 'green' : 'slate'}>
                      {form.ai_enabled ? 'Active' : 'Paused'}
                    </Chip>
                  </span>
                  <span className="block text-[13px] leading-5 text-ink-2">Turn it off at any time. Tickets keep working with simple rules, and agents write replies themselves.</span>
                </label>
              </div>
              <Switch id="ai-on" checked={form.ai_enabled} disabled={readOnly} onCheckedChange={(v) => set('ai_enabled', v)} />
            </div>
          </AiSurface>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-control bg-surface-2 p-4">
              <Icon className="mb-2.5 size-5 text-ai" aria-hidden />
              <p className="text-sm font-semibold text-ink">{title}</p>
              <p className="mt-1 text-[13px] leading-5 text-ink-2">{body}</p>
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title="Budget and fallback" description="A daily limit keeps costs predictable, and nothing breaks if it runs out.">
        <div>
          <div className="mb-2.5 flex items-end justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Gauge className="size-4 text-ink-3" aria-hidden /> Live AI today
                <AiSpark />
              </h3>
              <p className="text-[13px] text-ink-2">{isDemo ? 'Demo workspaces share a small free daily allowance so everyone can try it.' : 'A daily safety limit on live AI calls keeps costs predictable.'} Resets every day.</p>
            </div>
            <p className="shrink-0 text-sm font-semibold text-ink tabular-nums">
              {u ? `${u.workspace_used} / ${u.workspace_cap}` : '…'} <span className="text-xs font-normal text-ink-3">calls</span>
            </p>
          </div>
          <ProgressBar value={Math.max(pct, u ? 2 : 0)} tone={pct >= 90 ? 'red' : pct >= 70 ? 'amber' : 'ai'} label="Live AI calls used today" />
          {u && <p className="mt-1.5 text-xs text-ink-3">Across all workspaces on this server: {u.global_used} of {u.global_cap} today.</p>}
          <div role="note" className="mt-5 flex items-start gap-3.5 rounded-control border border-sky-line bg-sky p-4 text-sky-ink">
            <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-semibold">When the AI is off or out of budget</p>
              <p className="mt-1 text-[13px] leading-5">
                Nothing breaks. New tickets are still categorised and prioritised instantly by <span className="font-semibold">keyword rules</span> (set in Categories), SLA timers still run, and the composer simply has no draft. Agents reply as usual.
              </p>
            </div>
          </div>
        </div>
      </SettingsCard>
    </div>
  )
}
