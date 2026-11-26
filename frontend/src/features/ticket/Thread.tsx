import { ArrowDown, Download, FileText, ImageIcon, Lock, Loader2, Sparkles, UserCheck, Activity as ActivityIcon, Tag, Flame, CheckCheck, RotateCcw } from 'lucide-react'
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { RelativeTime } from '@/components/common'
import { Avatar, Chip, SegmentedControl } from '@/components/ds'
import { announce } from '@/components/shell/announce'
import { errorMessage } from '@/lib/api'
import { formatBytes } from '@/lib/format'
import type { Activity, Attachment, Message, StaffTicketDetail } from '@/lib/types'
import { cn } from '@/lib/utils'

import { dayLabel, type ThreadFilter } from './ticket-ui'

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

const EVENT_ICONS: Record<string, typeof ActivityIcon> = { assigned: UserCheck, status: CheckCheck, resolved: CheckCheck, reopened: RotateCcw, category: Tag, priority: Flame }

function EventRow({ activity }: { activity: Activity }) {
  const Icon = Object.entries(EVENT_ICONS).find(([k]) => activity.action.toLowerCase().includes(k))?.[1] ?? ActivityIcon
  return (
    <li className="flex items-center justify-center gap-2 text-xs text-ink-3">
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 truncate">
        <span className="font-medium text-ink-2">{activity.label}</span>
        {(activity.from_value || activity.to_value) && <> {activity.from_value ? `${activity.from_value} → ` : ''}{activity.to_value}</>}
        {' · '}{activity.actor_name ?? 'System'} · <RelativeTime value={activity.created_at} />
      </span>
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
            tone === 'agent' ? 'rounded-br-sm bg-violet-soft text-ink' : 'rounded-bl-sm border border-line bg-surface text-ink shadow-panel',
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
      <div className={cn('rounded-panel border border-butter-line bg-butter px-4 py-3 transition-shadow duration-700', fresh && 'ring-2 ring-butter-ink/40')}>
        <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
          <Avatar name={note.sender_name} size="xs" />
          <span className="font-semibold text-ink">{note.sender_name}</span>
          <Chip tone="amber" icon={Lock} size="sm">Internal note · team only</Chip>
          <RelativeTime value={note.created_at} className="ml-auto text-ink-3" />
        </div>
        <p className="text-[15px] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap text-butter-ink">{note.body}</p>
      </div>
    </li>
  )
}

/** The message list: customer, agent and internal-note rows, system events inline, date dividers, live arrival handling. */
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
    const shown = body.filter((m) => (filter === 'notes' ? m.is_internal : filter === 'messages' ? !m.is_internal : true))
    const out: Item[] = [
      ...shown.map((m): Item => ({ key: `m${m.id}`, at: m.created_at, kind: 'message', message: m })),
      ...(filter === 'all' ? ticket.activities.map((a): Item => ({ key: `a${a.id}`, at: a.created_at, kind: 'event', activity: a })) : []),
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-line bg-surface px-3 py-2 sm:px-5">
        <h2 className="text-sm font-semibold text-ink max-sm:hidden">Conversation <span className="font-normal text-ink-3">· {messageCount} {messageCount === 1 ? 'message' : 'messages'}</span></h2>
        <SegmentedControl<ThreadFilter>
          ariaLabel="Show in conversation"
          size="sm"
          value={filter}
          onChange={onFilterChange}
          options={[
            { value: 'all', label: 'Everything' },
            { value: 'messages', label: 'Messages' },
            { value: 'notes', label: 'Team notes', count: noteCount },
          ]}
        />
      </div>
      <div className="relative min-h-0 flex-1">
      <div ref={scrollRef} onScroll={onScroll} tabIndex={0} role="log" aria-label="Conversation messages" aria-live="off" className="scroll-quiet h-full overflow-y-auto bg-surface-2 px-3 py-5 sm:px-6 [scroll-padding-bottom:1rem]">
        <ol className="mx-auto flex max-w-3xl flex-col gap-5">
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
