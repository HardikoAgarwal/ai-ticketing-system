import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  CircleDot,
  Hourglass,
  Loader2,
  MessageCircle,
  MessagesSquare,
  RotateCcw,
  Send,
  Timer,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { StatusBadge } from '@/components/badges'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { RelativeTime } from '@/components/common'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import { AttachmentList, ChatBubble, MessageBubble, PersonAvatar } from '@/components/tickets/Thread'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/auth/AuthContext'
import { ApiError, errorMessage } from '@/lib/api'
import { ticketsApi } from '@/lib/endpoints'
import { formatDateTime } from '@/lib/format'
import type { AuthorTicketDetail, TicketStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

const STEPS: { key: TicketStatus; label: string; icon: LucideIcon; hint: string }[] = [
  { key: 'OPEN', label: 'Submitted', icon: CircleDot, hint: 'We have your request' },
  { key: 'IN_PROGRESS', label: 'In progress', icon: Timer, hint: 'Our team is on it' },
  { key: 'RESOLVED', label: 'Resolved', icon: CheckCircle2, hint: 'Issue sorted' },
]

function StatusStepper({ ticket }: { ticket: AuthorTicketDetail }) {
  const status = ticket.status
  const index = status === 'CLOSED' ? 2 : STEPS.findIndex((s) => s.key === status)
  const times: Record<string, string | null> = {
    OPEN: ticket.created_at,
    IN_PROGRESS: ticket.first_response_at,
    RESOLVED: ticket.resolved_at,
  }
  return (
    <ol className="grid grid-cols-3 gap-2">
      {STEPS.map((step, i) => {
        const done = i < index || (i === index && (status === 'RESOLVED' || status === 'CLOSED'))
        const current = i === index && !done
        const Icon = done ? Check : step.icon
        return (
          <li key={step.key} className="relative flex flex-col items-center text-center">
            {i < STEPS.length - 1 && (
              <span className={cn('absolute top-5 left-[calc(50%+24px)] h-0.5 w-[calc(100%-48px)]', i < index ? 'bg-primary' : 'bg-border')} />
            )}
            <span
              className={cn(
                'relative flex size-10 items-center justify-center rounded-full',
                done && 'bg-primary text-primary-foreground',
                current && 'bg-primary/10 text-primary ring-4 ring-primary/15',
                !done && !current && 'border-2 border-border bg-card text-muted-foreground',
              )}
            >
              <Icon className="size-5" strokeWidth={done ? 3 : 2} />
            </span>
            <p className={cn('mt-2 text-sm', done || current ? 'font-semibold' : 'text-muted-foreground')}>{step.label}</p>
            <p className="text-[11px] text-muted-foreground">
              {times[step.key] && i <= index ? <RelativeTime value={times[step.key]} /> : step.hint}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

function ResolutionPrompt({ ticket }: { ticket: AuthorTicketDetail }) {
  const queryClient = useQueryClient()
  const [needsHelp, setNeedsHelp] = useState(false)
  const [message, setMessage] = useState('')
  const mutation = useMutation({
    mutationFn: (resolved: boolean) => ticketsApi.confirmResolution(ticket.id, resolved, message),
    onSuccess: (data, resolved) => {
      queryClient.setQueryData(['ticket', ticket.id], data)
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      toast.success(resolved ? 'Thanks! Ticket closed.' : "Got it. We've reopened your ticket and will follow up.")
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  return (
    <div className="border-t bg-card px-6 py-5">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
        <div className="flex-1">
          <p className="font-semibold">We've marked this as resolved</p>
          <p className="text-sm text-muted-foreground">Did our reply solve your issue?</p>
          {!needsHelp ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => mutation.mutate(true)} disabled={mutation.isPending}>
                {mutation.isPending && mutation.variables === true ? <Loader2 className="animate-spin" /> : <Check />} Yes, close ticket
              </Button>
              <Button variant="outline" onClick={() => setNeedsHelp(true)} disabled={mutation.isPending}>
                <RotateCcw /> No, I still need help
              </Button>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us what's still not working (optional)" autoFocus />
              <div className="flex gap-2">
                <Button onClick={() => mutation.mutate(false)} disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="animate-spin" />} Reopen ticket
                </Button>
                <Button variant="ghost" onClick={() => setNeedsHelp(false)} disabled={mutation.isPending}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ReplyBox({ ticket }: { ticket: AuthorTicketDetail }) {
  const queryClient = useQueryClient()
  const storageKey = `bookleaf.author-reply.${ticket.id}`
  const [body, setBody] = useState(() => localStorage.getItem(storageKey) ?? '')

  useEffect(() => {
    if (body) localStorage.setItem(storageKey, body)
    else localStorage.removeItem(storageKey)
  }, [body, storageKey])

  const mutation = useMutation({
    mutationFn: () => ticketsApi.postMessage(ticket.id, { body }),
    onSuccess: () => {
      setBody('')
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      toast.success('Message sent')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const submit = () => body.trim() && !mutation.isPending && mutation.mutate()

  return (
    <div className="border-t bg-card px-6 py-5">
      <div className="flex items-end gap-3">
        <Textarea
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
          }}
          placeholder={ticket.status === 'CLOSED' ? 'Need more help? Writing here reopens the ticket.' : 'Reply to BookLeaf…'}
          className="max-h-56 min-h-12"
        />
        <Button size="lg" onClick={submit} disabled={!body.trim() || mutation.isPending} className="shrink-0">
          {mutation.isPending ? <Loader2 className="animate-spin" /> : <Send />} Send
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">Ctrl/⌘ + Enter to send. BookLeaf is notified instantly.</p>
    </div>
  )
}

export function TicketDetailPage() {
  const id = Number(useParams().id)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const markResolved = useMutation({
    mutationFn: () => ticketsApi.confirmResolution(id, true, ''),
    onSuccess: (data) => {
      queryClient.setQueryData(['ticket', id], data)
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      toast.success('Ticket marked as resolved. Thanks for letting us know!')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
  const refetchInterval = useFallbackInterval()
  const { data: ticket, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsApi.getAuthor(id),
    enabled: Number.isFinite(id),
    refetchInterval,
  })

  const lastReply = ticket?.last_admin_reply_at
  useEffect(() => {
    if (!ticket) return
    ticketsApi.markSeen(id).then(() => {
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    })
    // Re-mark whenever a new admin reply arrives while the page is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, lastReply, !!ticket])

  if (isLoading) return <ListSkeleton rows={4} />
  if (isError) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <EmptyState
          icon={MessageCircle}
          title="Ticket not found"
          description="This ticket doesn't exist or isn't linked to your account."
          action={
            <Button asChild variant="outline">
              <Link to="/author/tickets">Back to my tickets</Link>
            </Button>
          }
        />
      )
    }
    return <ErrorState error={error} onRetry={() => refetch()} />
  }
  if (!ticket) return null

  const awaitingFirstReply = !ticket.messages.some((m) => m.sender_role === 'ADMIN') && ticket.status === 'OPEN'

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/author/tickets">
            <ArrowLeft /> My Tickets
          </Link>
        </Button>
        {(ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS') && (
          <Button size="lg" onClick={() => setConfirmOpen(true)} disabled={markResolved.isPending} className="px-6">
            {markResolved.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Mark as resolved
          </Button>
        )}
      </div>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-xs">
        <div className="px-6 py-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
            <span className="rounded-md bg-card px-2 py-1 font-mono font-semibold text-foreground ring-1 ring-border">{ticket.reference}</span>
            <span className="flex items-center gap-1">
              {ticket.book ? <BookOpen className="size-3.5" /> : <UserRound className="size-3.5" />}
              {ticket.book ? ticket.book.title : 'General / Account Level'}
            </span>
            <span>Submitted {formatDateTime(ticket.created_at)}</span>
            <span className="ml-auto">
              <StatusBadge status={ticket.status} audience="author" size="lg" />
            </span>
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">{ticket.subject}</h1>
        </div>
        <div className="border-t px-6 py-5">
          <StatusStepper ticket={ticket} />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-xs">
        <header className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <MessagesSquare className="size-4 text-primary" /> Conversation with BookLeaf
          </h2>
          <span className="text-xs text-muted-foreground">Updates appear here automatically</span>
        </header>
        <div className="space-y-6 bg-muted/20 px-6 py-7">
          <ChatBubble
            side="right"
            variant="author"
            name="You"
            time={ticket.created_at}
            avatar={<PersonAvatar name={user?.full_name ?? 'You'} variant="author" />}
          >
            <p className="whitespace-pre-wrap">{ticket.description}</p>
            {ticket.attachments.length > 0 && (
              <div className="mt-3">
                <AttachmentList ticketId={ticket.id} attachments={ticket.attachments} />
              </div>
            )}
          </ChatBubble>

          {ticket.messages.map((m) => (
            <MessageBubble key={m.id} message={m} viewer="author" />
          ))}

          {awaitingFirstReply && (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-primary/30 bg-card px-4 py-3 text-sm text-muted-foreground">
              <Hourglass className="size-4 shrink-0 text-primary" />
              Our team has your request and will reply here, typically within 24 hours.
            </div>
          )}
        </div>
        {ticket.status === 'RESOLVED' && <ResolutionPrompt ticket={ticket} />}
        <ReplyBox ticket={ticket} />
      </section>

      <ConfirmDialog
        options={
          confirmOpen
            ? {
                title: 'Mark this ticket as resolved?',
                description: "This closes the ticket and lets our team know your issue is sorted. If you need help again, just reply here and it reopens.",
                confirmLabel: 'Yes, mark as resolved',
                onConfirm: () => markResolved.mutate(),
              }
            : null
        }
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  )
}
