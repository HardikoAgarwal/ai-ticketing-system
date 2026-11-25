import { differenceInMinutes, parseISO } from 'date-fns'
import { Sparkles, UserCheck } from 'lucide-react'
import type { ReactNode } from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { categoryTone, PRIORITY_META, SENTIMENT_META, SLA_META, STATUS_META, type Tone } from '@/lib/constants'
import { formatDateTime } from '@/lib/format'
import type { CategoryBrief, ClassificationSource, Sentiment, SlaState, TicketPriority, TicketStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

type Size = 'sm' | 'md' | 'lg' | 'card'

const SIZES: Record<Size, { pill: string; icon: string }> = {
  sm: { pill: 'h-6 gap-1 px-2 text-xs', icon: 'size-3' },
  md: { pill: 'h-7 gap-1.5 px-2.5 text-xs', icon: 'size-3.5' },
  lg: { pill: 'h-8 gap-1.5 px-3 text-[13px]', icon: 'size-4' },
  // dashboard cards: ~28px tall, 13px semibold, 14px icons
  card: { pill: 'h-7 gap-1.5 px-2.5 text-xs', icon: 'size-3.5' },
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
        'inline-flex items-center rounded-lg font-semibold whitespace-nowrap',
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

export function StatusBadge({ status, audience = 'staff', size }: { status: TicketStatus; audience?: 'staff' | 'requester'; size?: Size }) {
  const meta = STATUS_META[status]
  return <Pill tone={meta} size={size} label={audience === 'requester' ? meta.requesterLabel : meta.label} />
}

export function PriorityBadge({ priority, source, size }: { priority: TicketPriority; source?: ClassificationSource; size?: Size }) {
  return (
    <Pill tone={PRIORITY_META[priority]} size={size}>
      {source && <SourceMarker source={source} />}
    </Pill>
  )
}

export function CategoryBadge({ category, source, size, subtle }: {
  category: CategoryBrief | null
  source?: ClassificationSource
  size?: Size
  subtle?: boolean
}) {
  if (!category) return <span className="text-xs text-muted-foreground">Uncategorised</span>
  const tone = categoryTone(category.key, category.name)
  return (
    <Pill tone={tone} size={size} className={subtle ? 'bg-transparent text-foreground/70 ring-border' : undefined}>
      {source && <SourceMarker source={source} />}
    </Pill>
  )
}

export function SentimentBadge({ sentiment, size = 'sm' }: { sentiment: Sentiment | ''; size?: Size }) {
  if (!sentiment) return null
  return <Pill tone={SENTIMENT_META[sentiment]} size={size} />
}

export function SourceMarker({ source }: { source: ClassificationSource }) {
  const text =
    source === 'AI' ? 'Suggested by AI' : source === 'STAFF' ? 'Set by a team member' : 'Estimated by keyword rules (AI pending or unavailable)'
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex" aria-label={text}>
          {source === 'AI' && <Sparkles className="size-3 text-violet-500" />}
          {source === 'STAFF' && <UserCheck className="size-3 text-emerald-600" />}
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
