import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, ChevronRight, Loader2, Lock, MessagesSquare, RotateCcw, Send, Star } from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { RelativeTime } from '@/components/common'
import { ErrorState, fill, Kbd, on, SkeletonRows, SolidChip } from '@/components/ds'
import { announce } from '@/components/shell/announce'
import { AttachmentList, ChatBubble, DayDivider, MessageBubble, PersonAvatar } from '@/components/tickets/Thread'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Barcode } from '@/features/inbox/TicketCard'
import { portalBadges, REQUESTER_HUE } from '@/features/portal/model'
import { REQUESTER_STATUS } from '@/features/portal/status-meta'
import { StatusTimeline } from '@/features/portal/StatusTimeline'
import { usePersistentDraft } from '@/features/portal/usePersistentDraft'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

const FACT = 'text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase'

function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

/** 1-5 star rating as a radiogroup, sized to sit inside the conversation footer: arrow keys change the score, each star has a text label. */
function RatingPrompt({ ticketId, onDone }: { ticketId: number; onDone: () => void }) {
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
    <div aria-labelledby="csat-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p id="csat-title" className="text-sm font-semibold text-ink">
            How did we do?
          </p>
          <p className="text-[13px] text-ink-2">{score ? RATING_WORD[score] : 'Your rating helps the team keep improving.'}</p>
        </div>
        <div className="-ml-1.5 flex" role="radiogroup" aria-label="Rating" onKeyDown={onKey}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={score === n}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              tabIndex={score === n || (score === 0 && n === 1) ? 0 : -1}
              onClick={() => setScore(n)}
              className="flex size-10 items-center justify-center rounded-control outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-violet motion-reduce:hover:scale-100"
            >
              <Star className={cn('size-7 transition-colors', n <= score ? 'fill-butter-ink text-butter-ink' : 'text-line-strong')} aria-hidden />
            </button>
          ))}
        </div>
      </div>
      {score > 0 && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} maxLength={500} aria-label="Feedback (optional)" placeholder="Anything we could have done better? (optional)" className="bg-surface" />
          <Button onClick={() => rate.mutate()} disabled={rate.isPending} className="shrink-0">
            {rate.isPending && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />} Submit rating
          </Button>
        </div>
      )}
    </div>
  )
}

const RATING_WORD: Record<number, string> = { 1: 'Poor', 2: 'Could be better', 3: 'Okay', 4: 'Good', 5: 'Excellent' }

