import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Building2,
  CheckCheck,
  Copy,
  History,
  Loader2,
  Mail,
  Package,
  RefreshCw,
  Sparkles,
  Star,
  UserCheck,
  UserRound,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { Composer } from '@/components/agent/Composer'
import { InternalNotes } from '@/components/agent/InternalNotes'
import { CategoryBadge, PriorityBadge, SentimentBadge, SlaBadge, StatusBadge } from '@/components/badges'
import { RelativeTime } from '@/components/common'
import { ConfirmDialog, type ConfirmOptions } from '@/components/ConfirmDialog'
import { MetaSelect } from '@/components/MetaSelect'
import { ErrorState, ListSkeleton } from '@/components/states'
import { AttachmentList, ChatBubble, MessageBubble, PersonAvatar } from '@/components/tickets/Thread'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/api'
import { categoryTone, PRIORITIES, PRIORITY_META, STATUS_META } from '@/lib/constants'
import { formatValue, initials, labelize } from '@/lib/format'
import type { Activity, StaffTicketDetail, TicketStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['RESOLVED', 'IN_PROGRESS', 'CLOSED'],
  CLOSED: ['CLOSED', 'IN_PROGRESS'],
}

function Panel({ title, icon, children, action, className }: { title: string; icon: ReactNode; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border bg-card shadow-xs', className)}>
      <header className="flex items-center justify-between gap-2 border-b px-5 py-3.5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-muted-foreground">{icon}</span> {title}
        </h3>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
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

function TriageCard({ ticket, onRerun, rerunning }: { ticket: StaffTicketDetail; onRerun: () => void; rerunning: boolean }) {
  const pending = ticket.ai_status === 'PENDING'
  const failed = ticket.ai_status === 'FAILED'
  const disabled = ticket.ai_status === 'DISABLED'
  const overridden =
    (ticket.category_source === 'STAFF' && ticket.ai_category && ticket.ai_category.id !== ticket.category?.id) ||
    (ticket.priority_source === 'STAFF' && ticket.ai_priority && ticket.ai_priority !== ticket.priority)
  return (
    <section className="ai-ring-still ai-ring rounded-2xl shadow-sm">
      <div className="rounded-[calc(var(--radius-2xl)-2px)] bg-card">
        <header className="flex items-center justify-between gap-2 border-b px-5 py-3.5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-6 items-center justify-center rounded-md bg-linear-to-br from-violet-500 via-fuchsia-500 to-sky-400 text-white">
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
        <div className="space-y-3 p-5 text-sm">
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
                    <span className="font-medium tabular-nums text-foreground">{Math.round(ticket.ai_confidence * 100)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(ticket.ai_confidence * 100)} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-linear-to-r from-violet-500 to-sky-400" style={{ width: `${ticket.ai_confidence * 100}%` }} />
                  </div>
                </div>
              )}
              {ticket.ai_reasoning && <p className="text-xs leading-relaxed text-muted-foreground">{ticket.ai_reasoning}</p>}
            </>
          )}
        </div>
      </div>
    </section>
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

