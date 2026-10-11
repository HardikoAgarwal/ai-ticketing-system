import { differenceInMinutes, parseISO } from 'date-fns'
import { Sparkles, UserCheck } from 'lucide-react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CATEGORY_META, PRIORITY_META, SLA_META, STATUS_META } from '@/lib/constants'
import { formatDateTime } from '@/lib/format'
import type { ClassificationSource, SlaState, TicketCategory, TicketPriority, TicketStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const base = 'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap'

export function StatusBadge({ status, audience = 'admin' }: { status: TicketStatus; audience?: 'admin' | 'author' }) {
  const meta = STATUS_META[status]
  return <span className={cn(base, meta.className)}>{audience === 'author' ? meta.authorLabel : meta.label}</span>
}

export function PriorityBadge({ priority, source }: { priority: TicketPriority; source?: ClassificationSource }) {
  const meta = PRIORITY_META[priority]
  return (
    <span className={cn(base, meta.className)}>
      <span className={cn('size-1.5 rounded-full', meta.dot)} />
      {meta.label}
      {source && <SourceMarker source={source} />}
    </span>
  )
}

export function CategoryBadge({ category, source, short }: { category: TicketCategory; source?: ClassificationSource; short?: boolean }) {
  const meta = CATEGORY_META[category]
  return (
    <span className={cn(base, 'border-zinc-200 bg-white text-zinc-700')}>
      {short ? meta.short : meta.label}
      {source && <SourceMarker source={source} />}
    </span>
  )
}

function SourceMarker({ source }: { source: ClassificationSource }) {
  const text =
    source === 'AI' ? 'Suggested by AI' : source === 'ADMIN' ? 'Set by a team member' : 'Estimated by keyword rules (AI pending or unavailable)'
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex" aria-label={text}>
          {source === 'AI' && <Sparkles className="size-3 text-violet-500" />}
          {source === 'ADMIN' && <UserCheck className="size-3 text-emerald-600" />}
          {source === 'FALLBACK' && <span className="text-[10px] text-zinc-400">~</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  )
}

function humanizeMinutes(minutes: number): string {
  const abs = Math.abs(minutes)
  if (abs < 60) return `${abs}m`
  if (abs < 48 * 60) return `${Math.round(abs / 60)}h`
  return `${Math.round(abs / 60 / 24)}d`
}

export function SlaBadge({ state, dueAt }: { state: SlaState; dueAt: string | null }) {
  const meta = SLA_META[state]
  if (state === 'none') return <span className="text-xs text-muted-foreground">—</span>
  let label = meta.label
  if (dueAt && (state === 'overdue' || state === 'at_risk' || state === 'on_track')) {
    const diff = differenceInMinutes(parseISO(dueAt), new Date())
    label = diff < 0 ? `Overdue ${humanizeMinutes(diff)}` : `Reply in ${humanizeMinutes(diff)}`
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn(base, meta.className)}>{label}</span>
      </TooltipTrigger>
      <TooltipContent>First response due {formatDateTime(dueAt)}</TooltipContent>
    </Tooltip>
  )
}

export function BookStatusBadge({ status, published }: { status: string; published: boolean }) {
  return (
    <span
      className={cn(
        base,
        published ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800',
      )}
    >
      {published ? 'Live' : status.replace('In Production - ', 'In production · ')}
    </span>
  )
}
