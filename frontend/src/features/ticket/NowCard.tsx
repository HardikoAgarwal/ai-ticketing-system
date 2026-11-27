import { AlertTriangle, Lightbulb, RefreshCw, Tag, UserCheck, WandSparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

import { AiBadgeInline, AiChip, AiSpark, AiSurface, Chip, ProgressBar, Skeleton } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { PRIORITY_META, SENTIMENT_META } from '@/lib/constants'
import type { DraftResponse, StaffTicketDetail, TicketPriority } from '@/lib/types'
import { cn } from '@/lib/utils'

import { aiState, nextAction, PRIORITY_TONE, SENTIMENT_TONE, slaView } from './ticket-ui'
import type { TicketPatch } from './use-ticket'

function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

/**
 * "What matters now": the one place for the AI's read of the ticket, the next step, and the response clock.
 * Editing category/priority lives in the Details section; here the AI only suggests, and you can accept its value.
 */
export function NowCard({ ticket, draft, meId, readOnly, rerunning, onRerun, onUpdate }: {
  ticket: StaffTicketDetail
  draft?: DraftResponse
  meId?: number
  readOnly: boolean
  rerunning: boolean
  onRerun: () => void
  onUpdate: (patch: TicketPatch) => void
}) {
  const now = useNow()
  const state = aiState(ticket)
  const sla = slaView(ticket)
  const draftReady = draft?.status === 'ready' && !!draft.draft
  const next = nextAction(ticket, draftReady, meId)
  const conf = ticket.ai_confidence !== null ? Math.round(ticket.ai_confidence * 100) : null
  const lowConf = conf !== null && conf < 55
  const aiCategory = ticket.ai_category ?? ticket.category
  const sentiment = ticket.sentiment ? SENTIMENT_META[ticket.sentiment] : null
  const catOverridden = ticket.category_source === 'STAFF' && !!ticket.ai_category && ticket.ai_category.id !== ticket.category?.id
  const priOverridden = ticket.priority_source === 'STAFF' && !!ticket.ai_priority && ticket.ai_priority !== ticket.priority

  // How much of the first-response window is gone (only while still waiting for a first reply).
  const start = Date.parse(ticket.created_at)
  const due = ticket.sla_due_at ? Date.parse(ticket.sla_due_at) : null
  const used = sla.waiting && due && due > start ? Math.min(100, Math.max(2, Math.round(((now - start) / (due - start)) * 100))) : null

  const summary =
    state === 'working' ? null
    : state === 'failed' ? 'AI triage was unavailable, so keyword rules set the category and priority.'
    : state === 'limited' ? "Today's shared AI budget is used up, so keyword rules set the category and priority."
    : state === 'off' ? 'AI is off for this workspace. Triage uses keyword rules.'
    : ticket.ai_summary || 'Triage is ready.'

  return (
    <AiSurface working={state === 'working'} tone={state === 'done' ? 'bold' : 'quiet'} aria-label="What matters now" className="p-4">
      <div className="flex items-center gap-2">
        <AiSpark working={state === 'working'} className="size-4" />
        <h3 className="text-[11px] font-semibold tracking-[0.08em] text-lav-ink uppercase">What matters now</h3>
        {conf !== null && state === 'done' && (
          <span className={cn('ml-auto text-xs font-medium tabular-nums', lowConf ? 'text-butter-ink' : 'text-ink-3')}>{conf}% sure{lowConf ? ' · double-check' : ''}</span>
        )}
      </div>

      {/* 1. the next step, in plain words */}
      <p className="mt-3 flex items-start gap-2 text-[15px] leading-snug font-medium text-ink">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-ai" aria-hidden /> <span>{next.text}</span>
      </p>

      {/* 2. the clock */}
      {ticket.sla_state !== 'none' && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-ink-3">First response</span>
            <Chip tone={sla.tone} size="sm">{sla.text}</Chip>
          </div>
          {used !== null && <ProgressBar value={used} tone={ticket.sla_state === 'overdue' ? 'red' : ticket.sla_state === 'at_risk' ? 'amber' : 'green'} size="sm" label="Share of the first-response window used" />}
        </div>
      )}

      {/* 3. what the AI saw */}
      <div className="mt-4 border-t border-line pt-3">
        {state === 'working' ? (
          <div className="space-y-2" role="status"><Skeleton className="h-3.5 w-11/12" /><Skeleton className="h-3.5 w-2/3" /><span className="sr-only">AI is reading this ticket</span></div>
        ) : (
          <p className="text-[13px] leading-relaxed text-ink-2"><AiBadgeInline className="mr-1">Summary</AiBadgeInline>{summary}</p>
        )}

        {state === 'done' && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {aiCategory && <AiChip size="sm" icon={Tag}>{aiCategory.name}</AiChip>}
            {ticket.ai_priority && <AiChip size="sm" icon={PRIORITY_META[ticket.ai_priority].icon}>Suggests {PRIORITY_META[ticket.ai_priority].label}</AiChip>}
            {sentiment && ticket.sentiment && <Chip tone={SENTIMENT_TONE[ticket.sentiment]} icon={sentiment.icon} size="sm">{sentiment.label}</Chip>}
          </div>
        )}

        {state === 'done' && ticket.ai_reasoning && (
          <details className="group mt-3 text-[13px]">
            <summary className="cursor-pointer text-xs font-medium text-lav-ink">Why did the AI say this?</summary>
            <p className="mt-1.5 leading-relaxed text-ink-3">{ticket.ai_reasoning}</p>
          </details>
        )}

        {lowConf && state === 'done' && (
          <p role="status" className="mt-3 flex items-start gap-2 rounded-control border border-butter-line bg-butter px-3 py-2 text-[13px] text-butter-ink">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> The AI is unsure here. Check the category and priority below.
          </p>
        )}
        {(state === 'failed' || state === 'limited') && ticket.ai_error && (
          <p role="status" className="mt-3 flex items-start gap-2 rounded-control border border-butter-line bg-butter px-3 py-2 text-[13px] text-butter-ink">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> <span className="[overflow-wrap:anywhere]">{ticket.ai_error}</span>
          </p>
        )}

        {(catOverridden || priOverridden) && (
          <div className="mt-3 space-y-2">
            <p className="flex items-center gap-1 text-xs font-medium text-mint-ink"><UserCheck className="size-3.5" aria-hidden /> You changed the AI's suggestion</p>
            <div className="flex flex-wrap gap-2">
              {catOverridden && ticket.ai_category && (
                <Button variant="outline" size="sm" disabled={readOnly} onClick={() => onUpdate({ category: ticket.ai_category!.key })}><WandSparkles /> Use AI category ({ticket.ai_category.name})</Button>
              )}
              {priOverridden && ticket.ai_priority && (
                <Button variant="outline" size="sm" disabled={readOnly} onClick={() => onUpdate({ priority: ticket.ai_priority as TicketPriority })}>
                  <WandSparkles /> Use AI priority <Chip tone={PRIORITY_TONE[ticket.ai_priority]} size="sm" className="ml-1">{PRIORITY_META[ticket.ai_priority].label}</Chip>
                </Button>
              )}
            </div>
          </div>
        )}

        {state !== 'off' && (
          <Button variant="ghost" size="sm" className="mt-2 -ml-2 text-ink-2" onClick={onRerun} disabled={rerunning || state === 'working'}>
            <RefreshCw className={cn((rerunning || state === 'working') && 'animate-spin')} /> Re-run AI triage
          </Button>
        )}
      </div>
    </AiSurface>
  )
}
