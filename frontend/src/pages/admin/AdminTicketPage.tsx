import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Clock,
  History,
  Loader2,
  MessageCircle,
  RefreshCw,
  Sparkles,
  UserCheck,
  UserRound,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Composer } from '@/components/admin/Composer'
import { BookStatusBadge, PriorityBadge, SlaBadge, StatusBadge } from '@/components/badges'
import { RelativeTime } from '@/components/common'
import { ConfirmDialog, type ConfirmOptions } from '@/components/ConfirmDialog'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import { AttachmentList, MessageBubble } from '@/components/tickets/Thread'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/auth/AuthContext'
import { ApiError, errorMessage } from '@/lib/api'
import { CATEGORIES, CATEGORY_META, PRIORITIES, PRIORITY_META, STATUS_META } from '@/lib/constants'
import { adminApi, ticketsApi } from '@/lib/endpoints'
import { formatDate, formatDateTime, formatINR } from '@/lib/format'
import type { AdminTicketDetail, TicketCategory, TicketPriority, TicketStatus } from '@/lib/types'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'CLOSED'],
  RESOLVED: ['IN_PROGRESS', 'CLOSED'],
  CLOSED: ['IN_PROGRESS'],
}

type UpdatePayload = Partial<{ status: TicketStatus; category: TicketCategory; priority: TicketPriority; assigned_to: number | null }>

