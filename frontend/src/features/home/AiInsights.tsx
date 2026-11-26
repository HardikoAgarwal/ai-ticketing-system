import { Sparkles } from 'lucide-react'

import { AiChip, AiSurface, ProgressBar, ProgressRing } from '@/components/ds'
import { formatNumber } from '@/lib/format'
import type { AIUsage, Analytics } from '@/lib/types'

const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`)
const ratio = (a: number, b: number) => (b > 0 ? a / b : null)

/** The one AI block on the home page: how much the team leans on the AI, how often they correct it, and today's call budget. */
export function AiInsights({ data, usage }: { data: Analytics; usage?: AIUsage }) {
  const { drafts, ai_overrides: o, ai_usage: u } = data
  const used = drafts.ai_as_is + drafts.ai_edited
  const adoption = ratio(used, drafts.total)
  const asIs = ratio(drafts.ai_as_is, used)
  const failRate = ratio(u.failures, u.calls)
  const manual = Math.max(0, drafts.total - used)
  const feature = (f: string) => u.by_feature.find((x) => x.feature === f)?.calls ?? 0

  const lines: string[] = []
  if (adoption !== null) lines.push(`Agents started from an AI draft in ${pct(adoption)} of replies${asIs !== null ? `, and sent ${pct(asIs)} of those without editing` : ''}.`)
  else lines.push('No replies were sent in this period, so there is nothing to compare yet.')
  if (o.classified > 0) lines.push(`Staff changed the AI's category on ${o.category_overridden} of ${o.classified} triaged tickets (${pct(o.category_override_rate)}) and its priority on ${o.priority_overridden} (${pct(o.priority_override_rate)}).`)
  if (failRate !== null && failRate > 0.1) lines.push(`${pct(failRate)} of AI calls failed. The inbox falls back to keyword rules when that happens.`)

  return (
    <AiSurface className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-control bg-lav text-ai">
          <Sparkles className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold tracking-tight text-ink">AI assistance</h2>
          <p className="text-[13px] text-ink-2">How the team uses the AI, and how often it gets corrected. Costs are $0 on the Gemini free tier.</p>
        </div>
        <AiChip size="sm">{formatNumber(u.calls)} calls</AiChip>
      </div>

      {usage && (
        <div className="mt-5 rounded-control border border-line bg-surface/60 p-3.5">
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="font-medium text-ink">AI calls today in this workspace</span>
            <span className="font-semibold text-ink tabular-nums">
              {usage.workspace_used} <span className="font-normal text-ink-3">of {usage.workspace_cap}</span>
            </span>
          </div>
          <ProgressBar value={usage.workspace_used} max={usage.workspace_cap} tone="ai" label={`AI calls today: ${usage.workspace_used} of ${usage.workspace_cap}`} className="mt-2" />
          <p className="mt-2 text-xs text-ink-3">
            {usage.workspace_used >= usage.workspace_cap
              ? 'Daily AI budget reached. New tickets use keyword triage until it resets.'
              : 'When the daily budget runs out, new tickets fall back to keyword triage automatically.'}
          </p>
        </div>
      )}

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div>
          <div className="flex flex-wrap items-center gap-6">
            {[
              { label: 'Replies using a draft', value: adoption },
              { label: 'Drafts sent as-is', value: asIs },
              { label: 'Category corrected', value: o.category_override_rate },
            ].map((r) => (
              <div key={r.label} className="flex items-center gap-3">
                <ProgressRing value={(r.value ?? 0) * 100} size={52} stroke={5} tone="ai" label={`${r.label}: ${pct(r.value)}`}>
                  {pct(r.value)}
                </ProgressRing>
                <span className="max-w-[6.5rem] text-xs leading-4 font-medium text-ink-2">{r.label}</span>
              </div>
            ))}
          </div>
          <ul className="mt-5 space-y-2">
            {lines.map((l) => (
              <li key={l} className="flex gap-2 text-sm leading-5 text-ink">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-ai" aria-hidden /> {l}
              </li>
            ))}
          </ul>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          {[
            ['Triage calls', feature('CLASSIFY')],
            ['Draft calls', feature('DRAFT')],
            ['Avg latency', u.avg_latency_ms ? `${(u.avg_latency_ms / 1000).toFixed(1)}s` : '—'],
            ['Prompt tokens', formatNumber(u.prompt_tokens)],
            ['Completion tokens', formatNumber(u.completion_tokens)],
            ['Failure rate', pct(failRate)],
            ['Drafts as-is', drafts.ai_as_is],
            ['Drafts edited', drafts.ai_edited],
            ['Written manually', manual],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-xs font-medium text-ink-3">{k}</dt>
              <dd className="mt-0.5 text-lg leading-6 font-semibold text-ink tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </AiSurface>
  )
}