export function TicketPage() {
  const { slug, api } = useWorkspace()
  const { user } = useAuth()
  const { id } = useParams()
  const ticketId = Number(id)
  const queryClient = useQueryClient()
  const refetchInterval = useFallbackInterval()
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const { data: ticket, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['ticket', ticketId, slug],
    queryFn: () => api.tickets.getStaff(ticketId),
    refetchInterval,
  })
  const members = useQuery({ queryKey: ['members', slug, 'staff'], queryFn: () => api.members(true), staleTime: 60_000 })
  const categories = useQuery({ queryKey: ['categories', slug], queryFn: api.categories, staleTime: 60_000 })
  const similar = useQuery({
    queryKey: ['similar', ticketId, slug],
    queryFn: () => api.tickets.similar(ticketId),
    staleTime: 60_000,
  })

  const unread = ticket?.has_unread
  useEffect(() => {
    if (!unread) return
    api.tickets.markSeen(ticketId).then(() => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    })
  }, [unread, ticketId, api, queryClient])

  const msgCount = ticket?.messages.length ?? 0
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [msgCount])

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
    queryClient.invalidateQueries({ queryKey: ['tickets'] })
    queryClient.invalidateQueries({ queryKey: ['stats'] })
  }
  const update = useMutation({
    mutationFn: (data: Parameters<typeof api.tickets.update>[1]) => api.tickets.update(ticketId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(['ticket', ticketId, slug], data)
      refresh()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
  const rerun = useMutation({
    mutationFn: () => api.tickets.reclassify(ticketId),
    onSuccess: () => {
      toast.success('Re-running AI triage')
      refresh()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  if (isLoading) return <ListSkeleton rows={6} />
  if (isError || !ticket) return <ErrorState error={error} onRetry={() => refetch()} />

  const first = ticket.messages[0]
  const thread = first && first.sender_is_requester && first.body === ticket.description ? ticket.messages.slice(1) : ticket.messages
  const publicThread = thread.filter((m) => !m.is_internal)
  const mineOrFree = !ticket.assigned_to || ticket.assigned_to.id === user?.id
  const record = ticket.record_detail
  const rp = ticket.requester_profile

  const assign = (value: string | null) => {
    const next = value ? Number(value) : null
    const apply = () => update.mutate({ assigned_to: next })
    if (!mineOrFree && next !== ticket.assigned_to?.id) {
      setConfirm({
        title: 'Reassign this ticket?',
        description: `${ticket.assigned_to!.full_name} currently owns it.`,
        confirmLabel: 'Reassign',
        onConfirm: apply,
      })
    } else apply()
  }

  const resolve = () =>
    setConfirm({
      title: 'Mark as resolved?',
      description: `${rp.name.split(' ')[0]} will be asked to confirm that the issue is sorted.`,
      confirmLabel: 'Mark as resolved',
      onConfirm: () => update.mutate({ status: 'RESOLVED' }),
    })

  return (
    <div className="mx-auto max-w-[1440px]">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link to={`/w/${slug}/agent`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to queue
        </Link>
        {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
          <Button size="sm" variant="outline" className="ml-auto border-emerald-300 text-emerald-800 hover:bg-emerald-50" onClick={resolve} disabled={update.isPending}>
            <CheckCheck /> Mark as resolved
          </Button>
        )}
      </div>

      <header className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">{ticket.reference}</span>
          <StatusBadge status={ticket.status} />
          <SlaBadge state={ticket.sla_state} dueAt={ticket.sla_due_at} />
          <SentimentBadge sentiment={ticket.sentiment} />
          {ticket.csat_score && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-600/20 ring-inset">
              <Star className="size-3 fill-amber-400 text-amber-400" /> CSAT {ticket.csat_score}/5
            </span>
          )}
        </div>
        <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{ticket.subject}</h1>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-2xl border bg-card shadow-xs" aria-label="Conversation">
            <div className="max-h-[62vh] min-h-64 space-y-5 overflow-y-auto rounded-t-2xl p-4 sm:p-6">
              <ChatBubble side="left" name={rp.name} variant="customer" time={ticket.created_at} avatar={<PersonAvatar name={rp.name} variant="customer" />}>
                <p className="whitespace-pre-wrap">{ticket.description}</p>
                <div className="mt-3 empty:hidden">
                  <AttachmentList ticketId={ticket.id} attachments={ticket.attachments} />
                </div>
              </ChatBubble>
              {publicThread.map((m) => (
                <MessageBubble key={m.id} message={m} viewer="staff" />
              ))}
              <div ref={endRef} />
            </div>
            <Composer ticket={ticket} />
          </section>
          <InternalNotes ticket={ticket} className="max-h-[420px]" />
        </div>

        <aside className="min-w-0 space-y-5">
          <TriageCard ticket={ticket} onRerun={() => rerun.mutate()} rerunning={rerun.isPending} />

          <Panel title="Workflow" icon={<UserCheck className="size-4" />}>
            <div className="space-y-4">
              <Field label="Status">
                <MetaSelect value={ticket.status} onChange={(v) => v && update.mutate({ status: v as TicketStatus })} options={TRANSITIONS[ticket.status].map((s) => ({ value: s, label: STATUS_META[s].label, tone: STATUS_META[s] }))} className="w-full" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Priority">
                  <MetaSelect value={ticket.priority} onChange={(v) => v && update.mutate({ priority: v as typeof ticket.priority })} options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label, tone: PRIORITY_META[p] }))} className="w-full min-w-0" />
                </Field>
                <Field label="Category">
                  <MetaSelect value={ticket.category?.key ?? null} onChange={(v) => v && update.mutate({ category: v })} placeholder="Choose" options={(categories.data ?? []).map((c) => ({ value: c.key, label: c.name, tone: categoryTone(c.key, c.name) }))} className="w-full min-w-0" />
                </Field>
              </div>
              <Field label="Assignee">
                <div className="flex gap-2">
                  <MetaSelect
                    value={ticket.assigned_to ? String(ticket.assigned_to.id) : null}
                    onChange={assign}
                    placeholder="Unassigned"
                    anyLabel="Unassigned"
                    plain
                    options={(members.data ?? []).map((m) => ({ value: String(m.id), label: m.id === user?.id ? `${m.full_name} (you)` : m.full_name, icon: UserRound }))}
                    className="min-w-0 flex-1"
                  />
                  {ticket.assigned_to?.id !== user?.id && (
                    <Button variant="outline" onClick={() => update.mutate({ assigned_to: user!.id })} disabled={update.isPending}>
                      Take
                    </Button>
                  )}
                </div>
              </Field>
              {update.isPending && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" /> Saving…
                </p>
              )}
            </div>
          </Panel>

          <Panel title="Customer" icon={<UserRound className="size-4" />}>
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-semibold">{initials(rp.name)}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{rp.name}</p>
                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <Mail className="size-3" /> {rp.email}
                </p>
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              {rp.company && (
                <div className="flex justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-muted-foreground"><Building2 className="size-3.5" /> Company</dt>
                  <dd className="font-medium">{rp.company}</dd>
                </div>
              )}
              {Object.entries(rp.profile).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{labelize(k)}</dt>
                  <dd className="text-right font-medium">{formatValue(v)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Tickets</dt>
                <dd className="font-medium">{rp.tickets_count}</dd>
              </div>
            </dl>
          </Panel>

          {record && (
            <Panel title={record.kind} icon={<Package className="size-4" />}>
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
            </Panel>
          )}

          {similar.data && similar.data.length > 0 && (
            <Panel title="Possible duplicates" icon={<Copy className="size-4" />}>
              <ul className="space-y-2">
                {similar.data.map((s) => (
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
            </Panel>
          )}

          <Panel title="Activity" icon={<History className="size-4" />}>
            <ActivityList items={ticket.activities} />
          </Panel>
        </aside>
      </div>
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