function Panel({ title, icon, children, action }: { title: string; icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function AiHint({ suggested, label, source, confidence }: { suggested: string; label: string; source: string; confidence: number | null }) {
  if (!suggested) return null
  if (source === 'ADMIN') {
    return (
      <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700">
        <UserCheck className="size-3" /> Overridden by team · AI suggested {label}
      </p>
    )
  }
  return (
    <p className="mt-1 flex items-center gap-1 text-[11px] text-violet-700">
      <Sparkles className="size-3" /> AI suggested{confidence !== null ? ` · ${Math.round(confidence * 100)}% confident` : ''}
    </p>
  )
}

function TriagePanel({ ticket, update, pending }: { ticket: AdminTicketDetail; update: (p: UpdatePayload, msg: string) => void; pending: boolean }) {
  const queryClient = useQueryClient()
  const reclassify = useMutation({
    mutationFn: () => ticketsApi.reclassify(ticket.id),
    onSuccess: () => {
      toast.info('Re-running AI classification…')
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  return (
    <Panel
      title="Triage"
      icon={<Sparkles className="size-3.5" />}
      action={
        ticket.ai_status !== 'DISABLED' && (
          <Button variant="ghost" size="xs" onClick={() => reclassify.mutate()} disabled={reclassify.isPending || ticket.ai_status === 'PENDING'}>
            <RefreshCw className={reclassify.isPending ? 'animate-spin' : ''} /> Re-run AI
          </Button>
        )
      }
    >
      {ticket.ai_status === 'PENDING' && (
        <p className="mb-3 flex items-center gap-1.5 rounded-md bg-violet-50 px-2.5 py-1.5 text-xs text-violet-800">
          <Loader2 className="size-3.5 animate-spin" /> AI is classifying this ticket…
        </p>
      )}
      {ticket.ai_status === 'FAILED' && (
        <p className="mb-3 flex items-start gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
          <AlertTriangle className="mt-px size-3.5 shrink-0" /> AI unavailable; showing a keyword-based estimate. Please confirm category and priority.
        </p>
      )}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium">Category</label>
          <Select value={ticket.category} onValueChange={(v) => update({ category: v as TicketCategory }, 'Category updated. The AI draft will refresh.')} disabled={pending}>
            <SelectTrigger className="mt-1 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_META[c].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AiHint
            suggested={ticket.ai_category}
            label={ticket.ai_category ? CATEGORY_META[ticket.ai_category].label : ''}
            source={ticket.category_source}
            confidence={ticket.ai_confidence}
          />
        </div>
        <div>
          <label className="text-xs font-medium">Priority</label>
          <Select value={ticket.priority} onValueChange={(v) => update({ priority: v as TicketPriority }, 'Priority updated. SLA recalculated.')} disabled={pending}>
            <SelectTrigger className="mt-1 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_META[p].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AiHint
            suggested={ticket.ai_priority}
            label={ticket.ai_priority ? PRIORITY_META[ticket.ai_priority].label : ''}
            source={ticket.priority_source}
            confidence={null}
          />
        </div>
        {ticket.ai_reasoning && ticket.ai_status === 'COMPLETED' && (
          <p className="rounded-md bg-muted/70 px-2.5 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Why: </span>
            {ticket.ai_reasoning}
          </p>
        )}
      </div>
    </Panel>
  )
}

function WorkflowPanel({ ticket, update, pending }: { ticket: AdminTicketDetail; update: (p: UpdatePayload, msg: string) => void; pending: boolean }) {
  const { user } = useAuth()
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  const agents = useQuery({ queryKey: ['agents'], queryFn: adminApi.agents, staleTime: 5 * 60_000 })
  const mine = ticket.assigned_to?.id === user?.id

  const changeStatus = (status: TicketStatus) => {
    if (status === 'CLOSED') {
      setConfirm({
        title: 'Close this ticket?',
        description: 'Closed tickets leave the queue. The author can still reopen it by replying.',
        confirmLabel: 'Close ticket',
        onConfirm: () => update({ status }, 'Ticket closed'),
      })
      return
    }
    update({ status }, `Status changed to ${STATUS_META[status].label}`)
  }

  const changeAssignee = (value: string) => {
    const assigned_to = value === 'none' ? null : Number(value)
    const name = agents.data?.find((a) => a.id === assigned_to)?.full_name
    const apply = () => update({ assigned_to }, assigned_to ? `Assigned to ${name}` : 'Ticket unassigned')
    if (ticket.assigned_to && ticket.assigned_to.id !== user?.id && ticket.assigned_to.id !== assigned_to) {
      setConfirm({
        title: `Reassign from ${ticket.assigned_to.full_name}?`,
        description: `${ticket.assigned_to.full_name} currently owns this ticket.`,
        confirmLabel: 'Reassign',
        onConfirm: apply,
      })
    } else apply()
  }

  return (
    <Panel title="Workflow" icon={<UserRound className="size-3.5" />}>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium">Status</label>
          <Select value={ticket.status} onValueChange={(v) => changeStatus(v as TicketStatus)} disabled={pending}>
            <SelectTrigger className="mt-1 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ticket.status}>{STATUS_META[ticket.status].label}</SelectItem>
              {STATUS_TRANSITIONS[ticket.status].map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium">Owner</label>
            {!mine && (
              <Button variant="link" size="xs" className="h-auto p-0" onClick={() => user && changeAssignee(String(user.id))} disabled={pending}>
                Assign to me
              </Button>
            )}
          </div>
          <Select value={ticket.assigned_to ? String(ticket.assigned_to.id) : 'none'} onValueChange={changeAssignee} disabled={pending || agents.isLoading}>
            <SelectTrigger className="mt-1 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {agents.data?.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.full_name}
                  {a.id === user?.id ? ' (you)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between border-t pt-3 text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="size-3.5" /> First reply
          </span>
          <SlaBadge state={ticket.sla_state} dueAt={ticket.sla_due_at} />
        </div>
      </div>
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </Panel>
  )
}

function ContextPanel({ ticket }: { ticket: AdminTicketDetail }) {
  const a = ticket.author_profile
  const b = ticket.book_detail
  const rows = (items: [string, ReactNode][]) => (
    <dl className="space-y-1.5 text-xs">
      {items.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="text-right font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  )
  return (
    <Panel title="Author & book" icon={<BookOpen className="size-3.5" />}>
      <p className="text-sm font-medium">{a.name}</p>
      <p className="mb-2 text-xs text-muted-foreground">
        {a.email} · {a.author_code}
      </p>
      {rows([
        ['City', a.city || '—'],
        ['Author since', formatDate(a.joined_date)],
        ['Books / tickets', `${a.books_count} / ${a.tickets_count}`],
      ])}
      <div className="mt-3 border-t pt-3">
        {b ? (
          <>
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{b.title}</p>
              <BookStatusBadge status={b.status} published={b.is_published} />
            </div>
            {b.is_published
              ? rows([
                  ['ISBN', <span className="font-mono">{b.isbn}</span>],
                  ['Published', formatDate(b.publication_date)],
                  ['MRP / royalty per copy', `${formatINR(b.mrp)} / ${formatINR(b.author_royalty_per_copy)}`],
                  ['Copies sold', b.total_copies_sold],
                  ['Earned / paid', `${formatINR(b.total_royalty_earned)} / ${formatINR(b.royalty_paid)}`],
                  ['Pending', <span className="text-amber-700">{formatINR(b.royalty_pending)}</span>],
                  ['Last payout', formatDate(b.last_royalty_payout_date, 'Never')],
                  ['Print partner', b.print_partner || '—'],
                  ['Platforms', b.available_on.join(', ') || '—'],
                ])
              : rows([['Stage', `${b.stage_index + 1} of ${b.stage_count} · ${b.status.replace('In Production - ', '')}`]])}
            {b.royalty_notes.below_payout_threshold && (
              <p className="mt-2 text-[11px] text-amber-800">Pending is below the ₹1,000 payout threshold (rolls over).</p>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">General / account-level request (no specific book).</p>
        )}
      </div>
    </Panel>
  )
}

function ActivityPanel({ ticket }: { ticket: AdminTicketDetail }) {
  const items = [...ticket.activities].reverse()
  return (
    <Panel title="Activity" icon={<History className="size-3.5" />}>
      <ol className="space-y-2.5">
        {items.map((a) => (
          <li key={a.id} className="flex gap-2 text-xs">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-border" />
            <div className="min-w-0">
              <p>
                <span className="font-medium">{a.actor_name ?? (a.action.startsWith('AI') ? 'AI' : 'System')}</span>{' '}
                <span className="text-muted-foreground">{a.label.toLowerCase()}</span>
                {a.to_value && (
                  <span className="text-muted-foreground">
                    {a.from_value ? `: ${a.from_value} → ` : ': '}
                    <span className="text-foreground">{a.to_value}</span>
                  </span>
                )}
              </p>
              <RelativeTime value={a.created_at} className="text-muted-foreground" />
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

export function AdminTicketPage() {
  const id = Number(useParams().id)
  const queryClient = useQueryClient()
  const refetchInterval = useFallbackInterval()
  const { data: ticket, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsApi.getAdmin(id),
    enabled: Number.isFinite(id),
    refetchInterval: (q) => (q.state.data?.ai_status === 'PENDING' ? 4000 : refetchInterval),
  })

  useEffect(() => {
    if (ticket?.has_unread) ticketsApi.markSeen(id).then(() => queryClient.invalidateQueries({ queryKey: ['tickets'] }))
  }, [id, ticket?.has_unread, queryClient])

  const mutation = useMutation({
    mutationFn: ({ payload }: { payload: UpdatePayload; message: string }) => ticketsApi.update(id, payload),
    onMutate: async ({ payload }) => {
      await queryClient.cancelQueries({ queryKey: ['ticket', id] })
      const previous = queryClient.getQueryData<AdminTicketDetail>(['ticket', id])
      if (previous) {
        const optimistic: AdminTicketDetail = { ...previous }
        if (payload.status) optimistic.status = payload.status
        if (payload.category) Object.assign(optimistic, { category: payload.category, category_source: 'ADMIN' })
        if (payload.priority) Object.assign(optimistic, { priority: payload.priority, priority_source: 'ADMIN' })
        queryClient.setQueryData(['ticket', id], optimistic)
      }
      return { previous }
    },
    onSuccess: (data, { message }) => {
      queryClient.setQueryData(['ticket', id], data)
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      if (data.ai_draft_status === 'PENDING') queryClient.invalidateQueries({ queryKey: ['draft', id] })
      toast.success(message)
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['ticket', id], ctx.previous)
      toast.error(errorMessage(err))
    },
  })
  const update = (payload: UpdatePayload, message: string) => mutation.mutate({ payload, message })

  if (isLoading) return <ListSkeleton rows={6} />
  if (isError) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <EmptyState
          icon={MessageCircle}
          title="Ticket not found"
          action={
            <Button asChild variant="outline">
              <Link to="/admin">Back to queue</Link>
            </Button>
          }
        />
      )
    }
    return <ErrorState error={error} onRetry={() => refetch()} />
  }
  if (!ticket) return null

  return (
    <div className="mx-auto max-w-7xl">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/admin">
          <ArrowLeft /> Queue
        </Link>
      </Button>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{ticket.reference}</span>·<span>{ticket.author.name}</span>·<span>{ticket.book ? ticket.book.title : 'General'}</span>·
            <span>opened {formatDateTime(ticket.created_at)}</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{ticket.subject}</h1>
        </div>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={ticket.priority} source={ticket.priority_source} />
          <StatusBadge status={ticket.status} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <div className="rounded-xl border bg-card px-4 py-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{ticket.author.name} wrote</span>
              <RelativeTime value={ticket.created_at} className="text-muted-foreground" />
            </div>
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
            {ticket.attachments.length > 0 && (
              <div className="mt-3">
                <AttachmentList ticketId={ticket.id} attachments={ticket.attachments} />
              </div>
            )}
          </div>
          {ticket.messages.map((m) => (
            <MessageBubble key={m.id} message={m} viewer="admin" />
          ))}
          <Composer key={ticket.id} ticket={ticket} />
        </div>

        <aside className="space-y-4">
          <TriagePanel ticket={ticket} update={update} pending={mutation.isPending} />
          <WorkflowPanel ticket={ticket} update={update} pending={mutation.isPending} />
          <ContextPanel ticket={ticket} />
          <ActivityPanel ticket={ticket} />
        </aside>
      </div>
    </div>
  )
}
