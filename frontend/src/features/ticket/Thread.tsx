import { ArrowDown, Download, FileText, ImageIcon, Lock, Loader2, MessagesSquare, Sparkles } from 'lucide-react'
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { RelativeTime } from '@/components/common'
import { Avatar, fill, SegmentedControl } from '@/components/ds'
import { announce } from '@/components/shell/announce'
import { errorMessage } from '@/lib/api'
import { formatBytes } from '@/lib/format'
import type { Activity, Attachment, Message, StaffTicketDetail } from '@/lib/types'
import { cn } from '@/lib/utils'

import { activityLook, dayLabel, isOpenStatus, waitingOnUs, type ThreadFilter } from './ticket-ui'

const ECHOES = new Set(['CREATED', 'REPLIED', 'NOTE_ADDED', 'REQUESTER_REPLIED'])

type Item = { key: string; at: string; kind: 'message'; message: Message } | { key: string; at: string; kind: 'event'; activity: Activity }

function Attachments({ ticketId, attachments }: { ticketId: number; attachments: Attachment[] }) {
  const { api } = useWorkspace()
  const [busy, setBusy] = useState<number | null>(null)
  if (!attachments.length) return null
  const open = async (a: Attachment) => {
    setBusy(a.id)
    try {
      const { url } = await api.tickets.attachmentUrl(ticketId, a.id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }
  return (
    <ul className="mt-3 flex flex-wrap gap-2" aria-label={`${attachments.length} attachment${attachments.length > 1 ? 's' : ''}`}>
      {attachments.map((a) => {
        const image = a.content_type.startsWith('image/')
        const Icon = image ? ImageIcon : FileText
        return (
          <li key={a.id} className="min-w-0 max-w-full">
            <button
              type="button"
              onClick={() => open(a)}
              disabled={busy === a.id}
              aria-label={`Open ${a.original_name}, ${formatBytes(a.size)}`}
              className="group flex max-w-full items-center gap-2.5 rounded-control border border-line bg-surface py-1.5 pr-3 pl-1.5 text-left text-xs transition-colors hover:border-line-strong hover:bg-surface-2 disabled:opacity-60"
            >
              <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-chip', image ? 'bg-sky text-sky-ink' : 'bg-rose text-rose-ink')}>
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block max-w-44 truncate font-medium text-ink">{a.original_name}</span>
                <span className="text-ink-3">{formatBytes(a.size)}</span>
              </span>
              {busy === a.id ? <Loader2 className="size-4 animate-spin text-ink-3" aria-hidden /> : <Download className="size-4 text-ink-3 group-hover:text-ink" aria-hidden />}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function DayDivider({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-3 py-1 text-[11px] font-semibold tracking-wide text-ink-3 uppercase" aria-hidden>
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </li>
  )
}

/**
 * Something that happened to the ticket, shown in the conversation where it happened as one quiet centred line: the action's icon in
 * its colour, what changed ("In Progress → Resolved"), and who did it. The timeline beside the conversation carries the detailed view.
 */
function EventRow({ activity }: { activity: Activity }) {
  const { icon: Icon, hue } = activityLook(activity.action)
  const ai = activity.action.startsWith('AI_')
  return (
    <li className="flex justify-center px-6">
      <p className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-center text-[12.5px] leading-5 text-ink-3">
        <Icon className={cn('size-3.5 shrink-0', ai && 'text-ai')} style={ai ? undefined : { color: fill(hue) }} aria-hidden />
        <span className={cn('font-semibold', ai ? 'text-lav-ink' : 'text-ink-2')}>{activity.label}</span>
        {(activity.from_value || activity.to_value) && (
          <span className="text-ink-2">
            {activity.from_value && <>{activity.from_value} <span aria-hidden>→</span><span className="sr-only">changed to</span> </>}
            <span className="font-medium text-ink">{activity.to_value}</span>
          </span>
        )}
        <span>· {activity.actor_name ?? (ai ? 'AI' : 'System')} · <RelativeTime value={activity.created_at} /></span>
      </p>
    </li>
  )
}

function Bubble({ side, name, time, children, meta, tone, fresh, pending }: {
  side: 'left' | 'right'
  name: string
  time: string
  children: ReactNode
  meta?: ReactNode
  tone: 'customer' | 'agent'
  fresh?: boolean
  pending?: boolean
}) {
  return (
    <li className={cn('flex items-end gap-2.5', side === 'right' && 'flex-row-reverse', pending && 'opacity-70')} data-fresh={fresh || undefined}>
      <Avatar name={name} size="sm" className="shrink-0" />
      <div className={cn('flex max-w-[90%] min-w-0 flex-col sm:max-w-[82%]', side === 'right' ? 'items-end' : 'items-start')}>
        <div className={cn('mb-1 flex flex-wrap items-center gap-2 px-1 text-xs', side === 'right' && 'flex-row-reverse')}>
          <span className="font-semibold text-ink">{name}</span>
          {meta}
          {pending ? <span className="inline-flex items-center gap-1 text-ink-3"><Loader2 className="size-3 animate-spin" aria-hidden /> Sending…</span> : <RelativeTime value={time} className="text-ink-3" />}
        </div>
        <div
          className={cn(
            'min-w-0 rounded-panel px-4 py-3 text-[15px] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap transition-shadow duration-700',
            tone === 'agent'
              ? 'rounded-br-sm border border-violet/20 bg-violet-soft text-ink shadow-[0_1px_2px_rgb(11_122_92/0.08)]'
              : 'rounded-bl-sm border border-line bg-bubble text-ink shadow-panel',
            side === 'left' && tone === 'customer' && 'rounded-bl-sm',
            fresh && 'ring-2 ring-violet/50',
          )}
        >
          {children}
        </div>
      </div>
    </li>
  )
}

function NoteRow({ note, fresh }: { note: Message; fresh?: boolean }) {
  return (
    <li className="mx-auto w-full max-w-[94%]">
      <div className={cn('rounded-panel border border-note-line bg-note px-4 py-3 transition-shadow duration-700', fresh && 'ring-2 ring-note-solid/40')}>
        <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
          <Avatar name={note.sender_name} size="xs" />
          <span className="font-semibold text-ink">{note.sender_name}</span>
          <span className="inline-flex h-5 items-center gap-1 rounded-chip border border-note-line bg-note-2 px-1.5 text-[11.5px] font-semibold text-note-ink">
            <Lock className="size-3" aria-hidden /> Internal note · team only
          </span>
          <RelativeTime value={note.created_at} className="ml-auto text-ink-3" />
        </div>
        <p className="text-[15px] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap text-ink">{note.body}</p>
      </div>
    </li>
  )
}

/**
 * The conversation. "Messages" is the whole story in order: customer and agent messages, team notes, and every step in between
 * (AI triage, status, priority, owner changes) as a coloured event row. "Notes" narrows it to the team's notes. Date dividers, live arrival handling.
 */
export function Thread({ ticket, meName, filter, onFilterChange }: { ticket: StaffTicketDetail; meName?: string; filter: ThreadFilter; onFilterChange: (f: ThreadFilter) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const atBottom = useRef(true)
  const seen = useRef<Set<number> | null>(null)
  const [unseen, setUnseen] = useState(0)
  const [fresh, setFresh] = useState<Set<number>>(new Set())

  const body = useMemo(() => {
    const first = ticket.messages[0]
    return first && first.sender_is_requester && first.body === ticket.description ? ticket.messages.slice(1) : ticket.messages
  }, [ticket.messages, ticket.description])
  const name = ticket.requester_profile.name

  const items = useMemo<Item[]>(() => {
    const shown = filter === 'notes' ? body.filter((m) => m.is_internal) : body
    const out: Item[] = [
      ...shown.map((m): Item => ({ key: `m${m.id}`, at: m.created_at, kind: 'message', message: m })),
      // Steps that are a message themselves (created, replied, note added) would only repeat the bubble next to them; the timeline lists them.
      ...(filter === 'messages' ? ticket.activities.filter((a) => !ECHOES.has(a.action)).map((a): Item => ({ key: `a${a.id}`, at: a.created_at, kind: 'event', activity: a })) : []),
    ]
    return out.sort((x, y) => Date.parse(x.at) - Date.parse(y.at))
  }, [body, ticket.activities, filter])

  const toBottom = useCallback((smooth: boolean) => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  // Land on the latest message when the ticket opens.
  useLayoutEffect(() => {
    toBottom(false)
  }, [toBottom])

  // Arrivals: stick to the bottom when already there, otherwise offer a jump pill. Announce for screen readers.
  const ids = useMemo(() => body.filter((m) => m.id > 0).map((m) => m.id), [body])
  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(ids)
      return
    }
    const added = body.filter((m) => m.id > 0 && !seen.current!.has(m.id))
    if (!added.length) return
    added.forEach((m) => seen.current!.add(m.id))
    const others = added.filter((m) => m.sender_name !== meName)
    if (others.length) {
      announce(`${others.length} new ${others.length === 1 ? 'message' : 'messages'}, latest from ${others[others.length - 1].sender_name}`)
      const next = new Set(others.map((m) => m.id))
      setFresh((f) => new Set([...f, ...next]))
      setTimeout(() => setFresh((f) => new Set([...f].filter((x) => !next.has(x)))), 3500)
    }
    if (atBottom.current || added.some((m) => m.sender_name === meName)) requestAnimationFrame(() => toBottom(true))
    else if (others.length) setUnseen((n) => n + others.length)
  }, [ids, body, meName, toBottom])

  // A message just sent by me (optimistic, id < 0) always scrolls into view.
  const pendingCount = body.filter((m) => m.id < 0).length
  useEffect(() => {
    if (pendingCount) requestAnimationFrame(() => toBottom(true))
  }, [pendingCount, toBottom])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    atBottom.current = bottom
    if (bottom) setUnseen(0)
  }

  const rows = useMemo(() => {
    const labels = items.map((it) => dayLabel(it.at))
    return items.map((it, i) => {
      const prev = i === 0 ? dayLabel(ticket.created_at) : labels[i - 1]
      return { it, divider: labels[i] !== prev ? labels[i] : null }
    })
  }, [items, ticket.created_at])
  const noReplies = body.every((m) => m.is_internal || m.sender_is_requester)

  const noteCount = body.filter((m) => m.is_internal).length
  const messageCount = body.filter((m) => !m.is_internal).length + 1
  // The customer spoke last and the ticket is still open: their latest message is waiting on us.
  const lastPublic = [...body].reverse().find((m) => !m.is_internal)
  const awaiting = isOpenStatus(ticket.status) && waitingOnUs(ticket) ? { at: lastPublic?.created_at ?? ticket.created_at } : null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-stretch justify-between gap-3 border-b border-line bg-surface px-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3 py-3">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ink max-sm:hidden">
            <MessagesSquare className="size-4 text-ink-3" aria-hidden /> Conversation
          </h2>
          {awaiting && (
            <span className="inline-flex h-7 min-w-0 items-center gap-2 rounded-chip border border-sky-line bg-sky pr-2.5 pl-2 text-[12.5px] font-semibold whitespace-nowrap text-sky-ink">
              <span aria-hidden className="relative flex size-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-sky-ink/60 motion-reduce:hidden" />
                <span className="relative size-2 rounded-full bg-sky-ink" />
              </span>
              <span className="min-w-0 truncate">New message from {name.split(' ')[0]}</span>
              <span className="font-medium opacity-75 max-sm:hidden">· <RelativeTime value={awaiting.at} /></span>
            </span>
          )}
        </div>
        <SegmentedControl<ThreadFilter>
          ariaLabel="Show in conversation"
          size="sm"
          variant="underline"
          className="shrink-0"
          value={filter}
          onChange={onFilterChange}
          options={[
            { value: 'messages', label: 'Messages', count: messageCount },
            { value: 'notes', label: 'Notes', count: noteCount },
          ]}
        />
      </div>
      <div className="relative min-h-0 flex-1">
      <div ref={scrollRef} onScroll={onScroll} tabIndex={0} role="log" aria-label="Conversation messages" aria-live="off" className="scroll-quiet h-full overflow-y-auto bg-thread px-4 py-6 sm:px-7 [scroll-padding-bottom:1rem]">
        <ol className="flex flex-col gap-6">
          {filter !== 'notes' && (
            <>
              <DayDivider label={dayLabel(ticket.created_at)} />
              <Bubble side="left" name={name} time={ticket.created_at} tone="customer">
                {ticket.description}
                <Attachments ticketId={ticket.id} attachments={ticket.attachments} />
              </Bubble>
            </>
          )}
          {rows.map(({ it, divider }) => {
            return (
              <Fragment key={it.key}>
                {divider && <DayDivider label={divider} />}
                {it.kind === 'event' ? (
                  <EventRow activity={it.activity} />
                ) : it.message.is_internal ? (
                  <NoteRow note={it.message} fresh={fresh.has(it.message.id)} />
                ) : (
                  <Bubble
                    side={it.message.sender_is_requester ? 'left' : 'right'}
                    tone={it.message.sender_is_requester ? 'customer' : 'agent'}
                    name={it.message.sender_name}
                    time={it.message.created_at}
                    fresh={fresh.has(it.message.id)}
                    pending={it.message.id < 0}
                    meta={it.message.ai_draft_id ? <span className="inline-flex items-center gap-1 font-semibold text-lav-ink"><Sparkles className="size-3 text-ai" aria-hidden />{it.message.ai_draft_edited ? 'AI draft, edited' : 'AI draft'}</span> : null}
                  >
                    {it.message.body}
                  </Bubble>
                )}
              </Fragment>
            )
          })}
          {filter === 'notes' && noteCount === 0 && (
            <li className="rounded-control border border-dashed border-line-strong px-4 py-3 text-center text-[13px] text-ink-3">No team notes yet. Notes are only visible to your team.</li>
          )}
          {filter !== 'notes' && noReplies && ticket.status !== 'CLOSED' && (
            <li className="rounded-control border border-dashed border-line-strong px-4 py-3 text-center text-[13px] text-ink-3">
              No reply yet. The first reply stops the response clock.
            </li>
          )}
        </ol>
      </div>
      {unseen > 0 && (
        <button
          type="button"
          onClick={() => {
            toBottom(true)
            setUnseen(0)
          }}
          className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-control bg-ink px-3 py-1.5 text-xs font-semibold text-canvas shadow-pop focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
        >
          <ArrowDown className="size-3.5" aria-hidden /> {unseen} new {unseen === 1 ? 'message' : 'messages'}
        </button>
      )}
      </div>
    </div>
  )
}
