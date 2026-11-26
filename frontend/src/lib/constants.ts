import {
  AlertTriangle,
  Archive,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CircleDot,
  Clock,
  Flame,
  Minus,
  Tag,
  Angry,
  Meh,
  Smile,
  Timer,
  type LucideIcon,
} from 'lucide-react'

import type { Sentiment, SlaState, TicketPriority, TicketStatus } from './types'

/**
 * Visual tokens per value. `pill` styles badges, `tint` styles a select trigger showing that value,
 * `icon` colors the glyph, `dot` is the solid accent (bars, dots, borders).
 */
export interface Tone {
  label: string
  icon: LucideIcon
  pill: string
  tint: string
  iconClass: string
  dot: string
}

export const STATUS_META: Record<TicketStatus, Tone & { requesterLabel: string; requesterHint: string }> = {
  OPEN: {
    label: 'Open',
    requesterLabel: 'Received',
    requesterHint: 'Waiting for our team to pick it up',
    icon: CircleDot,
    pill: 'bg-sky border-sky-line text-sky-ink border',
    tint: 'border-sky-line bg-sky text-sky-ink',
    iconClass: 'text-sky-ink',
    dot: 'bg-sky-500',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    requesterLabel: "We're on it",
    requesterHint: 'Our team is working on this',
    icon: Timer,
    pill: 'bg-lav border-lav-line text-lav-ink border',
    tint: 'border-lav-line bg-lav text-lav-ink',
    iconClass: 'text-lav-ink',
    dot: 'bg-violet-500',
  },
  RESOLVED: {
    label: 'Resolved',
    requesterLabel: 'Resolved',
    requesterHint: 'Please confirm it solved your issue',
    icon: CheckCircle2,
    pill: 'bg-mint border-mint-line text-mint-ink border',
    tint: 'border-mint-line bg-mint text-mint-ink',
    iconClass: 'text-mint-ink',
    dot: 'bg-emerald-500',
  },
  CLOSED: {
    label: 'Closed',
    requesterLabel: 'Closed',
    requesterHint: 'Reply any time to reopen',
    icon: Archive,
    pill: 'bg-sunken border-line text-ink-2 border',
    tint: 'border-line bg-surface-2 text-ink-2',
    iconClass: 'text-ink-3',
    dot: 'bg-zinc-400',
  },
}

export const PRIORITY_META: Record<TicketPriority, Tone> = {
  CRITICAL: {
    label: 'Critical',
    icon: Flame,
    pill: 'bg-rose border-rose-line text-rose-ink border',
    tint: 'border-rose-line bg-rose text-rose-ink',
    iconClass: 'text-rose-ink',
    dot: 'bg-red-500',
  },
  HIGH: {
    label: 'High',
    icon: ArrowUp,
    pill: 'bg-peach border-peach-line text-peach-ink border',
    tint: 'border-peach-line bg-peach text-peach-ink',
    iconClass: 'text-peach-ink',
    dot: 'bg-orange-500',
  },
  MEDIUM: {
    label: 'Medium',
    icon: Minus,
    pill: 'bg-butter border-butter-line text-butter-ink border',
    tint: 'border-butter-line bg-butter text-butter-ink',
    iconClass: 'text-butter-ink',
    dot: 'bg-amber-400',
  },
  LOW: {
    label: 'Low',
    icon: ArrowDown,
    pill: 'bg-sunken border-line text-ink-2 border',
    tint: 'border-line bg-surface-2 text-ink-2',
    iconClass: 'text-ink-3',
    dot: 'bg-slate-400',
  },
}