/** The rating the customer already gave, with their comment. */
function RatingGiven({ score, comment }: { score: number; comment: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">Your rating</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex gap-0.5" role="img" aria-label={`${score} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className={cn('size-5', n <= score ? 'fill-butter-ink text-butter-ink' : 'text-line-strong')} aria-hidden />
            ))}
          </span>
          <span className="text-[13px] font-semibold text-ink-2">
            {score}/5 · {RATING_WORD[score]}
          </span>
        </div>
        {comment && <blockquote className="mt-2.5 border-l-2 border-butter-line pl-3 text-sm text-ink-2 italic">&ldquo;{comment}&rdquo;</blockquote>}
      </div>
      <span className="shrink-0 text-[13px] text-ink-3">Thanks for the feedback</span>
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
  const [reply, setReply] = usePersistentDraft(`helpdesk.requester-reply.${slug}.${ticketId}`)
  const [sendError, setSendError] = useState<string | null>(null)
  const [reopening, setReopening] = useState(false)
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

  useEffect(() => {
    if (reopening) replyRef.current?.focus()
  }, [reopening])

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
  const hue = REQUESTER_HUE[ticket.status]
  // the confirm banner sits right below, so it carries that message; the rating has its own line at the bottom
  const badges = portalBadges(ticket).filter((b) => b.kind === 'reply')
  const canSend = !!reply.trim() && !send.isPending

  const composer = (
    <form
      aria-label="Reply"
      onSubmit={(e: React.FormEvent) => {
        e.preventDefault()
        if (canSend) send.mutate()
      }}
    >
      {closed && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-control border border-line bg-surface px-3 py-2 text-[13px] text-ink-2">
          <span className="flex items-center gap-2">
            <RotateCcw className="size-4 text-brand" aria-hidden /> Sending a reply reopens this request.
          </span>
          <button type="button" onClick={() => setReopening(false)} className="rounded-sm font-semibold text-ink hover:underline focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none">
            Cancel
          </button>
        </div>
      )}
      <div
        className={cn(
          'overflow-hidden rounded-panel border bg-surface transition-[border-color,box-shadow]',
          'border-brand/50 shadow-[0_12px_32px_-14px_color-mix(in_srgb,var(--brand)_45%,transparent)]',
          'focus-within:border-brand focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand)_15%,transparent)]',
        )}
      >
        <label htmlFor="reply" className="sr-only">
          Your reply
        </label>
        <Textarea
          id="reply"
          ref={replyRef}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSend) send.mutate()
          }}
          rows={3}
          maxLength={5000}
          aria-describedby={sendError ? 'reply-err' : 'reply-hint'}
          placeholder={closed ? 'Tell us what you still need help with…' : 'Write a reply…'}
          className="min-h-[calc(3lh+1.25rem)] resize-none border-0 bg-transparent px-4 py-2.5 text-[15px] leading-relaxed shadow-none focus-visible:ring-0"
        />
        {sendError && (
          <p id="reply-err" role="alert" className="flex items-start gap-1.5 border-t border-rose-line bg-rose px-4 py-2 text-[13px] font-medium text-rose-ink">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> Your reply wasn&rsquo;t sent: {sendError}. It&rsquo;s still in the box, so you can try again.
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-surface-2 px-2.5 py-2.5 sm:px-3">
          <span id="reply-hint" className="px-1.5 text-xs text-ink-3">
            {reply.length > 0 ? 'Draft saved on this device' : 'We reply in this thread'}
          </span>
          <Button type="submit" disabled={!canSend} className="bg-brand text-on-brand hover:bg-brand/90">
            {send.isPending ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Send aria-hidden />}
            {send.isPending ? 'Sending…' : sendError ? 'Retry' : closed ? 'Send and reopen' : 'Send'}
            <Kbd keys="mod+enter" inverse className="ml-1 max-md:hidden" />
          </Button>
        </div>
      </div>
    </form>
  )

  const rating = ticket.csat_score ? <RatingGiven score={ticket.csat_score} comment={ticket.csat_comment} /> : <RatingPrompt ticketId={ticket.id} onDone={refresh} />

  const footer = resolved ? (
    <section aria-labelledby="resolved-title" className="overflow-hidden rounded-panel border border-butter-line bg-surface shadow-card">
      <div className="flex flex-col gap-4 bg-butter px-4 py-4 sm:flex-row sm:items-center sm:px-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-butter-ink shadow-card" aria-hidden>
          <CheckCircle2 className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="resolved-title" className="text-base font-semibold text-butter-ink">
            Our team marked this as resolved
          </h2>
          <p className="mt-0.5 text-sm text-butter-ink/85">Did that solve it? Confirm to close, or tell us you still need help.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button onClick={() => confirm.mutate(true)} disabled={confirm.isPending} className="bg-brand text-on-brand hover:bg-brand/90">
            <CheckCircle2 aria-hidden /> Yes, it&rsquo;s sorted
          </Button>
          <Button variant="outline" onClick={() => confirm.mutate(false)} disabled={confirm.isPending} className="bg-surface">
            <RotateCcw aria-hidden /> Still need help
          </Button>
        </div>
      </div>
      <div className="border-t border-butter-line px-4 py-4 sm:px-5">{rating}</div>
    </section>
  ) : closed && !reopening ? (
    <section aria-labelledby="closed-title" className="overflow-hidden rounded-panel border border-line bg-surface shadow-card">
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sunken text-ink-2" aria-hidden>
          <Lock className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="closed-title" className="text-base font-semibold text-ink">
            This request is closed
          </h2>
          <p className="mt-0.5 text-sm text-ink-2">
            Closed <RelativeTime value={ticket.updated_at} />. Need more help with it? Reopen it and send us a reply.
          </p>
        </div>
        <Button variant="outline" onClick={() => setReopening(true)} className="shrink-0">
          <RotateCcw aria-hidden /> Reopen request
        </Button>
      </div>
      <div className="border-t border-line bg-surface-2 px-4 py-4 sm:px-5">{rating}</div>
    </section>
  ) : (
    composer
  )

  return (
    <div className="flex flex-col gap-5 pb-2">
      <nav aria-label="Breadcrumb">
        <ol className="flex min-w-0 items-center gap-2 text-[15px]">
          <li>
            <Link to={`/w/${slug}/help`} className="rounded-sm font-medium whitespace-nowrap text-ink-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none">
              My requests
            </Link>
          </li>
          <li aria-hidden className="text-ink-3">
            <ChevronRight className="size-4" />
          </li>
          <li className="min-w-0 truncate font-mono font-semibold text-ink" aria-current="page">
            {ticket.reference}
          </li>
        </ol>
      </nav>

      <header className={cn('relative', badges.length > 0 && 'mt-9')}>
        {badges.length > 0 && (
          <span className="absolute bottom-full left-6 flex items-end gap-1.5 sm:left-8">
            {badges.map((b) => (
              <span key={b.kind} className="inline-flex h-8 items-center gap-1.5 rounded-t-xl px-3 text-[13px] font-semibold whitespace-nowrap" style={{ background: fill(b.hue), color: on(b.hue) }}>
                <b.icon className="size-3.5" aria-hidden />
                {b.label}
              </span>
            ))}
          </span>
        )}
        <div className="relative drop-shadow-[0_1px_2px_rgb(60_40_20/0.10)] drop-shadow-[0_12px_20px_rgb(60_40_20/0.09)]">
          <div className="ticket-notch overflow-hidden rounded-panel bg-surface [--stub-w:17rem]">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_var(--stub-w)]">
              <div className="flex min-w-0 flex-col gap-5 p-5 sm:p-6">
                <div>
                  <h1 className="text-[22px] leading-8 font-semibold tracking-tight text-balance sm:text-[26px]">{ticket.subject}</h1>
                  <p className="mt-1.5 text-[15px] leading-6 text-ink-2">{meta.hint}</p>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-4 sm:grid-cols-4">
                  <div>
                    <dt className={FACT}>Status</dt>
                    <dd className="mt-1.5">
                      <SolidChip hue={hue} icon={meta.icon}>
                        {meta.label}
                      </SolidChip>
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className={FACT}>About</dt>
                    <dd className="mt-1.5 truncate text-[15px] leading-7 font-semibold text-ink">{ticket.record ? ticket.record.title : 'General question'}</dd>
                  </div>
                  <div>
                    <dt className={FACT}>Opened</dt>
                    <dd className="mt-1.5 text-[15px] leading-7 font-semibold text-ink">
                      <RelativeTime value={ticket.created_at} />
                    </dd>
                  </div>
                  <div>
                    <dt className={FACT}>Messages</dt>
                    <dd className="mt-1.5 text-[15px] leading-7 font-semibold text-ink tabular-nums">{items.length + 1}</dd>
                  </div>
                </dl>
                <div className="border-t border-line pt-5">
                  <StatusTimeline ticket={ticket} />
                </div>
              </div>
              <div
                className="flex flex-col justify-between gap-4 border-t-2 border-dashed p-5 sm:p-6 lg:border-t-0 lg:border-l-2"
                style={{ background: `color-mix(in srgb, ${fill(hue)} 22%, var(--surface))`, borderColor: `color-mix(in srgb, ${fill(hue)} 60%, transparent)` }}
              >
                <div>
                  <p className={FACT}>Request</p>
                  <p className="font-mono text-xl leading-6 font-bold tracking-tight text-ink">{ticket.reference}</p>
                  <div className="mt-2" style={{ color: fill(hue) }}>
                    <Barcode code={ticket.reference} />
                  </div>
                </div>
                <p className="text-[13px] leading-5 font-medium text-ink-2">Keep this reference if you contact us another way.</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section aria-label="Conversation" className="flex flex-col overflow-hidden rounded-panel border border-line bg-thread shadow-panel">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 sm:px-5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ink">
            <MessagesSquare className="size-4 text-ink-3" aria-hidden /> Conversation
          </h2>
          <span className="text-xs text-ink-3">
            {ticket.messages.length} message{ticket.messages.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="space-y-5 px-4 py-6 sm:px-6">
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
          {items.length === 0 && !closed && (
            <p className="rounded-control border border-dashed border-line-strong px-4 py-3 text-center text-[13px] text-ink-3">Thanks for reaching out. We&rsquo;ll reply here soon.</p>
          )}
          <div ref={endRef} />
        </div>

        <div className="shrink-0 border-t border-line bg-thread px-3 pt-3 pb-3 sm:px-5 sm:pb-5">{footer}</div>
      </section>
    </div>
  )
}
