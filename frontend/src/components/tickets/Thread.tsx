import { Download, FileText, ImageIcon, LifeBuoy, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { RelativeTime } from '@/components/common'
import { Avatar, Chip } from '@/components/ds'
import { errorMessage } from '@/lib/api'
import { formatBytes } from '@/lib/format'
import type { Attachment, Message } from '@/lib/types'
import { cn } from '@/lib/utils'

type Viewer = 'requester' | 'staff'

/** One message: avatar, name + time, bubble. `team` bubbles are tinted violet-soft, `customer` ones are plain surface. */
export function ChatBubble({
  side,
  name,
  meta,
  time,
  variant,
  avatar,
  children,
}: {
  side: 'left' | 'right'
  name: string
  meta?: ReactNode
  time: string
  variant: 'team' | 'customer'
  avatar: ReactNode
  children: ReactNode
}) {
  return (
    <article aria-label={`Message from ${name}`} className={cn('flex items-end gap-2.5', side === 'right' && 'flex-row-reverse')}>
      <div className="shrink-0">{avatar}</div>
      <div className={cn('flex max-w-[88%] min-w-0 flex-col sm:max-w-[80%]', side === 'right' ? 'items-end' : 'items-start')}>
        <div className={cn('mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 px-1 text-xs', side === 'right' && 'flex-row-reverse')}>
          <span className="font-semibold text-ink">{name}</span>
          {meta}
          <RelativeTime value={time} className="text-ink-3" />
        </div>
        <div
          className={cn(
            'min-w-0 rounded-panel border px-4 py-3 text-[15px] leading-relaxed break-words text-ink',
            variant === 'team' ? 'border-lav-line bg-lav' : 'border-line bg-surface',
            side === 'right' ? 'rounded-br-md' : 'rounded-bl-md',
          )}
        >
          {children}
        </div>
      </div>
    </article>
  )
}

export function PersonAvatar({ name }: { name: string; variant?: 'team' | 'customer' }) {
  return <Avatar name={name} size="md" />
}

export function MessageBubble({ message, viewer }: { message: Message; viewer: Viewer }) {
  const fromTeam = !message.sender_is_requester
  const variant = fromTeam ? 'team' : 'customer'
  const side = (viewer === 'staff') === fromTeam ? 'right' : 'left'
  return (
    <ChatBubble
      side={side}
      name={viewer === 'requester' && message.sender_is_requester ? 'You' : message.sender_name}
      variant={variant}
      time={message.created_at}
      avatar={<PersonAvatar name={message.sender_name} variant={variant} />}
      meta={
        viewer === 'staff' && message.ai_draft_id ? (
          <Chip tone="ai" icon={Sparkles} size="sm">
            {message.ai_draft_edited ? 'AI draft, edited' : 'AI draft'}
          </Chip>
        ) : viewer === 'requester' && fromTeam ? (
          <span className="inline-flex items-center gap-1 text-ink-3">
            <LifeBuoy className="size-3" aria-hidden /> Support
          </span>
        ) : null
      }
    >
      <p className="whitespace-pre-wrap">{message.body}</p>
    </ChatBubble>
  )
}

export function DayDivider({ label }: { label: string }) {
  return (
    <div role="separator" aria-label={label} className="flex items-center gap-3 py-1 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

/** Attachment chips; opening one asks the API for a short-lived signed URL. */
export function AttachmentList({ ticketId, attachments }: { ticketId: number; attachments: Attachment[] }) {
  const { api } = useWorkspace()
  if (!attachments.length) return null
  const open = async (a: Attachment) => {
    try {
      const { url } = await api.tickets.attachmentUrl(ticketId, a.id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Attachments">
      {attachments.map((a) => {
        const image = a.content_type.startsWith('image/')
        return (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => open(a)}
              aria-label={`Open ${a.original_name}, ${formatBytes(a.size)}`}
              className="group inline-flex min-h-11 items-center gap-2.5 rounded-control border border-line bg-surface py-1.5 pr-3 pl-1.5 text-left text-xs outline-none hover:border-line-strong focus-visible:ring-2 focus-visible:ring-violet"
            >
              <span className={cn('flex size-8 items-center justify-center rounded-chip', image ? 'bg-sky text-sky-ink' : 'bg-rose text-rose-ink')}>
                {image ? <ImageIcon className="size-4" aria-hidden /> : <FileText className="size-4" aria-hidden />}
              </span>
              <span className="min-w-0">
                <span className="block max-w-44 truncate font-medium text-ink">{a.original_name}</span>
                <span className="text-ink-3">{formatBytes(a.size)}</span>
              </span>
              <Download className="size-4 text-ink-3 group-hover:text-violet" aria-hidden />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
