import { differenceInMinutes, parseISO } from 'date-fns'
import { Sparkles, UserCheck } from 'lucide-react'
import type { ReactNode } from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CATEGORY_META, PRIORITY_META, SLA_META, STATUS_META, type Tone } from '@/lib/constants'
import { formatDateTime } from '@/lib/format'
import type { ClassificationSource, SlaState, TicketCategory, TicketPriority, TicketStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

type Size = 'sm' | 'md' | 'lg'

const SIZES: Record<Size, { pill: string; icon: string }> = {
  sm: { pill: 'gap-1 px-2 py-0.5 text-[11px]', icon: 'size-3' },
  md: { pill: 'gap-1.5 px-2.5 py-1 text-xs', icon: 'size-3.5' },
  lg: { pill: 'gap-1.5 px-3 py-1.5 text-sm', icon: 'size-4' },
}

export function Pill({ tone, label, size = 'md', className, children }: {
  tone: Tone
  label?: ReactNode
  size?: Size
  className?: string
  children?: ReactNode
}) {
  const Icon = tone.icon
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium whitespace-nowrap ring-1 ring-inset',
        SIZES[size].pill,
        tone.pill,
        className,
      )}
    >
      <Icon className={cn('shrink-0', SIZES[size].icon)} />
      {label ?? tone.label}
      {children}
    </span>
  )
}

export function StatusBadge({ status, audience = 'admin', size }: { status: TicketStatus; audience?: 'admin' | 'author'; size?: Size }) {
  const meta = STATUS_META[status]
  return <Pill tone={meta} size={size} label={audience === 'author' ? meta.authorLabel : meta.label} />
}

export function PriorityBadge({ priority, source, size }: { priority: TicketPriority; source?: ClassificationSource; size?: Size }) {
  return (
    <Pill tone={PRIORITY_META[priority]} size={size}>
      {source && <SourceMarker source={source} />}
    </Pill>
  )
}

export function CategoryBadge({ category, source, short, size }: {
  category: TicketCategory
  source?: ClassificationSource
  short?: boolean
  size?: Size
}) {
  const meta = CATEGORY_META[category]
  return (
    <Pill tone={meta} size={size} label={short ? meta.short : meta.label}>
      {source && <SourceMarker source={source} />}
    </Pill>
  )
}

export function SourceMarker({ source }: { source: ClassificationSource }) {
  const text =
    source === 'AI' ? 'Suggested by AI' : source === 'ADMIN' ? 'Set by a team member' : 'Estimated by keyword rules (AI pending or unavailable)'
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex" aria-label={text}>
          {source === 'AI' && <Sparkles className="size-3 text-violet-500" />}
          {source === 'ADMIN' && <UserCheck className="size-3 text-emerald-600" />}
          {source === 'FALLBACK' && <span className="text-[10px] opacity-60">~</span>}
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

export function slaLabel(state: SlaState, dueAt: string | null): string {
  if (dueAt && (state === 'overdue' || state === 'at_risk' || state === 'on_track')) {
    const diff = differenceInMinutes(parseISO(dueAt), new Date())
    return diff < 0 ? `Overdue ${humanizeMinutes(diff)}` : `Reply in ${humanizeMinutes(diff)}`
  }
  return SLA_META[state].label
}

export function SlaBadge({ state, dueAt, size }: { state: SlaState; dueAt: string | null; size?: Size }) {
  if (state === 'none') return <span className="text-xs text-muted-foreground">—</span>
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Pill tone={SLA_META[state]} size={size} label={slaLabel(state, dueAt)} />
        </span>
      </TooltipTrigger>
      <TooltipContent>First response due {formatDateTime(dueAt)}</TooltipContent>
    </Tooltip>
  )
}

export function BookStatusBadge({ status, published, size = 'md' }: { status: string; published: boolean; size?: Size }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ring-1 ring-inset',
        SIZES[size].pill,
        published ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-amber-50 text-amber-800 ring-amber-600/20',
      )}
    >
      <span className={cn('size-1.5 rounded-full', published ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500')} />
      {published ? 'Live' : status.replace('In Production - ', '')}
    </span>
  )
}
