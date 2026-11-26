import { Activity as ActivityIcon, Building2, ChevronDown, CircleUserRound, Loader2, Lock, Mail, NotebookPen, Package, SearchX, SlidersHorizontal, Sparkles, UserRound, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { RelativeTime } from '@/components/common'
import { Avatar, Chip, ErrorState, KeyValue, KeyValueList, SkeletonRows } from '@/components/ds'
import { MetaSelect } from '@/components/MetaSelect'
import { Button } from '@/components/ui/button'
import { categoryTone, PRIORITIES, PRIORITY_META, STATUS_META } from '@/lib/constants'
import { formatDate, formatDateTime, formatValue, labelize } from '@/lib/format'
import type { DraftResponse, Member, StaffTicketDetail, TicketPriority, TicketStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

import { NowCard } from './NowCard'
import { STATUS_TONE } from './ticket-ui'
import type { TicketPatch, TicketState } from './use-ticket'

const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['RESOLVED', 'IN_PROGRESS', 'CLOSED'],
  CLOSED: ['CLOSED', 'IN_PROGRESS'],
}

const KEY = 'helpdesk.ticket.rail.sections'
const readSections = (): Record<string, boolean> => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, boolean>
  } catch {
    return {}
  }
}

/** One collapsible block of the side panel. Open state is remembered per section. */
function RailSection({ id, title, icon: Icon, count, children, open, onToggle }: {
  id: string
  title: string
  icon: LucideIcon
  count?: number
  children: ReactNode
  open: boolean
  onToggle: (id: string, next: boolean) => void
}) {
  return (
    <section aria-labelledby={`rail-${id}`} className="border-b border-line last:border-b-0">
      <h3 id={`rail-${id}`}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`rail-body-${id}`}
          onClick={() => onToggle(id, !open)}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] font-semibold text-ink hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-violet"
        >
          <Icon className="size-4 text-ink-3" aria-hidden />
          <span className="flex-1">{title}</span>
          {count !== undefined && count > 0 && <span className="rounded-chip bg-sunken px-1.5 text-xs font-semibold text-ink-2 tabular-nums">{count}</span>}
          <ChevronDown className={cn('size-4 text-ink-3 transition-transform', !open && '-rotate-90')} aria-hidden />
        </button>
      </h3>
      {open && <div id={`rail-body-${id}`} className="px-4 pb-4">{children}</div>}
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-ink-3">{label}</p>
      {children}
    </div>
  )
}

/**
 * The right-hand panel, in the order you need it: what matters now, the customer, the ticket's own fields, then similar tickets, activity and notes.
 * Everything is visible by scrolling; nothing is hidden behind tabs.
 */
