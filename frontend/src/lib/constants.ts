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
    pill: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    tint: 'border-sky-200 bg-sky-50/70 text-sky-900',
    iconClass: 'text-sky-600',
    dot: 'bg-sky-500',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    requesterLabel: "We're on it",
    requesterHint: 'Our team is working on this',
    icon: Timer,
    pill: 'bg-violet-50 text-violet-700 ring-violet-600/20',
    tint: 'border-violet-200 bg-violet-50/70 text-violet-900',
    iconClass: 'text-violet-600',
    dot: 'bg-violet-500',
  },
  RESOLVED: {
    label: 'Resolved',
    requesterLabel: 'Resolved',
    requesterHint: 'Please confirm it solved your issue',
    icon: CheckCircle2,
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    tint: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
    iconClass: 'text-emerald-600',
    dot: 'bg-emerald-500',
  },
  CLOSED: {
    label: 'Closed',
    requesterLabel: 'Closed',
    requesterHint: 'Reply any time to reopen',
    icon: Archive,
    pill: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20',
    tint: 'border-zinc-200 bg-zinc-50 text-zinc-700',
    iconClass: 'text-zinc-500',
    dot: 'bg-zinc-400',
  },
}

export const PRIORITY_META: Record<TicketPriority, Tone> = {
  CRITICAL: {
    label: 'Critical',
    icon: Flame,
    pill: 'bg-red-50 text-red-700 ring-red-600/20',
    tint: 'border-red-200 bg-red-50/70 text-red-900',
    iconClass: 'text-red-600',
    dot: 'bg-red-500',
  },
  HIGH: {
    label: 'High',
    icon: ArrowUp,
    pill: 'bg-orange-50 text-orange-700 ring-orange-600/20',
    tint: 'border-orange-200 bg-orange-50/70 text-orange-900',
    iconClass: 'text-orange-600',
    dot: 'bg-orange-500',
  },
  MEDIUM: {
    label: 'Medium',
    icon: Minus,
    pill: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    tint: 'border-amber-200 bg-amber-50/70 text-amber-900',
    iconClass: 'text-amber-600',
    dot: 'bg-amber-400',
  },
  LOW: {
    label: 'Low',
    icon: ArrowDown,
    pill: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    tint: 'border-slate-200 bg-slate-50 text-slate-700',
    iconClass: 'text-slate-500',
    dot: 'bg-slate-400',
  },
}

export const SLA_META: Record<SlaState, Tone> = {
  overdue: {
    label: 'Overdue',
    icon: AlertTriangle,
    pill: 'bg-red-50 text-red-700 ring-red-600/20',
    tint: 'border-red-200 bg-red-50/70 text-red-900',
    iconClass: 'text-red-600',
    dot: 'bg-red-500',
  },
  at_risk: {
    label: 'Due soon',
    icon: Clock,
    pill: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    tint: 'border-amber-200 bg-amber-50/70 text-amber-900',
    iconClass: 'text-amber-600',
    dot: 'bg-amber-400',
  },
  on_track: {
    label: 'On track',
    icon: Clock,
    pill: 'bg-zinc-50 text-zinc-600 ring-zinc-500/20',
    tint: 'border-zinc-200 bg-zinc-50 text-zinc-700',
    iconClass: 'text-zinc-500',
    dot: 'bg-zinc-400',
  },
  met: {
    label: 'Responded',
    icon: CheckCircle2,
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    tint: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
    iconClass: 'text-emerald-600',
    dot: 'bg-emerald-500',
  },
  breached: {
    label: 'Responded late',
    icon: AlertTriangle,
    pill: 'bg-orange-50 text-orange-700 ring-orange-600/20',
    tint: 'border-orange-200 bg-orange-50/70 text-orange-900',
    iconClass: 'text-orange-600',
    dot: 'bg-orange-500',
  },
  none: {
    label: '—',
    icon: Clock,
    pill: 'bg-zinc-50 text-zinc-500 ring-zinc-500/20',
    tint: 'border-zinc-200 bg-zinc-50 text-zinc-600',
    iconClass: 'text-zinc-400',
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
    pill: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    tint: 'border-rose-200 bg-rose-50/70 text-rose-900',
    iconClass: 'text-rose-600',
    dot: 'bg-rose-500',
  },
  NEUTRAL: {
    label: 'Neutral',
    icon: Meh,
    pill: 'bg-zinc-50 text-zinc-600 ring-zinc-500/20',
    tint: 'border-zinc-200 bg-zinc-50 text-zinc-700',
    iconClass: 'text-zinc-500',
    dot: 'bg-zinc-400',
  },
  POSITIVE: {
    label: 'Happy',
    icon: Smile,
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    tint: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
    iconClass: 'text-emerald-600',
    dot: 'bg-emerald-500',
  },
}

/** Categories are workspace-defined, so tones are derived from the key (stable per category). */
const CATEGORY_TONES = [
  { pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', iconClass: 'text-emerald-600', dot: 'bg-emerald-500', fill: '#10b981' },
  { pill: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20', iconClass: 'text-indigo-600', dot: 'bg-indigo-500', fill: '#6366f1' },
  { pill: 'bg-rose-50 text-rose-700 ring-rose-600/20', iconClass: 'text-rose-600', dot: 'bg-rose-500', fill: '#f43f5e' },
  { pill: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20', iconClass: 'text-cyan-600', dot: 'bg-cyan-500', fill: '#06b6d4' },
  { pill: 'bg-amber-50 text-amber-800 ring-amber-600/20', iconClass: 'text-amber-600', dot: 'bg-amber-500', fill: '#f59e0b' },
  { pill: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-600/20', iconClass: 'text-fuchsia-600', dot: 'bg-fuchsia-500', fill: '#d946ef' },
  { pill: 'bg-sky-50 text-sky-700 ring-sky-600/20', iconClass: 'text-sky-600', dot: 'bg-sky-500', fill: '#0ea5e9' },
  { pill: 'bg-slate-100 text-slate-700 ring-slate-500/20', iconClass: 'text-slate-500', dot: 'bg-slate-400', fill: '#64748b' },
]

function hash(key: string) {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return h
}

export function categoryTone(key: string, label?: string): Tone & { fill: string } {
  const t = CATEGORY_TONES[hash(key) % CATEGORY_TONES.length]
  return { label: label ?? key, icon: Tag, pill: t.pill, tint: 'border bg-card text-foreground', iconClass: t.iconClass, dot: t.dot, fill: t.fill }
}

export const PRIORITY_FILLS: Record<TicketPriority, string> = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#fbbf24', LOW: '#94a3b8' }
