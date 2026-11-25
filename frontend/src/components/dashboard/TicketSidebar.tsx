import { AlertTriangle, Bot, Copy, History, Loader2, Package, RefreshCw, Sparkles, UserCheck, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { CategoryBadge, PriorityBadge, SentimentBadge } from '@/components/badges'
import { RelativeTime } from '@/components/common'
import { Surface, SurfaceHeader } from '@/components/dashboard/surface'
import { MetaSelect } from '@/components/MetaSelect'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { categoryTone, PRIORITIES, PRIORITY_META, STATUS_META } from '@/lib/constants'
import { formatValue, labelize } from '@/lib/format'
import type { Activity, Category, Member, SimilarTicket, StaffTicketDetail, TicketPriority, TicketStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

export type SidebarTab = 'workflow' | 'ai' | 'activity'

const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['RESOLVED', 'IN_PROGRESS', 'CLOSED'],
  CLOSED: ['CLOSED', 'IN_PROGRESS'],
}

const SECTION_TONE = { Workflow: 'emerald', Activity: 'slate', 'Possible duplicates': 'amber' } as const

function Section({ title, icon, hint, children, tone }: { title: string; icon: ReactNode; hint?: string; children: ReactNode; tone?: 'slate' | 'violet' | 'blue' | 'emerald' | 'amber' }) {
  return (
    <Surface>
      <SurfaceHeader icon={icon} title={title} tone={tone ?? (SECTION_TONE as Record<string, 'slate' | 'emerald' | 'amber'>)[title] ?? 'blue'} as="h3" />
      <div className="p-4 sm:p-5">
        {hint && <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">{hint}</p>}
        {children}
      </div>
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

function ActivityList({ items }: { items: Activity[] }) {
  return (
    <ol className="relative space-y-4 border-l pl-5">
      {[...items].reverse().map((a) => (
        <li key={a.id} className="relative text-sm">
          <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-card bg-muted-foreground/50" />
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

export function TicketSidebar({
  ticket,
  tab,
  onTab,
  categories,
  members,
  similar,
  slug,
  meId,
  saving,
  onUpdate,
  onAssign,
  onRerun,
  rerunning,
  className,
}: {
  ticket: StaffTicketDetail
  tab: SidebarTab
  onTab: (t: SidebarTab) => void
  categories: Category[]
  members: Member[]
  similar: SimilarTicket[]
  slug: string
  meId?: number
  saving: boolean
  onUpdate: (data: { status?: TicketStatus; priority?: TicketPriority; category?: string; assigned_to?: number | null }) => void
  onAssign: (value: string | null) => void
  onRerun: () => void
  rerunning: boolean
  className?: string
}) {
  const record = ticket.record_detail
  const pending = ticket.ai_status === 'PENDING'
  const failed = ticket.ai_status === 'FAILED'
  const disabled = ticket.ai_status === 'DISABLED'
  const overridden =
    (ticket.category_source === 'STAFF' && ticket.ai_category && ticket.ai_category.id !== ticket.category?.id) ||
    (ticket.priority_source === 'STAFF' && ticket.ai_priority && ticket.ai_priority !== ticket.priority)

  return (
    <Tabs value={tab} onValueChange={(v) => onTab(v as SidebarTab)} className={cn('gap-4', className)}>
      <TabsList className="grid h-11 w-full grid-cols-3 rounded-xl bg-card p-1 shadow-sm ring-1 ring-border">
        <TabsTrigger value="workflow">Workflow</TabsTrigger>
        <TabsTrigger value="ai">
          <Sparkles className="size-3.5" /> AI
        </TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>

      <TabsContent value="workflow" className="space-y-4">
        <Section title="Workflow" icon={<UserCheck className="size-4" />} hint="Change who owns this ticket and how urgent it is. Your changes always win over AI suggestions.">
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
        </Section>

        {record && (
          <Section title={record.kind} icon={<Package className="size-4" />} tone="blue">
            <p className="text-sm font-semibold">{record.title}</p>
            <p className="text-xs text-muted-foreground">
              {record.reference}
              {record.status && ` · ${record.status}`}
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              {Object.entries(record.data).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{labelize(k)}</dt>
                  <dd className="text-right font-medium">{formatValue(v)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Bot className="size-3" /> These exact facts are what the AI is allowed to quote.
            </p>
          </Section>
        )}
      </TabsContent>

      <TabsContent value="ai" className="space-y-4">
        <section className="ai-ring-still ai-ring rounded-2xl shadow-md">
          <div className="rounded-[calc(var(--radius-2xl)-2px)] bg-card">
            <header className="flex min-h-12 items-center justify-between gap-2 border-b border-violet-100 bg-violet-50/70 px-4 py-2.5">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <span className="flex size-6 items-center justify-center rounded-md bg-violet-600 text-white">
                  <Sparkles className="size-3.5" />
                </span>
                AI triage
              </h3>
              {!disabled && (
                <Button variant="ghost" size="xs" onClick={onRerun} disabled={rerunning || pending} aria-label="Re-run AI triage">
                  <RefreshCw className={cn((rerunning || pending) && 'animate-spin')} /> Re-run
                </Button>
              )}
            </header>
            <div className="space-y-3 p-4 text-sm">
              <p className="text-xs leading-relaxed text-muted-foreground">The AI suggests a category, urgency and mood the moment a ticket arrives. You can override any of it from the Workflow tab.</p>
              {pending ? (
                <div className="space-y-2">
                  <div className="ai-shimmer h-3 w-1/2 rounded-full" />
                  <div className="ai-shimmer h-3 w-full rounded-full" />
                  <div className="ai-shimmer h-3 w-3/4 rounded-full" />
                </div>
              ) : disabled ? (
                <p className="text-muted-foreground">AI is off for this workspace. Triage uses keyword rules.</p>
              ) : (
                <>
                  {failed && (
                    <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {ticket.ai_error || 'AI unavailable. Showing rule-based triage.'}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <CategoryBadge category={ticket.ai_category ?? ticket.category} size="sm" />
                    {ticket.ai_priority && <PriorityBadge priority={ticket.ai_priority} size="sm" />}
                    <SentimentBadge sentiment={ticket.sentiment} />
                    {overridden && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-600/20 ring-inset">Overridden by team</span>}
                  </div>
                  {ticket.ai_summary && <p className="leading-relaxed text-foreground/90">{ticket.ai_summary}</p>}
                  {ticket.ai_confidence !== null && (
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                        <span>Confidence</span>
                        <span className="font-medium text-foreground tabular-nums">{Math.round(ticket.ai_confidence * 100)}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(ticket.ai_confidence * 100)} aria-valuemin={0} aria-valuemax={100}>
                        <div className="h-full rounded-full bg-violet-500" style={{ width: `${ticket.ai_confidence * 100}%` }} />
                      </div>
                    </div>
                  )}
                  {ticket.ai_reasoning && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Why</p>
                      <p className="text-xs leading-relaxed text-foreground/80">{ticket.ai_reasoning}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        <Section title="Possible duplicates" icon={<Copy className="size-4" />} tone="amber" hint="Tickets in this workspace with a very similar message.">
          {similar.length === 0 ? (
            <p className="text-xs text-muted-foreground">No similar tickets found.</p>
          ) : (
            <ul className="space-y-2">
              {similar.map((s) => (
                <li key={s.id}>
                  <Link to={`/w/${slug}/agent/tickets/${s.id}`} className="block rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50">
                    <p className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{s.reference}</span>
                      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">{Math.round(s.similarity * 100)}% similar</span>
                    </p>
                    <p className="mt-1 line-clamp-2 font-medium">{s.subject}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </TabsContent>

      <TabsContent value="activity">
        <Section title="Activity" icon={<History className="size-4" />} hint="Every change to this ticket and who made it.">
          <ActivityList items={ticket.activities} />
        </Section>
      </TabsContent>
    </Tabs>
  )
}
