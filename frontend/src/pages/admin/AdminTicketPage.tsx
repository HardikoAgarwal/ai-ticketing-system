import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  BookOpen,
  Bot,
  CalendarDays,
  CheckCheck,
  CircleDot,
  Coins,
  Factory,
  History,
  Loader2,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  MessagesSquare,
  Phone,
  Printer,
  RefreshCw,
  RotateCcw,
  ScanBarcode,
  Send,
  Sparkles,
  Tag,
  TrendingUp,
  UserCheck,
  UserRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Composer } from '@/components/admin/Composer'
import { InternalNotes } from '@/components/admin/InternalNotes'
import { BookCover, IsbnChip, PlatformChips, RoyaltyNote, StageProgress } from '@/components/author/BookCard'
import { BookStatusBadge, CategoryBadge, PriorityBadge, SlaBadge, StatusBadge } from '@/components/badges'
import { RelativeTime } from '@/components/common'
import { ConfirmDialog, type ConfirmOptions } from '@/components/ConfirmDialog'
import { MetaSelect } from '@/components/MetaSelect'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import { AttachmentList, ChatBubble, MessageBubble, PersonAvatar } from '@/components/tickets/Thread'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/auth/AuthContext'
import { ApiError, errorMessage } from '@/lib/api'
import { CATEGORIES, CATEGORY_META, PRIORITIES, PRIORITY_META, STATUS_META } from '@/lib/constants'
import { adminApi, ticketsApi } from '@/lib/endpoints'
import { formatDate, formatINR, formatNumber, initials } from '@/lib/format'
import type { Activity, AdminTicketDetail, TicketCategory, TicketPriority, TicketStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'CLOSED'],
  RESOLVED: ['IN_PROGRESS', 'CLOSED'],
  CLOSED: ['IN_PROGRESS'],
}

type UpdatePayload = Partial<{ status: TicketStatus; category: TicketCategory; priority: TicketPriority; assigned_to: number | null }>
type Update = (payload: UpdatePayload, message: string) => void

function Card({ title, icon: Icon, action, children, className, bodyClassName }: {
  title?: string
  icon?: LucideIcon
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('flex flex-col overflow-hidden rounded-2xl border bg-card shadow-xs', className)}>
      {title && (
        <header className="flex shrink-0 items-center justify-between gap-2 border-b px-5 py-3.5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            {Icon && <Icon className="size-4 text-primary" />}
            {title}
          </h3>
          {action}
        </header>
      )}
      <div className={cn('flex-1 p-5', bodyClassName)}>{children}</div>
    </section>
  )
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{children}</p>
}

/* ----------------------------------------------------------------------------------------------- */
/* Header: what the ticket is + every triage/workflow control in one row                          */
/* ----------------------------------------------------------------------------------------------- */

