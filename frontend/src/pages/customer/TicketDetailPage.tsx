import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, MessagesSquare, Package, RotateCcw, Send, Star } from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { RelativeTime } from '@/components/common'
import { Chip, ErrorState, Panel, PanelHeader, SkeletonRows } from '@/components/ds'
import { announce } from '@/components/shell/announce'
import { AttachmentList, ChatBubble, DayDivider, MessageBubble, PersonAvatar } from '@/components/tickets/Thread'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { NewReplyChip, RequesterStatusChip } from '@/features/portal/status'
import { REQUESTER_STATUS } from '@/features/portal/status-meta'
import { StatusTimeline } from '@/features/portal/StatusTimeline'
import { usePersistentDraft } from '@/features/portal/usePersistentDraft'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

/** 1-5 star rating as a radiogroup: arrow keys change the score, each star has a text label. */
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
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      setScore((s) => Math.min(5, s + 1))
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      setScore((s) => Math.max(1, s - 1))
    }
  }
  return (
    <Panel padded aria-labelledby="csat-title">
      <h2 id="csat-title" className="text-base font-semibold text-ink">
        How did we do?
      </h2>
      <p className="mt-0.5 text-sm text-ink-2">Your rating helps the team keep improving.</p>
      <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Rating" onKeyDown={onKey}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={score === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            tabIndex={score === n || (score === 0 && n === 1) ? 0 : -1}
            onClick={() => setScore(n)}
            className="flex size-11 items-center justify-center rounded-control outline-none hover:bg-sunken focus-visible:ring-2 focus-visible:ring-violet"
          >
            <Star className={cn('size-7 transition-colors', n <= score ? 'fill-butter-ink text-butter-ink' : 'text-line-strong')} aria-hidden />
          </button>
        ))}
      </div>
      {score > 0 && (
        <div className="mt-3 space-y-2">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} maxLength={500} aria-label="Feedback (optional)" placeholder="Anything we could have done better? (optional)" />
          <Button size="sm" onClick={() => rate.mutate()} disabled={rate.isPending}>
            {rate.isPending && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />} Submit rating
          </Button>
        </div>
      )}
    </Panel>
  )
}

