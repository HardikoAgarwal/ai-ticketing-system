import { Activity as ActivityIcon, Building2, Loader2, Lock, Mail, NotebookPen, Package, SearchX, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { RelativeTime } from '@/components/common'
import { AiBadgeInline, Avatar, Chip, EmptyState, ErrorState, KeyValue, KeyValueList, Section, SkeletonRows } from '@/components/ds'
import { MetaSelect } from '@/components/MetaSelect'
import { Button } from '@/components/ui/button'
import { categoryTone, PRIORITIES, PRIORITY_META, STATUS_META } from '@/lib/constants'
import { formatDate, formatDateTime, formatValue, labelize } from '@/lib/format'
import type { Category, Member, SimilarTicket, StaffTicketDetail, TicketPriority, TicketStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

import { STATUS_TONE } from './ticket-ui'
import type { TicketPatch } from './use-ticket'

const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['RESOLVED', 'IN_PROGRESS', 'CLOSED'],
  CLOSED: ['CLOSED', 'IN_PROGRESS'],
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-ink-3">{label}</p>
      {children}
    </div>
  )
}

const Scroll = ({ children }: { children: ReactNode }) => <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto bg-surface">{children}</div>

/** Details: workflow controls, the customer, the linked record and timing. Everything the context rail shows, for narrow screens too. */
export function DetailsTab({ ticket, categories, members, meId, saving, readOnly, onUpdate, onAssign }: {
  ticket: StaffTicketDetail
  categories: Category[]
  members: Member[]
  meId?: number
  saving: boolean
  readOnly: boolean
  onUpdate: (patch: TicketPatch) => void
  onAssign: (id: number | null) => void
}) {
  const record = ticket.record_detail
  const rp = ticket.requester_profile
  return (
    <Scroll>
      <Section first title="Workflow" description="Your changes always win over AI suggestions." actions={saving ? <span className="flex items-center gap-1.5 text-xs text-ink-3" role="status"><Loader2 className="size-3 animate-spin" aria-hidden /> Saving…</span> : undefined}>
        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <Field label="Status">
            <MetaSelect disabled={readOnly} value={ticket.status} onChange={(v) => v && onUpdate({ status: v as TicketStatus })} options={TRANSITIONS[ticket.status].map((s) => ({ value: s, label: STATUS_META[s].label, tone: STATUS_META[s] }))} className="w-full" />
          </Field>
          <Field label="Priority">
            <MetaSelect disabled={readOnly} value={ticket.priority} onChange={(v) => v && onUpdate({ priority: v as TicketPriority })} options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label, tone: PRIORITY_META[p] }))} className="w-full" />
          </Field>
          <Field label="Category">
            <MetaSelect disabled={readOnly} value={ticket.category?.key ?? null} onChange={(v) => v && onUpdate({ category: v })} placeholder="Choose" options={categories.map((c) => ({ value: c.key, label: c.name, tone: categoryTone(c.key, c.name) }))} className="w-full" />
          </Field>
          <Field label="Assignee">
            <div className="flex gap-2">
              <MetaSelect
                disabled={readOnly}
                value={ticket.assigned_to ? String(ticket.assigned_to.id) : null}
                onChange={(v) => onAssign(v ? Number(v) : null)}
                placeholder="Unassigned"
                anyLabel="Unassigned"
                plain
                options={members.map((m) => ({ value: String(m.id), label: m.id === meId ? `${m.full_name} (you)` : m.full_name, icon: UserRound }))}
                className="min-w-0 flex-1"
              />
              {ticket.assigned_to?.id !== meId && <Button variant="outline" onClick={() => onUpdate({ assigned_to: meId })} disabled={saving || readOnly}>Take</Button>}
            </div>
          </Field>
        </div>
      </Section>

      <Section title="Customer">
        <div className="mb-4 flex items-center gap-3.5">
          <Avatar name={rp.name} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-ink">{rp.name}</p>
            <a href={`mailto:${rp.email}`} className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-ink-3 hover:text-ink">
              <Mail className="size-3.5 shrink-0" aria-hidden /> <span className="truncate">{rp.email}</span>
            </a>
          </div>
          {rp.company && <Chip tone="slate" icon={Building2} className="ml-auto hidden sm:inline-flex">{rp.company}</Chip>}
        </div>
        <KeyValueList columns={3}>
          {Object.entries(rp.profile).map(([k, v]) => <KeyValue key={k} label={labelize(k)}>{formatValue(v)}</KeyValue>)}
          <KeyValue label="Customer since">{rp.joined ? formatDate(rp.joined) : '—'}</KeyValue>
          <KeyValue label="Tickets">{rp.tickets_count}</KeyValue>
        </KeyValueList>
      </Section>

      {record && (
        <Section title={record.kind} description="The exact facts the AI is allowed to quote in drafts." actions={<Chip tone="ai" icon={Package} size="sm">Used by AI</Chip>}>
          <p className="text-sm font-semibold text-ink">{record.title}</p>
          <p className="mb-3 text-xs text-ink-3">{record.reference}{record.status && ` · ${record.status}`}</p>
          <KeyValueList columns={3}>
            {Object.entries(record.data).map(([k, v]) => <KeyValue key={k} label={labelize(k)}>{formatValue(v)}</KeyValue>)}
          </KeyValueList>
        </Section>
      )}

      <Section title="Timing">
        <KeyValueList columns={3}>
          <KeyValue label="Created">{formatDateTime(ticket.created_at)}</KeyValue>
          <KeyValue label="Last update"><RelativeTime value={ticket.updated_at} /></KeyValue>
          <KeyValue label="First response">{ticket.first_response_at ? formatDateTime(ticket.first_response_at) : 'Not yet'}</KeyValue>
          <KeyValue label="Response due">{ticket.sla_due_at ? formatDateTime(ticket.sla_due_at) : '—'}</KeyValue>
          <KeyValue label="Resolved">{ticket.resolved_at ? formatDateTime(ticket.resolved_at) : '—'}</KeyValue>
          <KeyValue label="Satisfaction">{ticket.csat_score ? `${ticket.csat_score} / 5` : 'Not rated'}</KeyValue>
        </KeyValueList>
        {ticket.csat_comment && <p className="mt-3 rounded-control bg-surface-2 px-3 py-2 text-[13px] text-ink-2">“{ticket.csat_comment}”</p>}
      </Section>
    </Scroll>
  )
}

