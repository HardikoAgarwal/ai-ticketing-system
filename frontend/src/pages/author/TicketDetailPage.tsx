import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, CheckCircle2, Loader2, MessageCircle, RotateCcw, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { StatusBadge } from '@/components/badges'
import { RelativeTime } from '@/components/common'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import { AttachmentList, MessageBubble } from '@/components/tickets/Thread'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, errorMessage } from '@/lib/api'
import { ticketsApi } from '@/lib/endpoints'
import { formatDateTime } from '@/lib/format'
import type { AuthorTicketDetail, TicketStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

const STEPS: { key: TicketStatus; label: string }[] = [
  { key: 'OPEN', label: 'Submitted' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'RESOLVED', label: 'Resolved' },
]

function StatusTimeline({ status }: { status: TicketStatus }) {
  const index = status === 'CLOSED' ? 2 : STEPS.findIndex((s) => s.key === status)
  return (
    <ol className="flex items-center gap-2 text-xs">
      {STEPS.map((step, i) => (
        <li key={step.key} className="flex items-center gap-2">
          <span
            className={cn(
              'flex size-5 items-center justify-center rounded-full border text-[10px]',
              i <= index ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground',
            )}
          >
            {i < index || status === 'CLOSED' || (i === index && status === 'RESOLVED') ? <Check className="size-3" /> : i + 1}
          </span>
          <span className={i <= index ? 'font-medium' : 'text-muted-foreground'}>{step.label}</span>
          {i < STEPS.length - 1 && <span className={cn('h-px w-6 sm:w-10', i < index ? 'bg-primary' : 'bg-border')} />}
        </li>
      ))}
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
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-emerald-900">
        <CheckCircle2 className="size-4" /> We've marked this as resolved. Did this solve your issue?
      </p>
      {!needsHelp ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => mutation.mutate(true)} disabled={mutation.isPending}>
            {mutation.isPending && mutation.variables === true ? <Loader2 className="animate-spin" /> : <Check />} Yes, close ticket
          </Button>
          <Button size="sm" variant="outline" onClick={() => setNeedsHelp(true)} disabled={mutation.isPending}>
            <RotateCcw /> No, I still need help
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <Textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what's still not working (optional)"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => mutation.mutate(false)} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="animate-spin" />} Reopen ticket
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setNeedsHelp(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
          </div>
        </div>
      )}
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

  return (
    <div className="rounded-xl border bg-card p-3">
      <Textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={ticket.status === 'CLOSED' ? 'Need more help? Writing here reopens the ticket.' : 'Add more details or reply to BookLeaf…'}
        className="border-0 shadow-none focus-visible:ring-0"
      />
      <div className="flex items-center justify-between px-1 pt-2">
        <p className="text-xs text-muted-foreground">BookLeaf is notified instantly.</p>
        <Button size="sm" onClick={() => mutation.mutate()} disabled={!body.trim() || mutation.isPending}>
          {mutation.isPending ? <Loader2 className="animate-spin" /> : <Send />} Send
        </Button>
      </div>
    </div>
  )
}

export function TicketDetailPage() {
  const id = Number(useParams().id)
  const queryClient = useQueryClient()
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

  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/author/tickets">
          <ArrowLeft /> My Tickets
        </Link>
      </Button>

      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {ticket.reference} · {ticket.book ? ticket.book.title : 'General / Account Level'}
            </p>
            <h1 className="mt-1 text-lg font-semibold">{ticket.subject}</h1>
            <p className="mt-1 text-xs text-muted-foreground">Submitted {formatDateTime(ticket.created_at)}</p>
          </div>
          <StatusBadge status={ticket.status} audience="author" />
        </div>
        <div className="mt-4 border-t pt-4">
          <StatusTimeline status={ticket.status} />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex gap-3">
          <div className="w-8 shrink-0" />
          <div className="min-w-0 flex-1 rounded-xl border bg-card px-4 py-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Your request</span>
              <RelativeTime value={ticket.created_at} className="text-muted-foreground" />
            </div>
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
            {ticket.attachments.length > 0 && (
              <div className="mt-3">
                <AttachmentList ticketId={ticket.id} attachments={ticket.attachments} />
              </div>
            )}
          </div>
        </div>

        {ticket.messages.map((m) => (
          <MessageBubble key={m.id} message={m} viewer="author" />
        ))}

        {!ticket.messages.some((m) => m.sender_role === 'ADMIN') && ticket.status === 'OPEN' && (
          <div className="rounded-xl border border-dashed bg-card px-4 py-3 text-sm text-muted-foreground">
            Our team has received your request and will reply here, typically within 24 hours. This page updates automatically.
          </div>
        )}

        {ticket.status === 'RESOLVED' && <ResolutionPrompt ticket={ticket} />}
        <ReplyBox ticket={ticket} />
      </div>
    </div>
  )
}
