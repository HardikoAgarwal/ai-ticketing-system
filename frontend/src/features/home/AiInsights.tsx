import { Sparkles, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import { AiChip, AiSurface, ProgressBar } from '@/components/ds'
import { formatNumber } from '@/lib/format'
import type { AIUsage, Analytics } from '@/lib/types'

const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`)
const ratio = (a: number, b: number) => (b > 0 ? a / b : null)

function Stat({ label, value, note, children }: { label: string; value: ReactNode; note: string; children?: ReactNode }) {
  return (
    <div className="min-w-0 px-5 first:pl-0 last:pr-0 max-sm:px-0">
      <dt className="text-sm font-medium text-ink-2">{label}</dt>
      <dd className="mt-1.5 text-4xl leading-10 font-semibold tracking-tight text-ink tabular-nums">{value}</dd>
      {children}
      <p className="mt-1.5 text-xs text-ink-2">{note}</p>
    </div>
  )
}

/** The AI card: four plain numbers (how much the team uses it, how often they keep it, how often they correct it, today's budget). */
export function AiInsights({ data, usage }: { data: Analytics; usage?: AIUsage }) {
  const { drafts, ai_overrides: o, ai_usage: u } = data
  const used = drafts.ai_as_is + drafts.ai_edited
  const failRate = ratio(u.failures, u.calls)
  return (
    <AiSurface className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-control bg-lav text-ai">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold tracking-tight text-ink">AI assistance</h2>
          <p className="text-[13px] text-ink-2">How much the team relies on the AI, and how often it needs correcting.</p>
        </div>
        <AiChip size="sm">{formatNumber(u.calls)} AI calls</AiChip>
      </div>

      <dl className="mt-6 grid gap-6 sm:grid-cols-2 sm:gap-y-8 lg:grid-cols-4 lg:gap-y-0 lg:divide-x lg:divide-line">
        <Stat label="Replies using a draft" value={pct(ratio(used, drafts.total))} note={`${used} of ${drafts.total} replies started from an AI draft`} />
        <Stat label="Drafts sent as written" value={pct(ratio(drafts.ai_as_is, used))} note={`${drafts.ai_as_is} of ${used} drafts needed no edits`} />
        <Stat label="Triage corrected" value={pct(o.category_override_rate)} note={`${o.category_overridden} of ${o.classified} categories changed by staff`} />
        <Stat label="AI calls today" value={usage ? <>{usage.workspace_used}<span className="text-xl font-medium text-ink-3"> / {usage.workspace_cap}</span></> : '—'} note={usage && usage.workspace_used >= usage.workspace_cap ? 'Budget reached: keyword triage until it resets' : 'Daily budget for this workspace'}>
          {usage && <ProgressBar value={usage.workspace_used} max={usage.workspace_cap} tone="ai" label={`AI calls today: ${usage.workspace_used} of ${usage.workspace_cap}`} className="mt-3" />}
        </Stat>
      </dl>

      {failRate !== null && failRate > 0.1 && (
        <p className="mt-5 flex items-center gap-2 rounded-control bg-butter px-3 py-2 text-sm text-butter-ink">
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          {pct(failRate)} of AI calls failed in this period. The inbox falls back to keyword rules when that happens.
        </p>
      )}
    </AiSurface>
  )
}
