import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw, Sparkles, Tag, UserCheck, WandSparkles } from 'lucide-react'
import { useState } from 'react'

import { AiBadgeInline, AiChip, AiSpark, AiSurface, Chip, ProgressBar, Skeleton } from '@/components/ds'
import { MetaSelect } from '@/components/MetaSelect'
import { Button } from '@/components/ui/button'
import { categoryTone, PRIORITIES, PRIORITY_META, SENTIMENT_META } from '@/lib/constants'
import type { Category, StaffTicketDetail, TicketPriority } from '@/lib/types'
import { cn } from '@/lib/utils'

import type { TicketPatch } from './use-ticket'
import { aiState, PRIORITY_TONE, SENTIMENT_TONE } from './ticket-ui'

const OPEN_KEY = 'helpdesk.ticket.ai-open'
const readOpen = () => {
  try {
    return localStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}

/** The AI's read of the ticket, in the shared aurora treatment. Handles every state the triage can be in. */
export function AiStrip({ ticket, categories, onUpdate, onRerun, rerunning, readOnly }: {
  ticket: StaffTicketDetail
  categories: Category[]
  onUpdate: (patch: TicketPatch) => void
  onRerun: () => void
  rerunning: boolean
  readOnly: boolean
}) {
  const [open, setOpen] = useState(readOpen)
  const state = aiState(ticket)
  const toggle = () =>
    setOpen((v) => {
      try {
        localStorage.setItem(OPEN_KEY, v ? '0' : '1')
      } catch {
        /* ignore */
      }
      return !v
    })

  const conf = ticket.ai_confidence !== null ? Math.round(ticket.ai_confidence * 100) : null
  const lowConf = conf !== null && conf < 55
  const aiCategory = ticket.ai_category ?? ticket.category
  const sentiment = ticket.sentiment ? SENTIMENT_META[ticket.sentiment] : null
  const catOverridden = ticket.category_source === 'STAFF' && ticket.ai_category && ticket.ai_category.id !== ticket.category?.id
  const priOverridden = ticket.priority_source === 'STAFF' && !!ticket.ai_priority && ticket.ai_priority !== ticket.priority
  const overridden = catOverridden || priOverridden

  if (state === 'off') {
    return (
      <div className="mx-4 mt-3 flex items-center gap-2 rounded-panel border border-dashed border-line-strong bg-surface-2 px-4 py-2.5 text-[13px] text-ink-3 sm:mx-5">
        <Sparkles className="size-4" aria-hidden /> AI is off for this workspace. Triage uses keyword rules.
      </div>
    )
  }

  const headline =
    state === 'working' ? 'AI is reading this ticket…' : state === 'failed' ? 'AI triage unavailable, rules used instead' : state === 'limited' ? 'AI quota reached, rules used instead' : ticket.ai_summary || 'Triage ready'

  return (
    <AiSurface working={state === 'working'} tone={state === 'done' ? 'bold' : 'quiet'} className="mx-4 mt-3 sm:mx-5" aria-label="AI triage">
      <div className="flex items-center gap-3 px-4 py-3">
        <AiSpark working={state === 'working'} className="size-5" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 text-[11px] font-semibold tracking-[0.08em] text-lav-ink uppercase">
            AI triage
            {conf !== null && state === 'done' && <span className={cn('tracking-normal normal-case', lowConf ? 'text-butter-ink' : 'text-ink-3')}>{conf}% confident{lowConf ? ' · double-check' : ''}</span>}
            {overridden && <span className="inline-flex items-center gap-1 tracking-normal text-mint-ink normal-case"><UserCheck className="size-3" aria-hidden /> Overridden by team</span>}
          </p>
          {state === 'working' ? (
            <Skeleton className="mt-1.5 h-3.5 w-2/3 max-w-md" />
          ) : (
            <p className={cn('text-sm text-ink', !open && 'truncate')}>{headline}</p>
          )}
        </div>
        {!open && state === 'done' && (
          <div className="hidden items-center gap-1.5 lg:flex">
            {aiCategory && <Chip tone="slate" icon={Tag} size="sm">{aiCategory.name}</Chip>}
            {ticket.ai_priority && <Chip tone={PRIORITY_TONE[ticket.ai_priority]} icon={PRIORITY_META[ticket.ai_priority].icon} size="sm">{PRIORITY_META[ticket.ai_priority].label}</Chip>}
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={toggle} aria-expanded={open} aria-label={open ? 'Collapse AI triage' : 'Expand AI triage'} className="text-ink-2">
          {open ? <ChevronUp /> : <ChevronDown />}
          <span className="hidden sm:inline">{open ? 'Less' : 'Details'}</span>
        </Button>
      </div>

      {open && state !== 'working' && (
        <div className="space-y-4 border-t border-line px-4 py-4">
          {(state === 'failed' || state === 'limited') && (
            <div role="status" className="flex items-start gap-2 rounded-control border border-butter-line bg-butter px-3 py-2 text-[13px] text-butter-ink">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{ticket.ai_error || (state === 'limited' ? "Today's shared AI budget is used up. Category and priority come from keyword rules; the seeded content still works." : 'The AI could not be reached. Category and priority come from keyword rules.')}</span>
            </div>
          )}
          {lowConf && state === 'done' && (
            <div role="status" className="flex items-start gap-2 rounded-control border border-butter-line bg-butter px-3 py-2 text-[13px] text-butter-ink">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> The AI is unsure here. Check the category and priority before relying on them.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {ticket.ai_priority && <AiChip size="sm" icon={PRIORITY_META[ticket.ai_priority].icon}>Suggests {PRIORITY_META[ticket.ai_priority].label}</AiChip>}
                {aiCategory && <AiChip size="sm" icon={Tag}>{aiCategory.name}</AiChip>}
                {sentiment && ticket.sentiment && <Chip tone={SENTIMENT_TONE[ticket.sentiment]} icon={sentiment.icon} size="sm">{sentiment.label}</Chip>}
              </div>
              {conf !== null && state === 'done' && (
                <div className="max-w-xs">
                  <div className="mb-1 flex justify-between text-xs text-ink-3">
                    <span>Confidence</span>
                    <span className="font-semibold text-ink tabular-nums">{conf}%</span>
                  </div>
                  <ProgressBar value={conf} tone={conf >= 80 ? 'green' : conf >= 55 ? 'amber' : 'red'} size="sm" label="AI confidence" />
                </div>
              )}
              {ticket.ai_reasoning && (
                <div>
                  <p className="mb-1 text-xs font-medium text-ink-3"><AiBadgeInline>Why</AiBadgeInline></p>
                  <p className="text-[13px] leading-relaxed text-ink-2">{ticket.ai_reasoning}</p>
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-control border border-line bg-surface-2 p-3">
              <p className="text-xs font-medium text-ink-3">Your call always wins over the AI</p>
              <div className="grid grid-cols-2 gap-2">
                <MetaSelect
                  size="sm"
                  disabled={readOnly}
                  value={ticket.priority}
                  onChange={(v) => v && onUpdate({ priority: v as TicketPriority })}
                  options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label, tone: PRIORITY_META[p] }))}
                  className="w-full min-w-0"
                />
                <MetaSelect
                  size="sm"
                  disabled={readOnly}
                  value={ticket.category?.key ?? null}
                  onChange={(v) => v && onUpdate({ category: v })}
                  placeholder="Category"
                  options={categories.map((c) => ({ value: c.key, label: c.name, tone: categoryTone(c.key, c.name) }))}
                  className="w-full min-w-0"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {catOverridden && ticket.ai_category && (
                  <Button variant="outline" size="sm" disabled={readOnly} onClick={() => onUpdate({ category: ticket.ai_category!.key })}>
                    <WandSparkles /> Use AI category ({ticket.ai_category.name})
                  </Button>
                )}
                {priOverridden && ticket.ai_priority && (
                  <Button variant="outline" size="sm" disabled={readOnly} onClick={() => onUpdate({ priority: ticket.ai_priority as TicketPriority })}>
                    <WandSparkles /> Use AI priority ({PRIORITY_META[ticket.ai_priority].label})
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={onRerun} disabled={rerunning} className="ml-auto text-ink-2">
                  <RefreshCw className={cn(rerunning && 'animate-spin')} /> Re-run
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AiSurface>
  )
}
