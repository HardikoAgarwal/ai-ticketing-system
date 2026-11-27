import { CheckCheck, Clock, Sparkles, TriangleAlert, UserRound } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

import { RelativeTime } from '@/components/common'
import { Chip, ProgressBar } from '@/components/ds'
import { MetaSelect } from '@/components/MetaSelect'
import { categoryTone, PRIORITIES, PRIORITY_META, SENTIMENT_META, STATUS_META } from '@/lib/constants'
import type { Category, Member, StaffTicketDetail, TicketPriority, TicketStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

import { SENTIMENT_INK, slaView, TRANSITIONS } from './ticket-ui'
import type { TicketPatch } from './use-ticket'

/** The small capital label used above every fact on the ticket page (the same one the ticket cards in the list use). */
export const FACT_LABEL = 'text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase'

export function Fact({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className={FACT_LABEL}>{label}</dt>
      <dd className="mt-1.5">{children}</dd>
    </div>
  )
}

/**
 * The customer's mood as the AI read it: a soft pill in the mood's own colour with a small AI tag, shown wherever the
 * customer is summarised (the stub on the ticket header, the customer card in the details drawer).
 */
export function CustomerMood({ ticket, className }: { ticket: StaffTicketDetail; className?: string }) {
  if (!ticket.sentiment) return null
  const mood = SENTIMENT_META[ticket.sentiment]
  const MoodIcon = mood.icon
  return (
    <span
      className={cn('inline-flex h-6 max-w-full shrink-0 items-center gap-1.5 rounded-chip bg-surface/85 pr-1 pl-2 text-[12.5px] leading-4 font-semibold whitespace-nowrap', SENTIMENT_INK[ticket.sentiment], className)}
    >
      <MoodIcon className="size-4 shrink-0" aria-hidden />
      <span className="truncate">{mood.label}</span>
      <span className="ai-border inline-flex h-4.5 shrink-0 items-center gap-0.5 rounded-[5px] bg-surface px-1 text-[10.5px] font-bold text-lav-ink" title="Read by the AI">
        <Sparkles className="size-2.5 text-ai" aria-hidden /> AI
      </span>
    </span>
  )
}

export interface FieldsProps {
  categories: Category[]
  members: Member[]
  meId?: number
  readOnly: boolean
  onUpdate: (patch: TicketPatch) => void
  onAssign: (id: number | null) => void
}

/** The four things an agent can change about a ticket: status, priority, category and owner. Each is a select that wears the colour of its value. */
export function TicketFields({ ticket, categories, members, meId, readOnly, onUpdate, onAssign }: FieldsProps & { ticket: StaffTicketDetail }) {
  const trigger = 'h-9 w-full min-w-0'
  return (
    <>
      <Fact label="Status">
        <MetaSelect ariaLabel="Status" size="sm" disabled={readOnly} value={ticket.status} onChange={(v) => v && onUpdate({ status: v as TicketStatus })} options={TRANSITIONS[ticket.status].map((s) => ({ value: s, label: STATUS_META[s].label, tone: STATUS_META[s] }))} className={trigger} />
      </Fact>
      <Fact label="Priority">
        <MetaSelect ariaLabel="Priority" size="sm" disabled={readOnly} value={ticket.priority} onChange={(v) => v && onUpdate({ priority: v as TicketPriority })} options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label, tone: PRIORITY_META[p], ai: ticket.ai_priority === p }))} className={trigger} />
      </Fact>
      <Fact label="Category">
        <MetaSelect ariaLabel="Category" size="sm" disabled={readOnly} value={ticket.category?.key ?? null} onChange={(v) => v && onUpdate({ category: v })} placeholder="Choose" options={categories.map((c) => ({ value: c.key, label: c.name, tone: categoryTone(c.key, c.name), ai: ticket.ai_category?.key === c.key }))} className={trigger} />
      </Fact>
      <Fact label="Owner">
        <MetaSelect
          ariaLabel="Owner"
          size="sm"
          plain
          disabled={readOnly}
          value={ticket.assigned_to ? String(ticket.assigned_to.id) : null}
          onChange={(v) => onAssign(v ? Number(v) : null)}
          placeholder="Unassigned"
          anyLabel="Unassigned"
          options={members.map((m) => ({ value: String(m.id), label: m.id === meId ? `${m.full_name} (you)` : m.full_name, icon: UserRound }))}
          className={trigger}
        />
      </Fact>
    </>
  )
}

function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

/** The first-response clock: how long is left (or how late it is), with the share of the window already used; once answered, when. */
export function ResponseClock({ ticket }: { ticket: StaffTicketDetail }) {
  const now = useNow()
  const sla = slaView(ticket)
  if (ticket.sla_state === 'none') return <p className="flex h-9 items-center text-sm font-medium text-ink-3">No target</p>
  const start = Date.parse(ticket.created_at)
  const due = ticket.sla_due_at ? Date.parse(ticket.sla_due_at) : null
  const used = sla.waiting && due && due > start ? Math.min(100, Math.max(2, Math.round(((now - start) / (due - start)) * 100))) : null
  const Icon = sla.answered ? CheckCheck : ticket.sla_state === 'overdue' ? TriangleAlert : Clock
  return (
    <div className="flex h-9 flex-col justify-center gap-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <Chip tone={sla.tone} icon={Icon} size="sm">{sla.text}</Chip>
        {sla.answered && <RelativeTime value={ticket.first_response_at} className="truncate text-xs text-ink-3" />}
      </div>
      {used !== null && <ProgressBar value={used} size="sm" tone={ticket.sla_state === 'overdue' ? 'red' : ticket.sla_state === 'at_risk' ? 'amber' : 'green'} label="Share of the first-response window used" />}
    </div>
  )
}
