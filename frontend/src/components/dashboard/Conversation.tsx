import { isToday, isYesterday, parseISO, format } from 'date-fns'
import { Lock, MessagesSquare } from 'lucide-react'
import { Fragment, useEffect, useRef } from 'react'

import { Composer } from '@/components/agent/Composer'
import { Chip } from '@/components/dashboard/Chip'
import { RelativeTime } from '@/components/common'
import { AttachmentList, ChatBubble, DayDivider, MessageBubble, PersonAvatar } from '@/components/tickets/Thread'
import { initials } from '@/lib/format'
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
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/25 dark:bg-amber-500/10">
        <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
          <span className="flex size-6 items-center justify-center rounded-md bg-amber-200/70 text-[10px] font-semibold text-amber-900 dark:text-amber-200">{initials(note.sender_name)}</span>
          <span className="font-semibold text-foreground">{note.sender_name}</span>
          <Chip tone="amber" icon={Lock}>Internal note · team only</Chip>
          <RelativeTime value={note.created_at} className="ml-auto text-muted-foreground" />
        </div>
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/90">{note.body}</p>
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
  const customerCount = thread.filter((m) => !m.is_internal).length + 1
  const internalCount = thread.filter((m) => m.is_internal).length

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [count])

  let lastDay = dayLabel(ticket.created_at)

  return (
    <section aria-label="Conversation" className="flex min-h-0 flex-1 flex-col bg-card">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
        <MessagesSquare className="size-3.5" />
        <span className="font-medium text-foreground">{customerCount} {customerCount === 1 ? 'message' : 'messages'} with {name}</span>
        {internalCount > 0 && <Chip tone="amber" icon={Lock} size="sm">{internalCount} internal {internalCount === 1 ? 'note' : 'notes'}</Chip>}
      </div>

      <div ref={scrollRef} className="min-h-[12rem] flex-1 space-y-6 overflow-y-auto scroll-smooth bg-muted/20 px-4 py-6 sm:px-8" tabIndex={0} aria-label="Message history">
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
