import { useQuery } from '@tanstack/react-query'
import { Gauge, Info, MessageSquareQuote, ScanText, Sparkles, UserRoundCheck } from 'lucide-react'

import { useWorkspace } from '@/auth/workspace'
import { AiSpark, AiSurface, Chip, fill, on, ProgressBar, type Hue } from '@/components/ds'
import { Switch } from '@/components/ui/switch'

import { SettingsCard } from './rows'
import type { WorkspaceFormApi } from './use-workspace-form'

const FEATURES: { icon: typeof ScanText; hue: Hue; title: string; body: string }[] = [
  { icon: ScanText, hue: 'lav', title: 'Triages every ticket', body: 'Picks a category and priority, reads the customer’s mood and writes a one-line summary, in seconds.' },
  { icon: MessageSquareQuote, hue: 'sky', title: 'Drafts grounded replies', body: 'Writes from your knowledge base and the customer’s own details, and cites its sources. Never sent automatically.' },
  { icon: UserRoundCheck, hue: 'mint', title: 'Spots duplicates', body: 'Flags tickets that look like ones you already have, so the team can answer once.' },
]

export function AiSettings({ f, readOnly }: { f: WorkspaceFormApi; readOnly: boolean }) {
  const { slug, api, isDemo } = useWorkspace()
  const usage = useQuery({ queryKey: ['ai-usage', slug], queryFn: api.tickets.aiUsage })
  const { form, set } = f
  const u = usage.data
  const pct = u ? Math.min(100, Math.round((u.workspace_used / Math.max(1, u.workspace_cap)) * 100)) : 0
  return (
    <div className="space-y-6">
      <SettingsCard icon={Sparkles} title="Assistant" description="Switch the AI on or off and see what it does while it is on.">
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
        <ul className="grid gap-4 md:grid-cols-3" aria-label="What the AI does">
          {FEATURES.map(({ icon: Icon, hue, title, body }) => (
            <li key={title} className="flex flex-col rounded-control border border-line bg-surface p-5 shadow-card">
              <span className="flex size-11 items-center justify-center rounded-control" style={{ background: fill(hue), color: on(hue) }} aria-hidden>
                <Icon className="size-5" />
              </span>
              <p className="mt-4 text-[15px] font-semibold text-ink">{title}</p>
              <p className="mt-1.5 text-[13px] leading-5 text-ink-2">{body}</p>
            </li>
          ))}
        </ul>
      </SettingsCard>

      <SettingsCard icon={Gauge} title="Budget and fallback" description="A daily limit keeps costs predictable, and nothing breaks if it runs out.">
        <div>
          <div className="flex items-start justify-between gap-6">
            <div>
              <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                <Gauge className="size-4 text-ink-3" aria-hidden /> Live AI today
                <AiSpark />
              </h3>
              <p className="mt-1 max-w-md text-[13px] leading-5 text-ink-2">{isDemo ? 'Demo workspaces share a small free daily allowance so everyone can try it.' : 'A daily safety limit on live AI calls keeps costs predictable.'}</p>
            </div>
            <p className="shrink-0 text-right">
              <span className="text-3xl leading-9 font-semibold tracking-tight text-ink tabular-nums">{u ? u.workspace_used : '…'}</span>
              <span className="text-lg text-ink-3 tabular-nums"> / {u ? u.workspace_cap : '…'}</span>
              <span className="block text-xs text-ink-3">calls today</span>
            </p>
          </div>
          <ProgressBar value={Math.max(pct, u ? 3 : 0)} tone={pct >= 90 ? 'red' : pct >= 70 ? 'amber' : 'ai'} label="Live AI calls used today" className="mt-5 h-4" />
          <div className="mt-3 flex flex-wrap justify-between gap-x-6 gap-y-1 text-[13px] text-ink-2">
            <span>
              <span className="font-semibold text-ink">{pct}%</span> of today&apos;s allowance used
            </span>
            <span>Resets every day</span>
          </div>
          {u && <p className="mt-1 text-xs text-ink-3">Across all workspaces on this server: {u.global_used} of {u.global_cap} today.</p>}
          <div role="note" className="mt-7 flex items-start gap-3.5 rounded-control border border-sky-line bg-sky p-4 text-sky-ink">
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
