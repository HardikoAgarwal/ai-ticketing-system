import { Download, FileText, ImageIcon, Lock } from 'lucide-react'
import { toast } from 'sonner'

import { RelativeTime } from '@/components/common'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { errorMessage } from '@/lib/api'
import { ticketsApi } from '@/lib/endpoints'
import { formatBytes, initials } from '@/lib/format'
import type { Attachment, Message } from '@/lib/types'
import { cn } from '@/lib/utils'

export function MessageBubble({ message, viewer }: { message: Message; viewer: 'author' | 'admin' }) {
  const fromTeam = message.sender_role === 'ADMIN'
  const note = message.is_internal
  const label = note ? 'Internal note' : fromTeam ? (viewer === 'author' ? 'BookLeaf Support' : 'Reply to author') : 'Author'

  return (
    <div className="flex gap-3">
      <Avatar className="mt-0.5 size-8 shrink-0">
        <AvatarFallback
          className={cn(
            'text-xs font-medium',
            note ? 'bg-amber-100 text-amber-800' : fromTeam ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
          )}
        >
          {note ? <Lock className="size-3.5" /> : initials(message.sender_name)}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          'min-w-0 flex-1 rounded-xl border px-4 py-3',
          note ? 'border-amber-200 bg-amber-50' : fromTeam ? 'border-primary/20 bg-accent/30' : 'bg-card',
        )}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <span className="font-medium text-foreground">{message.sender_name}</span>
          <span className={cn('text-muted-foreground', note && 'font-medium text-amber-800')}>{label}</span>
          {viewer === 'admin' && message.ai_draft_id && (
            <span className="text-muted-foreground">· {message.ai_draft_edited ? 'AI draft, edited' : 'AI draft'}</span>
          )}
          <span className="ml-auto text-muted-foreground">
            <RelativeTime value={message.created_at} />
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{message.body}</p>
      </div>
    </div>
  )
}

export function AttachmentList({ ticketId, attachments }: { ticketId: number; attachments: Attachment[] }) {
  if (!attachments.length) return null
  const open = async (a: Attachment) => {
    try {
      const { url } = await ticketsApi.attachmentUrl(ticketId, a.id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => open(a)}
          className="group inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs hover:border-primary/40"
        >
          {a.content_type.startsWith('image/') ? <ImageIcon className="size-3.5" /> : <FileText className="size-3.5" />}
          <span className="max-w-48 truncate">{a.original_name}</span>
          <span className="text-muted-foreground">{formatBytes(a.size)}</span>
          <Download className="size-3.5 text-muted-foreground group-hover:text-foreground" />
        </button>
      ))}
    </div>
  )
}