function TicketHeader({ ticket, update, pending }: { ticket: AdminTicketDetail; update: Update; pending: boolean }) {
  const { user } = useAuth()
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  const agents = useQuery({ queryKey: ['agents'], queryFn: adminApi.agents, staleTime: 5 * 60_000 })
  const mine = ticket.assigned_to?.id === user?.id

  const changeStatus = (status: TicketStatus) => {
    if (status === ticket.status) return
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

  const changeAssignee = (value: string | null) => {
    const assigned_to = !value || value === 'none' ? null : Number(value)
    if (assigned_to === (ticket.assigned_to?.id ?? null)) return
    const name = agents.data?.find((a) => a.id === assigned_to)?.full_name
    const apply = () => update({ assigned_to }, assigned_to ? `Assigned to ${name}` : 'Ticket unassigned')
    if (ticket.assigned_to && ticket.assigned_to.id !== user?.id) {
      setConfirm({
        title: `Reassign from ${ticket.assigned_to.full_name}?`,
        description: `${ticket.assigned_to.full_name} currently owns this ticket.`,
        confirmLabel: 'Reassign',
        onConfirm: apply,
      })
    } else apply()
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <div className="bg-gradient-to-br from-primary/[0.08] via-card to-card px-7 py-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
          <span className="rounded-md bg-card px-2 py-1 font-mono font-semibold text-foreground ring-1 ring-border">{ticket.reference}</span>
          <span>
            Opened <RelativeTime value={ticket.created_at} /> by <span className="font-medium text-foreground">{ticket.author.name}</span>
          </span>
          <span className="ml-auto flex items-center gap-2">
            <span className="text-muted-foreground">First reply</span>
            <SlaBadge state={ticket.sla_state} dueAt={ticket.sla_due_at} />
          </span>
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{ticket.subject}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <StatusBadge status={ticket.status} size="lg" />
          <PriorityBadge priority={ticket.priority} source={ticket.priority_source} size="lg" />
          <CategoryBadge category={ticket.category} source={ticket.category_source} size="lg" />
          {ticket.book && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-sm text-muted-foreground ring-1 ring-border ring-inset">
              <BookOpen className="size-4" /> {ticket.book.title}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-5 border-t bg-muted/20 px-7 py-5 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <FieldLabel>Status</FieldLabel>
          <MetaSelect
            value={ticket.status}
            onChange={(v) => v && changeStatus(v as TicketStatus)}
            disabled={pending}
            className="w-full"
            options={[ticket.status, ...STATUS_TRANSITIONS[ticket.status]].map((s) => ({ value: s, label: STATUS_META[s].label, tone: STATUS_META[s] }))}
          />
        </div>
        <div>
          <FieldLabel>Priority</FieldLabel>
          <MetaSelect
            value={ticket.priority}
            onChange={(v) => v && v !== ticket.priority && update({ priority: v as TicketPriority }, 'Priority updated. SLA recalculated.')}
            disabled={pending}
            className="w-full"
            options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label, tone: PRIORITY_META[p] }))}
          />
        </div>
        <div>
          <FieldLabel>Category</FieldLabel>
          <MetaSelect
            value={ticket.category}
            onChange={(v) => v && v !== ticket.category && update({ category: v as TicketCategory }, 'Category updated. The AI draft will refresh.')}
            disabled={pending}
            className="w-full"
            options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_META[c].label, tone: CATEGORY_META[c] }))}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <FieldLabel>Owner</FieldLabel>
            {!mine && (
              <button
                className="mb-1.5 text-[11px] font-semibold text-primary hover:underline disabled:opacity-50"
                onClick={() => user && changeAssignee(String(user.id))}
                disabled={pending}
              >
                Assign to me
              </button>
            )}
          </div>
          <MetaSelect
            value={ticket.assigned_to ? String(ticket.assigned_to.id) : 'none'}
            onChange={changeAssignee}
            disabled={pending || agents.isLoading}
            className={cn('w-full', mine && 'border-primary/30 bg-primary/[0.06] text-primary')}
            options={[
              { value: 'none', label: 'Unassigned', icon: UserRound },
              ...(agents.data ?? []).map((a) => ({
                value: String(a.id),
                label: a.id === user?.id ? `${a.full_name} (you)` : a.full_name,
                icon: UserCheck,
              })),
            ]}
          />
        </div>
      </div>

      <AiInsight ticket={ticket} />
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </section>
  )
}

