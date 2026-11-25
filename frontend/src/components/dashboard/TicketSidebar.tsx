import { AlertTriangle, Bot, Building2, History, Loader2, Mail, Package, RefreshCw, Sparkles, Tag, Ticket as TicketIcon, UserCheck, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { RelativeTime } from '@/components/common'
import { Chip, type ChipTone } from '@/components/dashboard/Chip'
import { Surface } from '@/components/dashboard/surface'
import { MetaSelect } from '@/components/MetaSelect'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { categoryTone, PRIORITIES, PRIORITY_META, SENTIMENT_META, STATUS_META } from '@/lib/constants'
import { formatDate, formatValue, initials, labelize } from '@/lib/format'
import type { Activity, Category, Member, SimilarTicket, StaffTicketDetail, TicketPriority, TicketStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

/* The panels below fill the ticket page's tabs. Each is a plain neutral card; equal-height rows use `h-full`. */

const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['RESOLVED', 'IN_PROGRESS', 'CLOSED'],
  CLOSED: ['CLOSED', 'IN_PROGRESS'],
}

function Panel({ title, icon: Icon, hint, right, children, className }: { title: string; icon: LucideIcon; hint?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Surface className={cn('flex h-full flex-col', className)}>
      <header className="flex min-h-14 items-center gap-3 border-b border-border px-5 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
      </header>
      <div className="flex-1 p-5">{children}</div>
    </Surface>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{children}</dd>
    </div>
  )
}

function ActivityList({ items }: { items: Activity[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Nothing has changed on this ticket yet.</p>
  return (
    <ol className="relative space-y-5 border-l border-border pl-6">
      {[...items].reverse().map((a) => (
        <li key={a.id} className="relative text-sm">
          <span className="absolute top-1.5 -left-[29px] size-2.5 rounded-full border-2 border-card bg-muted-foreground/50" />
          <p className="leading-snug">
            <span className="font-medium">{a.label}</span>
            {(a.from_value || a.to_value) && (
              <span className="text-muted-foreground">
                {a.from_value ? ` ${a.from_value} → ` : ' '}
                {a.to_value}
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {a.actor_name ?? 'System'} · <RelativeTime value={a.created_at} />
          </p>
        </li>
      ))}
    </ol>
  )
}

/** Details tab: workflow controls and the customer side by side (equal height), then the linked record. */
export function DetailsTab({
  ticket,
  categories,
  members,
  meId,
  saving,
  onUpdate,
  onAssign,
}: {
  ticket: StaffTicketDetail
  categories: Category[]
  members: Member[]
  meId?: number
  saving: boolean
  onUpdate: (data: { status?: TicketStatus; priority?: TicketPriority; category?: string; assigned_to?: number | null }) => void
  onAssign: (value: string | null) => void
}) {
  const record = ticket.record_detail
  const rp = ticket.requester_profile
  return (
    <div className="grid items-stretch gap-4 lg:grid-cols-2">
      <Panel title="Workflow" icon={UserCheck} hint="Your changes always win over AI suggestions.">
        <div className="space-y-4">
          <Field label="Status">
            <MetaSelect value={ticket.status} onChange={(v) => v && onUpdate({ status: v as TicketStatus })} options={TRANSITIONS[ticket.status].map((s) => ({ value: s, label: STATUS_META[s].label, tone: STATUS_META[s] }))} className="w-full" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority">
              <MetaSelect value={ticket.priority} onChange={(v) => v && onUpdate({ priority: v as TicketPriority })} options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label, tone: PRIORITY_META[p] }))} className="w-full min-w-0" />
            </Field>
            <Field label="Category">
              <MetaSelect value={ticket.category?.key ?? null} onChange={(v) => v && onUpdate({ category: v })} placeholder="Choose" options={categories.map((c) => ({ value: c.key, label: c.name, tone: categoryTone(c.key, c.name) }))} className="w-full min-w-0" />
            </Field>
          </div>
          <Field label="Assignee">
            <div className="flex gap-2">
              <MetaSelect
                value={ticket.assigned_to ? String(ticket.assigned_to.id) : null}
                onChange={onAssign}
                placeholder="Unassigned"
                anyLabel="Unassigned"
                plain
                options={members.map((m) => ({ value: String(m.id), label: m.id === meId ? `${m.full_name} (you)` : m.full_name, icon: UserRound }))}
                className="min-w-0 flex-1"
              />
              {ticket.assigned_to?.id !== meId && (
                <Button variant="outline" onClick={() => onUpdate({ assigned_to: meId })} disabled={saving}>
                  Take
                </Button>
              )}
            </div>
          </Field>
          {saving && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Saving…
            </p>
          )}
        </div>
      </Panel>

      <Panel title="Customer" icon={UserRound} hint="Who opened this ticket.">
        <div className="flex items-center gap-3.5">
          <Avatar className="size-12">
            <AvatarFallback className="bg-muted text-base font-semibold">{initials(rp.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{rp.name}</p>
            <a href={`mailto:${rp.email}`} className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <Mail className="size-3.5 shrink-0" /> <span className="truncate">{rp.email}</span>
            </a>
          </div>
        </div>
        <dl className="mt-3 divide-y divide-border">
          {rp.company && (
            <Row label="Company">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="size-3.5 text-muted-foreground" /> {rp.company}
              </span>
            </Row>
          )}
          {Object.entries(rp.profile).map(([k, v]) => (
            <Row key={k} label={labelize(k)}>
              {formatValue(v)}
            </Row>
          ))}
          <Row label="Customer since">{rp.joined ? formatDate(rp.joined) : '—'}</Row>
          <Row label="Tickets">
            <span className="inline-flex items-center gap-1.5">
              <TicketIcon className="size-3.5 text-muted-foreground" /> {rp.tickets_count}
            </span>
          </Row>
        </dl>
      </Panel>

      {record && (
        <Panel title={record.kind} icon={Package} hint="The exact facts the AI is allowed to quote in drafts." className="lg:col-span-2">
          <p className="text-sm font-semibold">{record.title}</p>
          <p className="text-xs text-muted-foreground">
            {record.reference}
            {record.status && ` · ${record.status}`}
          </p>
          <dl className="mt-3 grid gap-x-10 divide-y divide-border sm:grid-cols-2 sm:divide-y-0">
            {Object.entries(record.data).map(([k, v]) => (
              <Row key={k} label={labelize(k)}>
                {formatValue(v)}
              </Row>
            ))}
          </dl>
        </Panel>
      )}
    </div>
  )
}

/** AI tab: what the AI decided, how sure it is and why. */
export function AiTab({ ticket, onRerun, rerunning }: { ticket: StaffTicketDetail; onRerun: () => void; rerunning: boolean }) {
  const pending = ticket.ai_status === 'PENDING'
  const failed = ticket.ai_status === 'FAILED'
  const disabled = ticket.ai_status === 'DISABLED'
  const overridden =
    (ticket.category_source === 'STAFF' && ticket.ai_category && ticket.ai_category.id !== ticket.category?.id) ||
    (ticket.priority_source === 'STAFF' && ticket.ai_priority && ticket.ai_priority !== ticket.priority)
  const conf = ticket.ai_confidence !== null ? Math.round(ticket.ai_confidence * 100) : null
  const aiCategory = ticket.ai_category ?? ticket.category
  const sentiment = ticket.sentiment ? SENTIMENT_META[ticket.sentiment] : null
  const sentimentTone: Record<string, ChipTone> = { NEGATIVE: 'red', NEUTRAL: 'slate', POSITIVE: 'green' }

  return (
    <Panel
      title="AI triage"
      icon={Sparkles}
      hint="The AI suggests a category, urgency and mood the moment a ticket arrives. Override any of it from the Details tab."
      right={
        !disabled && (
          <Button variant="outline" size="sm" onClick={onRerun} disabled={rerunning || pending} aria-label="Re-run AI triage">
            <RefreshCw className={cn((rerunning || pending) && 'animate-spin')} /> Re-run
          </Button>
        )
      }
    >
      {pending ? (
        <div className="max-w-xl space-y-2">
          <div className="ai-shimmer h-3 w-1/2 rounded-md" />
          <div className="ai-shimmer h-3 w-full rounded-md" />
          <div className="ai-shimmer h-3 w-3/4 rounded-md" />
        </div>
      ) : disabled ? (
        <p className="text-sm text-muted-foreground">AI is off for this workspace. Triage uses keyword rules.</p>
      ) : (
        <div className="max-w-3xl space-y-5 text-sm">
          {failed && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {ticket.ai_error || 'AI unavailable. Showing rule-based triage.'}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {aiCategory && <Chip tone="slate" icon={Tag}>{aiCategory.name}</Chip>}
            {ticket.ai_priority && <Chip tone={ticket.ai_priority === 'CRITICAL' ? 'red' : ticket.ai_priority === 'HIGH' ? 'amber' : 'blue'} icon={PRIORITY_META[ticket.ai_priority].icon}>{PRIORITY_META[ticket.ai_priority].label}</Chip>}
            {sentiment && ticket.sentiment && <Chip tone={sentimentTone[ticket.sentiment] ?? 'slate'} icon={sentiment.icon}>{sentiment.label}</Chip>}
            {overridden && <Chip tone="green" icon={UserCheck}>Overridden by team</Chip>}
          </div>
          {ticket.ai_summary && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Summary</p>
              <p className="leading-relaxed">{ticket.ai_summary}</p>
            </div>
          )}
          {conf !== null && (
            <div className="max-w-sm">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Confidence</span>
                <span className="font-semibold text-foreground tabular-nums">{conf}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-sm bg-muted" role="progressbar" aria-valuenow={conf} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-sm bg-primary" style={{ width: `${conf}%` }} />
              </div>
            </div>
          )}
          {ticket.ai_reasoning && (
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Bot className="size-3.5" /> Why the AI chose this
              </p>
              <p className="leading-relaxed text-foreground/85">{ticket.ai_reasoning}</p>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}

/** Similar tab: other tickets in the workspace with a near-identical message. */
export function SimilarTab({ similar, slug }: { similar: SimilarTicket[]; slug: string }) {
  return (
    <Panel title="Possible duplicates" icon={TicketIcon} hint="Tickets in this workspace with a very similar message.">
      {similar.length === 0 ? (
        <p className="text-sm text-muted-foreground">No similar tickets found.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {similar.map((s) => (
            <li key={s.id}>
              <Link to={`/w/${slug}/agent/tickets/${s.id}`} className="block h-full rounded-lg border border-border p-4 text-sm transition-colors hover:bg-muted/50">
                <p className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{s.reference}</span>
                  <Chip tone="violet" size="sm">{Math.round(s.similarity * 100)}% similar</Chip>
                </p>
                <p className="mt-2 line-clamp-2 font-medium">{s.subject}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/** Activity tab: every change and who made it. */
export function ActivityTab({ ticket }: { ticket: StaffTicketDetail }) {
  return (
    <Panel title="Activity" icon={History} hint="Every change to this ticket and who made it.">
      <ActivityList items={ticket.activities} />
    </Panel>
  )
}