export function TicketDetailPage() {
  const { slug, api } = useWorkspace()
  const { id } = useParams()
  const ticketId = Number(id)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const refetchInterval = useFallbackInterval()
  const [reply, setReply] = usePersistentDraft(`helpdesk.requester-reply.${slug}.${ticketId}`)
  const [sendError, setSendError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const replyRef = useRef<HTMLTextAreaElement>(null)

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

  // New messages: announce and scroll, but never jump the page on first load.
  const msgCount = ticket?.messages.length ?? 0
  const seenCount = useRef<number | null>(null)
  const lastStatus = useRef<string | null>(null)
  useEffect(() => {
    if (!ticket) return
    if (seenCount.current !== null && msgCount > seenCount.current) {
      const latest = ticket.messages[msgCount - 1]
      if (latest && !latest.sender_is_requester) announce(`New reply from ${latest.sender_name}.`)
      endRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' })
    }
    seenCount.current = msgCount
    if (lastStatus.current && lastStatus.current !== ticket.status) announce(`Status changed to ${REQUESTER_STATUS[ticket.status].label}.`)
    lastStatus.current = ticket.status
  }, [ticket, msgCount])

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
    queryClient.invalidateQueries({ queryKey: ['tickets'] })
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  const send = useMutation({
    mutationFn: () => api.tickets.postMessage(ticketId, { body: reply }),
    onMutate: () => setSendError(null),
    onSuccess: () => {
      setReply('')
      announce('Reply sent.')
      refresh()
    },
    // the text stays in the box so nothing is lost; the user can retry
    onError: (err) => setSendError(errorMessage(err)),
  })
  const confirm = useMutation({
    mutationFn: (resolved: boolean) => api.tickets.confirmResolution(ticketId, resolved),
    onSuccess: (_d, resolved) => {
      toast.success(resolved ? "Great, glad that's sorted. Request closed." : 'Reopened. Our team will take another look.')
      refresh()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const items = useMemo(() => {
    if (!ticket) return []
    const first = ticket.messages[0]
    return first && first.sender_is_requester && first.body === ticket.description ? ticket.messages.slice(1) : ticket.messages
  }, [ticket])

  const rows = useMemo(
    () =>
      items.map((m, i) => {
        const label = dayLabel(m.created_at)
        const before = i === 0 ? ticket?.created_at : items[i - 1].created_at
        return { m, label, divider: !before || label !== dayLabel(before) }
      }),
    [items, ticket],
  )

  if (isLoading) return <SkeletonRows rows={5} />
  if (isError || !ticket) return <ErrorState error={error} onRetry={() => refetch()} />

  const resolved = ticket.status === 'RESOLVED'
  const closed = ticket.status === 'CLOSED'
  const meta = REQUESTER_STATUS[ticket.status]

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={`/w/${slug}/help`} className="mb-4 inline-flex min-h-9 items-center gap-1.5 rounded-control text-sm font-medium text-ink-2 outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-violet">
        <ArrowLeft className="size-4" aria-hidden /> My requests
      </Link>

      <Panel as="header" className="mb-5">
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-chip bg-sunken px-2 py-1 font-mono text-xs font-semibold text-ink-2">{ticket.reference}</span>
            <RequesterStatusChip status={ticket.status} />
            {ticket.has_unread && <NewReplyChip />}
            {ticket.record && (
              <Chip tone="slate" icon={Package}>
                {ticket.record.title}
              </Chip>
            )}
          </div>
          <h1 className="mt-3 text-xl leading-snug font-semibold tracking-tight text-balance sm:text-2xl">{ticket.subject}</h1>
          <p className="mt-1.5 text-sm text-ink-3">
            Opened <RelativeTime value={ticket.created_at} /> · {meta.hint}
          </p>
        </div>
        <div className="border-t border-line bg-surface-2 px-5 py-4 sm:px-6">
          <StatusTimeline ticket={ticket} />
        </div>
      </Panel>

      {resolved && (
        <section aria-label="Confirm resolution" className="mb-5 flex flex-col gap-3 rounded-panel border border-mint-line bg-mint p-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-mint-ink" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-mint-ink">Our team marked this as resolved</p>
              <p className="text-[13px] text-mint-ink/85">Did that solve it? Confirm to close, or tell us you still need help.</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="sm" onClick={() => confirm.mutate(true)} disabled={confirm.isPending}>
              Yes, it&rsquo;s sorted
            </Button>
            <Button size="sm" variant="outline" onClick={() => confirm.mutate(false)} disabled={confirm.isPending}>
              <RotateCcw aria-hidden /> Still need help
            </Button>
          </div>
        </section>
      )}

      <Panel aria-label="Conversation" className="overflow-hidden">
        <PanelHeader
          icon={MessagesSquare}
          title="Conversation"
          actions={
            <span className="text-xs text-ink-3">
              {ticket.messages.length} message{ticket.messages.length === 1 ? '' : 's'}
            </span>
          }
        />
        <div className="space-y-5 p-4 sm:p-6">
          <DayDivider label={dayLabel(ticket.created_at)} />
          <ChatBubble side="right" name="You" variant="customer" time={ticket.created_at} avatar={<PersonAvatar name={user?.full_name ?? 'You'} variant="customer" />}>
            <p className="whitespace-pre-wrap">{ticket.description}</p>
            <div className="mt-3 empty:hidden">
              <AttachmentList ticketId={ticket.id} attachments={ticket.attachments} />
            </div>
          </ChatBubble>
          {rows.map(({ m, label, divider }) => (
            <Fragment key={m.id}>
              {divider && <DayDivider label={label} />}
              <MessageBubble message={m} viewer="requester" />
            </Fragment>
          ))}
          {items.length === 0 && !closed && <p className="text-center text-sm text-ink-3">Thanks for reaching out. We&rsquo;ll reply here soon.</p>}
          <div ref={endRef} />
        </div>
      </Panel>

      {(resolved || closed) && !ticket.csat_score && (
        <div className="mt-5">
          <Csat ticketId={ticket.id} onDone={refresh} />
        </div>
      )}
      {ticket.csat_score && (
        <p className="mt-5 flex items-center gap-1.5 text-sm text-ink-2">
          You rated this <Star className="size-4 fill-butter-ink text-butter-ink" aria-hidden /> {ticket.csat_score}/5. Thank you!
        </p>
      )}

      <Panel as="form" className="mt-5 p-4 sm:p-5" aria-label="Reply" onSubmit={(e: React.FormEvent) => { e.preventDefault(); if (reply.trim() && !send.isPending) send.mutate() }}>
        {closed && (
          <p className="mb-3 flex items-center gap-2 rounded-control bg-sunken px-3 py-2 text-[13px] text-ink-2">
            This request is closed. Sending a reply reopens it.
          </p>
        )}
        <label htmlFor="reply" className="sr-only">
          Your reply
        </label>
        <Textarea
          id="reply"
          ref={replyRef}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && reply.trim() && !send.isPending) send.mutate()
          }}
          rows={3}
          maxLength={5000}
          aria-describedby={sendError ? 'reply-err' : 'reply-hint'}
          placeholder={closed ? 'Reply to reopen this request…' : 'Write a reply…'}
        />
        {sendError && (
          <p id="reply-err" role="alert" className="mt-2 flex items-start gap-1.5 text-[13px] font-medium text-rose-ink">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> Your reply wasn&rsquo;t sent: {sendError}. It&rsquo;s still in the box, so you can try again.
          </p>
        )}
        <div className="mt-3 flex items-center justify-between gap-3">
          <span id="reply-hint" className="text-xs text-ink-3">
            {reply.length > 0 ? 'Draft saved on this device · ' : ''}
            <kbd className="font-sans">Ctrl/⌘ + Enter</kbd> to send
          </span>
          <Button type="submit" disabled={!reply.trim() || send.isPending}>
            {send.isPending ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Send aria-hidden />} {send.isPending ? 'Sending…' : sendError ? 'Retry' : 'Send'}
          </Button>
        </div>
      </Panel>
    </div>
  )
}