function AiInsight({ ticket }: { ticket: AdminTicketDetail }) {
  const queryClient = useQueryClient()
  const reclassify = useMutation({
    mutationFn: () => ticketsApi.reclassify(ticket.id),
    onSuccess: () => {
      toast.info('Re-running AI classification…')
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const rerun = ticket.ai_status !== 'DISABLED' && (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => reclassify.mutate()}
      disabled={reclassify.isPending || ticket.ai_status === 'PENDING'}
      className="shrink-0 text-violet-800 hover:bg-violet-100"
    >
      <RefreshCw className={cn(reclassify.isPending && 'animate-spin')} /> Re-run AI
    </Button>
  )

  if (ticket.ai_status === 'PENDING') {
    return (
      <div className="flex items-center gap-2 border-t bg-violet-50/70 px-7 py-3.5 text-sm text-violet-900">
        <Loader2 className="size-4 animate-spin" /> AI is classifying this ticket…
      </div>
    )
  }
  if (ticket.ai_status === 'FAILED' || ticket.ai_status === 'DISABLED') {
    return (
      <div className="flex items-center gap-3 border-t bg-amber-50/70 px-7 py-3.5 text-sm text-amber-900">
        <AlertTriangle className="size-4 shrink-0" />
        <span className="flex-1">
          {ticket.ai_status === 'DISABLED' ? 'AI is off on this server.' : 'AI was unavailable.'} Category and priority are a keyword-based
          estimate; please confirm them.
        </span>
        {rerun}
      </div>
    )
  }
  if (!ticket.ai_category) return null

  const overridden = ticket.category_source === 'ADMIN' || ticket.priority_source === 'ADMIN'
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t bg-gradient-to-r from-violet-50/80 to-fuchsia-50/50 px-7 py-3.5 text-sm">
      <span className="flex items-center gap-1.5 font-semibold text-violet-900">
        <Sparkles className="size-4" /> AI suggested
      </span>
      <CategoryBadge category={ticket.ai_category} size="sm" short />
      {ticket.ai_priority && <PriorityBadge priority={ticket.ai_priority} size="sm" />}
      {ticket.ai_confidence !== null && (
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-600/20 ring-inset">
          {Math.round(ticket.ai_confidence * 100)}% confident
        </span>
      )}
      {overridden && (
        <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
          <UserCheck className="size-3.5" /> Overridden by team
        </span>
      )}
      {ticket.ai_reasoning && <span className="min-w-0 flex-1 basis-64 text-xs text-violet-900/80">{ticket.ai_reasoning}</span>}
      {rerun}
    </div>
  )
}

/* ----------------------------------------------------------------------------------------------- */
/* Context: who is asking, about which book                                                         */
/* ----------------------------------------------------------------------------------------------- */

function InfoRow({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate">{children}</span>
    </div>
  )
}

function AuthorCard({ ticket }: { ticket: AdminTicketDetail }) {
  const a = ticket.author_profile
  return (
    <Card title="Author" icon={UserRound}>
      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-indigo-200 text-base font-semibold text-indigo-800">
          {initials(a.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{a.name}</p>
          <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{a.author_code}</span>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        <InfoRow icon={Mail}>
          <a href={`mailto:${a.email}`} className="hover:text-primary hover:underline">
            {a.email}
          </a>
        </InfoRow>
        {a.phone && <InfoRow icon={Phone}>{a.phone}</InfoRow>}
        {a.city && <InfoRow icon={MapPin}>{a.city}</InfoRow>}
        <InfoRow icon={CalendarDays}>Author since {formatDate(a.joined_date)}</InfoRow>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/60 p-3 text-center">
          <p className="text-xl font-semibold">{a.books_count}</p>
          <p className="text-[11px] text-muted-foreground">Books</p>
        </div>
        <div className="rounded-xl bg-muted/60 p-3 text-center">
          <p className="text-xl font-semibold">{a.tickets_count}</p>
          <p className="text-[11px] text-muted-foreground">Tickets</p>
        </div>
      </div>
    </Card>
  )
}

function BookContextCard({ ticket }: { ticket: AdminTicketDetail }) {
  const b = ticket.book_detail
  if (!b) {
    return (
      <Card title="Book" icon={BookOpen} bodyClassName="flex items-center">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex size-14 items-center justify-center rounded-xl bg-muted">
            <BookOpen className="size-5" />
          </span>
          General / account-level request. No specific book selected.
        </div>
      </Card>
    )
  }
  const earned = Number(b.total_royalty_earned)
  const paidPct = earned ? (Number(b.royalty_paid) / earned) * 100 : 0
  return (
    <Card title="Book" icon={BookOpen} action={<BookStatusBadge status={b.status} published={b.is_published} />} bodyClassName="@container space-y-5">
      <div className="flex items-start gap-5">
        <BookCover book={b} className="w-20 @xl:w-24" />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-lg leading-snug font-semibold tracking-tight">{b.title}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>{b.genre}</span>
            <span aria-hidden>·</span>
            <span className="font-mono text-xs">{b.book_code}</span>
            <span aria-hidden>·</span>
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3.5" />
              {b.publication_date ? `Published ${formatDate(b.publication_date)}` : 'Not yet published'}
            </span>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs">
              <ScanBarcode className="size-3.5 text-muted-foreground" />
              <IsbnChip isbn={b.isbn} />
            </span>
            {b.print_partner && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs">
                <Printer className="size-3.5 text-muted-foreground" /> {b.print_partner}
              </span>
            )}
            <PlatformChips platforms={b.available_on} />
          </div>
        </div>
      </div>

      {b.is_published ? (
        <>
          <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-4">
            <BookMetric icon={TrendingUp} label="Copies sold" value={formatNumber(b.total_copies_sold)} tone="bg-sky-100 text-sky-700" />
            <BookMetric icon={Tag} label="MRP" value={formatINR(b.mrp)} tone="bg-slate-100 text-slate-700" />
            <BookMetric icon={Coins} label="Royalty / copy" value={formatINR(b.author_royalty_per_copy)} tone="bg-violet-100 text-violet-700" />
            <BookMetric icon={Wallet} label="Total earned" value={formatINR(b.total_royalty_earned)} tone="bg-emerald-100 text-emerald-700" />
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">Paid</span>
                <span className="font-semibold text-emerald-700">{formatINR(b.royalty_paid)}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-amber-400" />
                <span className="text-muted-foreground">Pending</span>
                <span className="font-semibold text-amber-700">{formatINR(b.royalty_pending)}</span>
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                Last payout <span className="font-medium text-foreground">{formatDate(b.last_royalty_payout_date, 'none yet')}</span>
              </span>
            </div>
            <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="h-full bg-emerald-500" style={{ width: `${paidPct}%` }} />
              <div className="h-full bg-amber-400" style={{ width: `${earned ? 100 - paidPct : 0}%` }} />
            </div>
            <div className="mt-3 empty:hidden">
              <RoyaltyNote book={b} />
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl bg-amber-50/60 p-5 ring-1 ring-amber-600/15 ring-inset">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide text-amber-900 uppercase">
            <Factory className="size-3.5" /> Production progress
          </p>
          <StageProgress book={b} />
        </div>
      )}
    </Card>
  )
}

function BookMetric({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border bg-card px-4 py-3">
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', tone)}>
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-base font-semibold tracking-tight">{value}</p>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------------------------------------- */
/* Conversation + activity                                                                          */
/* ----------------------------------------------------------------------------------------------- */

function Conversation({ ticket, className }: { ticket: AdminTicketDetail; className?: string }) {
  const replies = ticket.messages.filter((m) => !m.is_internal)
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [replies.length])

  return (
    <section className={cn('flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-xs', className)}>
      <header className="flex shrink-0 items-center justify-between gap-2 border-b px-6 py-3.5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <MessagesSquare className="size-4 text-primary" /> Conversation with {ticket.author.name.split(' ')[0]}
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{replies.length + 1}</span>
        </h3>
        <span className="text-xs text-muted-foreground">The author sees everything in this thread</span>
      </header>
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-6 overflow-y-auto bg-gradient-to-b from-muted/40 to-muted/10 px-6 py-7">
        <ChatBubble
          side="left"
          variant="author"
          name={ticket.author.name}
          time={ticket.created_at}
          avatar={<PersonAvatar name={ticket.author.name} variant="author" />}
          meta={<span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-sky-600/20 ring-inset">Original request</span>}
        >
          <p className="font-semibold">{ticket.subject}</p>
          <p className="mt-1.5 whitespace-pre-wrap">{ticket.description}</p>
          {ticket.attachments.length > 0 && (
            <div className="mt-3">
              <AttachmentList ticketId={ticket.id} attachments={ticket.attachments} />
            </div>
          )}
        </ChatBubble>
        {replies.map((m) => (
          <MessageBubble key={m.id} message={m} viewer="admin" />
        ))}
        {replies.length === 0 && (
          <p className="text-center text-xs text-muted-foreground">No reply yet. The author is waiting for the first response.</p>
        )}
      </div>
      <Composer key={ticket.id} ticket={ticket} />
    </section>
  )
}

const ACTIVITY_STYLE: Record<string, { icon: LucideIcon; className: string }> = {
  CREATED: { icon: CircleDot, className: 'bg-sky-100 text-sky-700' },
  AI_CLASSIFIED: { icon: Bot, className: 'bg-violet-100 text-violet-700' },
  AI_FAILED: { icon: AlertTriangle, className: 'bg-amber-100 text-amber-700' },
  STATUS_CHANGED: { icon: ArrowRightLeft, className: 'bg-indigo-100 text-indigo-700' },
  CATEGORY_CHANGED: { icon: Tag, className: 'bg-cyan-100 text-cyan-700' },
  PRIORITY_CHANGED: { icon: AlertTriangle, className: 'bg-orange-100 text-orange-700' },
  ASSIGNED: { icon: UserCheck, className: 'bg-emerald-100 text-emerald-700' },
  REPLIED: { icon: Send, className: 'bg-primary/15 text-primary' },
  NOTE_ADDED: { icon: Lock, className: 'bg-amber-100 text-amber-700' },
  AUTHOR_REPLIED: { icon: MessageCircle, className: 'bg-sky-100 text-sky-700' },
  AUTHOR_CONFIRMED: { icon: CheckCheck, className: 'bg-emerald-100 text-emerald-700' },
  AUTHOR_REOPENED: { icon: RotateCcw, className: 'bg-rose-100 text-rose-700' },
}

function ActivityItem({ a, last }: { a: Activity; last: boolean }) {
  const style = ACTIVITY_STYLE[a.action] ?? ACTIVITY_STYLE.CREATED
  const Icon = style.icon
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!last && <span className="absolute top-8 bottom-0 left-[13px] w-px bg-border" />}
      <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full', style.className)}>
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 pt-0.5 text-xs">
        <p className="leading-relaxed">
          <span className="font-semibold">{a.actor_name ?? (a.action.startsWith('AI') ? 'AI' : 'System')}</span>{' '}
          <span className="text-muted-foreground">{a.label.toLowerCase()}</span>
        </p>
        {a.to_value && (
          <p className="mt-1 flex flex-wrap items-center gap-1">
            {a.from_value && (
              <>
                <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground line-through decoration-muted-foreground/50">{a.from_value}</span>
                <span className="text-muted-foreground">→</span>
              </>
            )}
            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">{a.to_value}</span>
          </p>
        )}
        <RelativeTime value={a.created_at} className="mt-1 block text-muted-foreground" />
      </div>
    </li>
  )
}

function ActivityPanel({ ticket, className }: { ticket: AdminTicketDetail; className?: string }) {
  const items = [...ticket.activities].reverse()
  return (
    <Card
      title="Activity"
      icon={History}
      action={<span className="text-[11px] text-muted-foreground">{items.length} events</span>}
      className={cn('min-h-0', className)}
      bodyClassName="min-h-0 overflow-y-auto"
    >
      <ol>
        {items.map((a, i) => (
          <ActivityItem key={a.id} a={a} last={i === items.length - 1} />
        ))}
      </ol>
    </Card>
  )
}

/* ----------------------------------------------------------------------------------------------- */

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
  const update: Update = (payload, message) => mutation.mutate({ payload, message })

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
    <div className="mx-auto max-w-[1440px] space-y-6 pb-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin">
          <ArrowLeft /> Back to queue
        </Link>
      </Button>

      <TicketHeader ticket={ticket} update={update} pending={mutation.isPending} />

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <AuthorCard ticket={ticket} />
        <BookContextCard ticket={ticket} />
      </div>

      <div className="grid gap-6 xl:h-[clamp(640px,calc(100vh-7rem),900px)] xl:grid-cols-[minmax(0,1fr)_420px]">
        <Conversation ticket={ticket} className="max-h-[820px] xl:max-h-none" />
        <aside className="flex min-h-0 flex-col gap-6">
          <InternalNotes ticket={ticket} className="max-h-[520px] xl:max-h-none xl:min-h-0 xl:flex-[1.15]" />
          <ActivityPanel ticket={ticket} className="max-h-[480px] xl:max-h-none xl:flex-1" />
        </aside>
      </div>
    </div>
  )
}