export const SLA_META: Record<SlaState, Tone> = {
  overdue: {
    label: 'Overdue',
    icon: AlertTriangle,
    pill: 'bg-rose border-rose-line text-rose-ink border',
    tint: 'border-rose-line bg-rose text-rose-ink',
    iconClass: 'text-rose-ink',
    dot: 'bg-red-500',
  },
  at_risk: {
    label: 'Due soon',
    icon: Clock,
    pill: 'bg-butter border-butter-line text-butter-ink border',
    tint: 'border-butter-line bg-butter text-butter-ink',
    iconClass: 'text-butter-ink',
    dot: 'bg-amber-400',
  },
  on_track: {
    label: 'On track',
    icon: Clock,
    pill: 'bg-sunken border-line text-ink-2 border',
    tint: 'border-line bg-surface-2 text-ink-2',
    iconClass: 'text-ink-3',
    dot: 'bg-zinc-400',
  },
  met: {
    label: 'Responded',
    icon: CheckCircle2,
    pill: 'bg-mint border-mint-line text-mint-ink border',
    tint: 'border-mint-line bg-mint text-mint-ink',
    iconClass: 'text-mint-ink',
    dot: 'bg-emerald-500',
  },
  breached: {
    label: 'Responded late',
    icon: AlertTriangle,
    pill: 'bg-peach border-peach-line text-peach-ink border',
    tint: 'border-peach-line bg-peach text-peach-ink',
    iconClass: 'text-peach-ink',
    dot: 'bg-orange-500',
  },
  none: {
    label: '—',
    icon: Clock,
    pill: 'bg-sunken border-line text-ink-2 border',
    tint: 'border-line bg-surface-2 text-ink-2',
    iconClass: 'text-ink-3',
    dot: 'bg-zinc-300',
  },
}

export const STATUSES = Object.keys(STATUS_META) as TicketStatus[]
export const PRIORITIES = Object.keys(PRIORITY_META) as TicketPriority[]
export const ATTACHMENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
export const ATTACHMENT_MAX_FILES = 3


export const SENTIMENT_META: Record<Sentiment, Tone> = {
  NEGATIVE: {
    label: 'Frustrated',
    icon: Angry,
    pill: 'bg-rose border-rose-line text-rose-ink border',
    tint: 'border-rose-line bg-rose text-rose-ink',
    iconClass: 'text-rose-ink',
    dot: 'bg-rose-500',
  },
  NEUTRAL: {
    label: 'Neutral',
    icon: Meh,
    pill: 'bg-sunken border-line text-ink-2 border',
    tint: 'border-line bg-surface-2 text-ink-2',
    iconClass: 'text-ink-3',
    dot: 'bg-zinc-400',
  },
  POSITIVE: {
    label: 'Happy',
    icon: Smile,
    pill: 'bg-mint border-mint-line text-mint-ink border',
    tint: 'border-mint-line bg-mint text-mint-ink',
    iconClass: 'text-mint-ink',
    dot: 'bg-emerald-500',
  },
}

/** Categories are workspace-defined, so tones are derived from the key (stable per category). */
const CATEGORY_TONES = [
  { pill: 'bg-mint border-mint-line text-mint-ink border', iconClass: 'text-mint-ink', dot: 'bg-emerald-500', fill: '#10b981' },
  { pill: 'bg-lav border-lav-line text-lav-ink border', iconClass: 'text-lav-ink', dot: 'bg-indigo-500', fill: '#6366f1' },
  { pill: 'bg-rose border-rose-line text-rose-ink border', iconClass: 'text-rose-ink', dot: 'bg-rose-500', fill: '#f43f5e' },
  { pill: 'bg-sky border-sky-line text-sky-ink border', iconClass: 'text-sky-ink', dot: 'bg-cyan-500', fill: '#06b6d4' },
  { pill: 'bg-butter border-butter-line text-butter-ink border', iconClass: 'text-butter-ink', dot: 'bg-amber-500', fill: '#f59e0b' },
  { pill: 'bg-lav border-lav-line text-lav-ink border', iconClass: 'text-lav-ink', dot: 'bg-fuchsia-500', fill: '#d946ef' },
  { pill: 'bg-sky border-sky-line text-sky-ink border', iconClass: 'text-sky-ink', dot: 'bg-sky-500', fill: '#0ea5e9' },
  { pill: 'bg-sunken border-line text-ink-2 border', iconClass: 'text-ink-3', dot: 'bg-slate-400', fill: '#64748b' },
]

function hash(key: string) {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return h
}

export function categoryTone(key: string, label?: string): Tone & { fill: string } {
  const t = CATEGORY_TONES[hash(key) % CATEGORY_TONES.length]
  return { label: label ?? key, icon: Tag, pill: t.pill, tint: 'border-line bg-surface text-ink', iconClass: t.iconClass, dot: t.dot, fill: t.fill }
}

export const PRIORITY_FILLS: Record<TicketPriority, string> = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#fbbf24', LOW: '#94a3b8' }
