import { Download, FileText, ImageIcon, LifeBuoy, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'

import { RelativeTime } from '@/components/common'
import { Chip } from '@/components/dashboard/Chip'
import { errorMessage } from '@/lib/api'
import { useWorkspace } from '@/auth/workspace'
import { formatBytes, initials } from '@/lib/format'
import type { Attachment, Message } from '@/lib/types'
import { cn } from '@/lib/utils'

type Viewer = 'requester' | 'staff'

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
    <div className={cn('flex items-end gap-2.5', side === 'right' && 'flex-row-reverse')}>
      <div className="shrink-0">{avatar}</div>
      <div className={cn('flex max-w-[85%] min-w-0 flex-col', side === 'right' ? 'items-end' : 'items-start')}>
        <div className={cn('mb-1 flex items-center gap-2 px-1 text-xs', side === 'right' && 'flex-row-reverse')}>
          <span className="font-semibold text-foreground">{name}</span>
          {meta}
          <RelativeTime value={time} className="text-muted-foreground" />
        </div>
        <div
          className={cn(
            'rounded-xl px-4 py-3 text-[15px] leading-relaxed shadow-xs',
            variant === 'team'
              ? 'border border-primary/25 bg-primary/10 text-foreground'
              : 'border border-border bg-card text-foreground',
            side === 'right' ? 'rounded-br-sm' : 'rounded-bl-sm',
          )}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

export function PersonAvatar({ name, variant }: { name: string; variant: 'team' | 'customer' }) {
  return (
    <span
      className={cn(
        'flex size-9 items-center justify-center rounded-lg text-xs font-semibold',
        variant === 'team' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground/80',
      )}
    >
      {initials(name)}
    </span>
  )
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
          <Chip tone="violet" icon={Sparkles} className="h-5 px-1.5 text-[11px]">{message.ai_draft_edited ? 'AI draft, edited' : 'AI draft'}</Chip>
        ) : viewer === 'requester' && fromTeam ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <LifeBuoy className="size-3" /> Support
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
    <div className="flex items-center gap-3 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
      <span className="h-px flex-1 bg-border" />
      {label}
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

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
    <div className="flex flex-wrap gap-2">
      {attachments.map((a) => {
        const image = a.content_type.startsWith('image/')
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => open(a)}
            className="group inline-flex items-center gap-2.5 rounded-lg border bg-card py-2 pr-3 pl-2 text-left text-xs shadow-xs transition-colors hover:border-primary/40"
          >
            <span className={cn('flex size-8 items-center justify-center rounded-lg', image ? 'bg-sky-50 text-sky-600' : 'bg-rose-50 text-rose-600')}>
              {image ? <ImageIcon className="size-4" /> : <FileText className="size-4" />}
            </span>
            <span className="min-w-0">
              <span className="block max-w-44 truncate font-medium">{a.original_name}</span>
              <span className="text-muted-foreground">{formatBytes(a.size)}</span>
            </span>
            <Download className="size-4 text-muted-foreground group-hover:text-primary" />
          </button>
        )
      })}
    </div>
  )
}
