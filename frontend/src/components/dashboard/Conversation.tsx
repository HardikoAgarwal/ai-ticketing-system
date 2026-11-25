import { isToday, isYesterday, parseISO, format } from 'date-fns'
import { Lock, MessagesSquare } from 'lucide-react'
import { Fragment, useEffect, useRef } from 'react'

import { Composer } from '@/components/agent/Composer'
import { surface } from '@/components/dashboard/surface'
import { RelativeTime } from '@/components/common'
import { AttachmentList, ChatBubble, DayDivider, MessageBubble, PersonAvatar } from '@/components/tickets/Thread'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Message, StaffTicketDetail } from '@/lib/types'

function dayLabel(iso: string): string {
  const d = parseISO(iso)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEEE, d MMM')
}

/** Team-only note, shown inline in the timeline but unmistakably different from a customer-facing message. */
function NoteBubble({ note }: { note: Message }) {
  return (
    <div className="mx-auto w-full max-w-[92%]">
      <div className="rounded-2xl border border-amber-300/70 border-l-4 border-l-amber-400 bg-amber-50 px-4 py-3 shadow-sm">
        <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
          <span className="flex size-6 items-center justify-center rounded-full bg-amber-200/70 text-[10px] font-semibold text-amber-900">{initials(note.sender_name)}</span>
          <span className="font-semibold text-amber-950">{note.sender_name}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-300/60 ring-inset">
            <Lock className="size-3" /> Internal note · team only
          </span>
          <RelativeTime value={note.created_at} className="ml-auto text-amber-800/70" />
        </div>
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-amber-950/90">{note.body}</p>
      </div>
    </div>
  )
}

/** The conversation is the page: roomy message list on top, big composer pinned to the bottom of the same panel. */
export function Conversation({ ticket }: { ticket: StaffTicketDetail }) {
  const endRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const first = ticket.messages[0]
  const thread = first && first.sender_is_requester && first.body === ticket.description ? ticket.messages.slice(1) : ticket.messages
  const name = ticket.requester_profile.name
  const count = ticket.messages.length

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [count])

  let lastDay = dayLabel(ticket.created_at)

  return (
    <section aria-label="Conversation" className={cn(surface, 'flex h-full min-h-0 flex-col overflow-hidden')}>
      <header className="flex min-h-12 shrink-0 items-center gap-2.5 border-b border-border bg-muted/50 px-4 py-2.5 text-sm sm:px-5">
        <span className="flex size-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 ring-1 ring-blue-200 ring-inset">
          <MessagesSquare className="size-4" />
        </span>
        <h2 className="font-semibold tracking-tight">Conversation</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {thread.filter((m) => !m.is_internal).length + 1} {thread.filter((m) => !m.is_internal).length === 0 ? 'message' : 'messages'}
        </span>
        {thread.some((m) => m.is_internal) && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-300/60 ring-inset">
            <Lock className="size-3" /> {thread.filter((m) => m.is_internal).length} internal
          </span>
        )}
      </header>

      <div ref={scrollRef} className="min-h-[12rem] flex-1 space-y-6 overflow-y-auto scroll-smooth px-4 py-6 sm:px-8" tabIndex={0} aria-label="Message history">
        <DayDivider label={lastDay} />
        <ChatBubble side="left" name={name} variant="customer" time={ticket.created_at} avatar={<PersonAvatar name={name} variant="customer" />}>
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
          <div className="mt-3 empty:hidden">
            <AttachmentList ticketId={ticket.id} attachments={ticket.attachments} />
          </div>
        </ChatBubble>
        {thread.map((m) => {
          const label = dayLabel(m.created_at)
          const divider = label !== lastDay
          lastDay = label
          return (
            <Fragment key={m.id}>
              {divider && <DayDivider label={label} />}
              {m.is_internal ? <NoteBubble note={m} /> : <MessageBubble message={m} viewer="staff" />}
            </Fragment>
          )
        })}
        <div ref={endRef} />
      </div>

      <Composer ticket={ticket} />
    </section>
  )
}