/** Similar: tickets with a near-identical message (found by AI embeddings). */
export function SimilarTab({ slug, query }: { slug: string; query: { data?: SimilarTicket[]; isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown } }) {
  return (
    <Scroll>
      <Section first title="Possible duplicates" description="Tickets in this workspace with a very similar message." actions={<AiBadgeInline>Found by AI</AiBadgeInline>}>
        {query.isLoading ? (
          <SkeletonRows rows={3} />
        ) : query.isError ? (
          <ErrorState error={query.error} title="Couldn't look for similar tickets" onRetry={() => query.refetch()} />
        ) : !query.data?.length ? (
          <EmptyState icon={SearchX} title="Nothing similar" description="No other ticket looks like this one, so it is probably not a duplicate." />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {query.data.map((s) => (
              <li key={s.id}>
                <Link to={`/w/${slug}/agent/tickets/${s.id}`} className="block h-full rounded-panel border border-line bg-surface p-4 text-sm transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-violet">
                  <p className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-ink-3">{s.reference}</span>
                    <span className="flex items-center gap-1.5">
                      <Chip tone={STATUS_TONE[s.status]} size="sm">{STATUS_META[s.status].label}</Chip>
                      <Chip tone="ai" size="sm">{Math.round(s.similarity * 100)}% similar</Chip>
                    </span>
                  </p>
                  <p className="mt-2 line-clamp-2 font-medium text-ink [overflow-wrap:anywhere]">{s.subject}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </Scroll>
  )
}

/** Activity: every change and who made it, as a timeline. */
export function ActivityTab({ ticket }: { ticket: StaffTicketDetail }) {
  const list = [...ticket.activities].reverse()
  return (
    <Scroll>
      <Section first title="Activity" description="Every change to this ticket and who made it.">
        {list.length === 0 ? (
          <EmptyState icon={ActivityIcon} title="Nothing has changed yet" description="Assignments, status changes and AI triage will appear here." />
        ) : (
          <ol>
            {list.map((a, i) => (
              <li key={a.id} className="flex gap-3.5 text-sm">
                <div className="flex w-4 shrink-0 flex-col items-center" aria-hidden>
                  <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-violet ring-4 ring-violet-soft" />
                  {i < list.length - 1 && <span className="my-1 w-px flex-1 bg-line" />}
                </div>
                <div className={cn('min-w-0 flex-1', i < list.length - 1 && 'pb-5')}>
                  <p className="leading-snug [overflow-wrap:anywhere]">
                    <span className="font-medium text-ink">{a.label}</span>
                    {(a.from_value || a.to_value) && <span className="text-ink-3">{a.from_value ? ` ${a.from_value} → ` : ' '}{a.to_value}</span>}
                  </p>
                  <p className="text-xs text-ink-3">{a.actor_name ?? 'System'} · <RelativeTime value={a.created_at} /></p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </Scroll>
  )
}

/** Notes: the team-only messages, collected in one place. */
export function NotesTab({ ticket, onAdd }: { ticket: StaffTicketDetail; onAdd: () => void }) {
  const notes = ticket.messages.filter((m) => m.is_internal)
  return (
    <Scroll>
      <Section first title="Internal notes" description="Only your team can see these." actions={<Button size="sm" variant="outline" onClick={onAdd}><NotebookPen /> Add note</Button>}>
        {notes.length === 0 ? (
          <EmptyState icon={Lock} title="No notes yet" description="Leave context for teammates: what you checked, who you asked, what is next." action={<Button size="sm" onClick={onAdd}><NotebookPen /> Add the first note</Button>} />
        ) : (
          <ul className="space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="rounded-panel border border-butter-line bg-butter px-4 py-3">
                <div className="mb-1.5 flex items-center gap-2 text-xs">
                  <Avatar name={n.sender_name} size="xs" />
                  <span className="font-semibold text-ink">{n.sender_name}</span>
                  <RelativeTime value={n.created_at} className="ml-auto text-ink-3" />
                </div>
                <p className="text-[15px] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap text-butter-ink">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </Scroll>
  )
}
