import { MessageCircleReply } from 'lucide-react'

import { Chip } from '@/components/ds'
import type { TicketStatus } from '@/lib/types'

import { REQUESTER_STATUS } from './status-meta'

export function RequesterStatusChip({ status, size = 'md' }: { status: TicketStatus; size?: 'sm' | 'md' | 'lg' }) {
  const m = REQUESTER_STATUS[status]
  return (
    <Chip tone={m.tone} icon={m.icon} size={size}>
      {m.label}
    </Chip>
  )
}

export function NewReplyChip({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <Chip tone="peach" icon={MessageCircleReply} size={size}>
      New reply
    </Chip>
  )
}