export function Rail({ ticket, t, draft, meId, readOnly, busy, onAddNote, onShowNotes, onAssign }: {
  ticket: StaffTicketDetail
  t: TicketState
  draft?: DraftResponse
  meId?: number
  readOnly: boolean
  busy: boolean
  onAddNote: () => void
  onShowNotes: () => void
  onAssign: (id: number | null) => void
}) {
  const [stored, setStored] = useState(readSections)
  const rp = ticket.requester_profile
  const record = ticket.record_detail
  const similar = t.similar.data ?? []
  const notes = ticket.messages.filter((m) => m.is_internal)
  const activity = [...ticket.activities].reverse().slice(0, 8)
  const isOpen = (id: string, dflt: boolean) => stored[id] ?? dflt
  const toggle = (id: string, next: boolean) =>
    setStored((s) => {
      const out = { ...s, [id]: next }
      try {
        localStorage.setItem(KEY, JSON.stringify(out))
      } catch {
        /* ignore */
      }
      return out
    })
  const update = (patch: TicketPatch) => t.update.mutate(patch)

  return (
    <div className="flex min-h-0 flex-col">
      <div className="p-3">
        <NowCard ticket={ticket} draft={draft} meId={meId} readOnly={readOnly} rerunning={t.rerun.isPending} onRerun={() => t.rerun.mutate()} onUpdate={update} />
      </div>

      <RailSection id="customer" title="Customer" icon={CircleUserRound} open={isOpen('customer', true)} onToggle={toggle}>
        <div className="flex items-center gap-3">
          <Avatar name={rp.name} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{rp.name}</p>
            <a href={`mailto:${rp.email}`} className="flex min-w-0 items-center gap-1.5 text-xs text-ink-3 hover:text-ink">
              <Mail className="size-3 shrink-0" aria-hidden /> <span className="truncate">{rp.email}</span>
            </a>
          </div>
        </div>
        {rp.company && <Chip tone="slate" icon={Building2} size="sm" className="mt-3">{rp.company}</Chip>}
        <KeyValueList columns={2} className="mt-4">
          <KeyValue label="Tickets">{rp.tickets_count}</KeyValue>
          <KeyValue label="Customer since">{rp.joined ? formatDate(rp.joined) : '—'}</KeyValue>
          {Object.entries(rp.profile).map(([k, v]) => <KeyValue key={k} label={labelize(k)}>{formatValue(v)}</KeyValue>)}
        </KeyValueList>
        {record && (
          <div className="mt-4 rounded-control border border-line bg-surface-2 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-2">
              <Package className="size-3.5" aria-hidden /> {record.kind} <Chip tone="ai" icon={Sparkles} size="sm" className="ml-auto">Used by AI</Chip>
            </p>
            <p className="mt-1.5 text-sm font-medium text-ink">{record.title}</p>
            <p className="text-xs text-ink-3">{record.reference}{record.status && ` · ${record.status}`}</p>
            <KeyValueList columns={2} className="mt-3">
              {Object.entries(record.data).map(([k, v]) => <KeyValue key={k} label={labelize(k)}>{formatValue(v)}</KeyValue>)}
            </KeyValueList>
          </div>
        )}
      </RailSection>

      <RailSection id="details" title="Ticket details" icon={SlidersHorizontal} open={isOpen('details', true)} onToggle={toggle}>
        <div className="grid gap-3">
          <Field label="Status">
            <MetaSelect disabled={readOnly} value={ticket.status} onChange={(v) => v && update({ status: v as TicketStatus })} options={TRANSITIONS[ticket.status].map((s) => ({ value: s, label: STATUS_META[s].label, tone: STATUS_META[s] }))} className="w-full" />
          </Field>
          <Field label="Priority">
            <MetaSelect disabled={readOnly} value={ticket.priority} onChange={(v) => v && update({ priority: v as TicketPriority })} options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label, tone: PRIORITY_META[p] }))} className="w-full" />
          </Field>
          <Field label="Category">
            <MetaSelect disabled={readOnly} value={ticket.category?.key ?? null} onChange={(v) => v && update({ category: v })} placeholder="Choose" options={t.categories.map((c) => ({ value: c.key, label: c.name, tone: categoryTone(c.key, c.name) }))} className="w-full" />
          </Field>
          <Field label="Owner">
            <div className="flex gap-2">
              <MetaSelect
                disabled={readOnly}
                value={ticket.assigned_to ? String(ticket.assigned_to.id) : null}
                onChange={(v) => onAssign(v ? Number(v) : null)}
                placeholder="Unassigned"
                anyLabel="Unassigned"
                plain
                options={t.members.map((m: Member) => ({ value: String(m.id), label: m.id === meId ? `${m.full_name} (you)` : m.full_name, icon: UserRound }))}
                className="min-w-0 flex-1"
              />
              {ticket.assigned_to?.id !== meId && <Button variant="outline" onClick={() => update({ assigned_to: meId })} disabled={busy || readOnly}>Take</Button>}
            </div>
          </Field>
          {busy && <p role="status" className="flex items-center gap-1.5 text-xs text-ink-3"><Loader2 className="size-3 animate-spin" aria-hidden /> Saving…</p>}
        </div>
        <KeyValueList columns={2} className="mt-4">
          <KeyValue label="Opened">{formatDateTime(ticket.created_at)}</KeyValue>
          <KeyValue label="Last update"><RelativeTime value={ticket.updated_at} /></KeyValue>
          <KeyValue label="First response">{ticket.first_response_at ? formatDateTime(ticket.first_response_at) : 'Not yet'}</KeyValue>
          <KeyValue label="Resolved">{ticket.resolved_at ? formatDateTime(ticket.resolved_at) : '—'}</KeyValue>
          <KeyValue label="Satisfaction">{ticket.csat_score ? `${ticket.csat_score} / 5` : 'Not rated'}</KeyValue>
        </KeyValueList>
        {ticket.csat_comment && <p className="mt-3 rounded-control bg-surface-2 px-3 py-2 text-[13px] text-ink-2">“{ticket.csat_comment}”</p>}
      </RailSection>

      <RailSection id="similar" title="Similar tickets" icon={SearchX} count={similar.length} open={isOpen('similar', similar.length > 0)} onToggle={toggle}>
        {t.similar.isLoading ? (
          <SkeletonRows rows={2} />
        ) : t.similar.isError ? (
          <ErrorState error={t.similar.error} title="Couldn't look for similar tickets" onRetry={() => t.similar.refetch()} />
        ) : similar.length === 0 ? (
          <p className="text-[13px] text-ink-3">Nothing similar, so this is probably not a duplicate.</p>
        ) : (
          <ul className="space-y-2">
            {similar.map((s) => (
              <li key={s.id}>
                <Link to={`/w/${t.slug}/agent/tickets/${s.id}`} className="block rounded-control border border-line bg-surface p-3 text-sm transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-violet">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-ink-3">{s.reference}</span>
                    <span className="flex items-center gap-1.5">
                      <Chip tone={STATUS_TONE[s.status]} size="sm">{STATUS_META[s.status].label}</Chip>
                      <Chip tone="ai" size="sm">{Math.round(s.similarity * 100)}%</Chip>
                    </span>
                  </span>
                  <span className="mt-1.5 line-clamp-2 block font-medium text-ink [overflow-wrap:anywhere]">{s.subject}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </RailSection>

      <RailSection id="notes" title="Team notes" icon={Lock} count={notes.length} open={isOpen('notes', notes.length > 0)} onToggle={toggle}>
        {notes.length === 0 ? (
          <p className="text-[13px] text-ink-3">Leave context for teammates: what you checked, who you asked, what is next.</p>
        ) : (
          <ul className="space-y-2">
            {notes.slice(-3).map((n) => (
              <li key={n.id} className="rounded-control border border-butter-line bg-butter px-3 py-2">
                <p className="flex items-center gap-1.5 text-xs"><span className="font-semibold text-ink">{n.sender_name}</span> <RelativeTime value={n.created_at} className="ml-auto text-ink-3" /></p>
                <p className="mt-1 line-clamp-3 text-[13px] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap text-butter-ink">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" onClick={onAddNote} disabled={readOnly}><NotebookPen /> Add note</Button>
          {notes.length > 0 && <Button size="sm" variant="ghost" onClick={onShowNotes}>Show in conversation</Button>}
        </div>
      </RailSection>

      <RailSection id="activity" title="Activity" icon={ActivityIcon} count={ticket.activities.length} open={isOpen('activity', false)} onToggle={toggle}>
        {activity.length === 0 ? (
          <p className="text-[13px] text-ink-3">Assignments, status changes and AI triage will appear here.</p>
        ) : (
          <ol>
            {activity.map((a, i) => (
              <li key={a.id} className="flex gap-3 text-sm">
                <div className="flex w-3 shrink-0 flex-col items-center" aria-hidden>
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-violet ring-4 ring-violet-soft" />
                  {i < activity.length - 1 && <span className="my-1 w-px flex-1 bg-line" />}
                </div>
                <div className={cn('min-w-0 flex-1', i < activity.length - 1 && 'pb-3.5')}>
                  <p className="text-[13px] leading-snug [overflow-wrap:anywhere]">
                    <span className="font-medium text-ink">{a.label}</span>
                    {(a.from_value || a.to_value) && <span className="text-ink-3">{a.from_value ? ` ${a.from_value} → ` : ' '}{a.to_value}</span>}
                  </p>
                  <p className="text-xs text-ink-3">{a.actor_name ?? 'System'} · <RelativeTime value={a.created_at} /></p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </RailSection>
    </div>
  )
}
