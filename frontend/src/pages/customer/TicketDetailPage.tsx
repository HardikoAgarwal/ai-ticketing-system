import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Loader2, MessagesSquare, Package, RotateCcw, Send, Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { StatusBadge } from '@/components/badges'
import { RelativeTime } from '@/components/common'
import { Surface, SurfaceHeader, surface } from '@/components/dashboard/surface'
import { usePersistentText } from '@/components/agent/Composer'
import { ErrorState, ListSkeleton } from '@/components/states'
import { AttachmentList, ChatBubble, MessageBubble, PersonAvatar } from '@/components/tickets/Thread'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/auth/AuthContext'
import { cn } from '@/lib/utils'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

function Csat({ ticketId, onDone }: { ticketId: number; onDone: () => void }) {
  const { api } = useWorkspace()
  const [score, setScore] = useState(0)
  const [comment, setComment] = useState('')
  const rate = useMutation({
    mutationFn: () => api.tickets.csat(ticketId, score, comment || undefined),
    onSuccess: () => {
      toast.success('Thanks for the feedback!')
      onDone()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
  return (
    <div className={cn(surface, "p-5 sm:p-6")}>
      <p className="text-base font-semibold">How did we do?</p>
      <p className="mt-0.5 text-sm text-muted-foreground">Your rating helps the team keep improving.</p>
      <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={score === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setScore(n)} className="rounded p-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            <Star className={cn('size-7 transition-colors', n <= score ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40')} />
          </button>
        ))}
      </div>
      {score > 0 && (
        <div className="mt-3 space-y-2">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} maxLength={500} placeholder="Anything we could have done better? (optional)" />
          <Button size="sm" onClick={() => rate.mutate()} disabled={rate.isPending}>
            {rate.isPending && <Loader2 className="animate-spin" />} Submit rating
          </Button>
        </div>
      )}
    </div>
  )
}

export function TicketDetailPage() {
  const { slug, api } = useWorkspace()
  const { id } = useParams()
  const ticketId = Number(id)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const refetchInterval = useFallbackInterval()
  const [reply, setReply] = usePersistentText(`helpdesk.requester-reply.${slug}.${ticketId}`)
  const endRef = useRef<HTMLDivElement>(null)

  const { data: ticket, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['ticket', ticketId, slug],
    queryFn: () => api.tickets.getRequester(ticketId),
    refetchInterval,
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
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [msgCount])

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
    queryClient.invalidateQueries({ queryKey: ['tickets'] })
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  const send = useMutation({
    mutationFn: () => api.tickets.postMessage(ticketId, { body: reply }),
    onSuccess: () => {
      setReply('')
      refresh()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
  const confirm = useMutation({
    mutationFn: (resolved: boolean) => api.tickets.confirmResolution(ticketId, resolved),
    onSuccess: (_d, resolved) => {
      toast.success(resolved ? "Great, glad that's sorted. Ticket closed." : 'Reopened. Our team will take another look.')
      refresh()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  if (isLoading) return <ListSkeleton rows={5} />
  if (isError || !ticket) return <ErrorState error={error} onRetry={() => refetch()} />

  const first = ticket.messages[0]
  const thread = first && first.sender_is_requester && first.body === ticket.description ? ticket.messages.slice(1) : ticket.messages
  const resolved = ticket.status === 'RESOLVED'
  const closed = ticket.status === 'CLOSED'

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={`/w/${slug}/help`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> My tickets
      </Link>

      <header className={cn(surface, 'mb-5 p-5 sm:p-6')}>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs font-semibold text-foreground/80">{ticket.reference}</span>
          <StatusBadge status={ticket.status} audience="requester" size="card" />
          {ticket.record && (
            <span className="inline-flex h-7 items-center gap-1.5 rounded-md border bg-background px-3 text-[13px] font-medium text-muted-foreground">
              <Package className="size-3.5" /> {ticket.record.title}
            </span>
          )}
        </div>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-balance sm:text-2xl">{ticket.subject}</h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Opened <RelativeTime value={ticket.created_at} />
        </p>
      </header>

      {resolved && (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">Our team marked this as resolved</p>
              <p className="text-xs text-emerald-800/80">Did that solve it? Confirm to close, or tell us you still need help.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => confirm.mutate(true)} disabled={confirm.isPending}>
              Yes, it's sorted
            </Button>
            <Button size="sm" variant="outline" onClick={() => confirm.mutate(false)} disabled={confirm.isPending}>
              <RotateCcw /> Still need help
            </Button>
          </div>
        </div>
      )}

      <Surface aria-label="Conversation">
        <SurfaceHeader icon={MessagesSquare} tone="violet" title="Conversation" right={<span className="text-xs text-muted-foreground">{ticket.messages.length} message{ticket.messages.length === 1 ? '' : 's'}</span>} />
        <div className="space-y-5 p-4 sm:p-6">
        <ChatBubble side="right" name="You" variant="customer" time={ticket.created_at} avatar={<PersonAvatar name={user?.full_name ?? 'You'} variant="customer" />}>
          <p className="whitespace-pre-wrap">{ticket.description}</p>
          <div className="mt-3 empty:hidden">
            <AttachmentList ticketId={ticket.id} attachments={ticket.attachments} />
          </div>
        </ChatBubble>
        {thread.map((m) => (
          <MessageBubble key={m.id} message={m} viewer="requester" />
        ))}
        {thread.length === 0 && <p className="text-center text-sm text-muted-foreground">Thanks for reaching out. We'll reply here soon.</p>}
        <div ref={endRef} />
        </div>
      </Surface>

      {(resolved || closed) && !ticket.csat_score && (
        <div className="mt-5">
          <Csat ticketId={ticket.id} onDone={refresh} />
        </div>
      )}
      {ticket.csat_score && (
        <p className="mt-5 flex items-center gap-1.5 text-sm text-muted-foreground">
          You rated this <Star className="size-4 fill-amber-400 text-amber-400" /> {ticket.csat_score}/5. Thank you!
        </p>
      )}

      <div className={cn(surface, "mt-5 p-4 sm:p-5")}>
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && reply.trim() && !send.isPending) send.mutate()
          }}
          rows={3}
          maxLength={5000}
          aria-label="Your reply"
          placeholder={closed ? 'Reply to reopen this ticket…' : 'Write a reply…'}
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{closed ? 'Replying reopens this ticket.' : '⌘ + Enter to send'}</span>
          <Button onClick={() => send.mutate()} disabled={!reply.trim() || send.isPending}>
            {send.isPending ? <Loader2 className="animate-spin" /> : <Send />} Send
          </Button>
        </div>
      </div>
    </div>
  )
}
