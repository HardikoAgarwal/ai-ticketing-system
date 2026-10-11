import {
  AlertTriangle,
  Archive,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CircleDot,
  Clock,
  Factory,
  Flame,
  HelpCircle,
  Minus,
  Printer,
  ScanBarcode,
  Timer,
  Truck,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

import type { SlaState, TicketCategory, TicketPriority, TicketStatus } from './types'

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

export const STATUS_META: Record<TicketStatus, Tone & { authorLabel: string; authorHint: string }> = {
  OPEN: {
    label: 'Open',
    authorLabel: 'Received',
    authorHint: 'Waiting for our team to pick it up',
    icon: CircleDot,
    pill: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    tint: 'border-sky-200 bg-sky-50/70 text-sky-900',
    iconClass: 'text-sky-600',
    dot: 'bg-sky-500',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    authorLabel: "We're on it",
    authorHint: 'Our team is working on this',
    icon: Timer,
    pill: 'bg-violet-50 text-violet-700 ring-violet-600/20',
    tint: 'border-violet-200 bg-violet-50/70 text-violet-900',
    iconClass: 'text-violet-600',
    dot: 'bg-violet-500',
  },
  RESOLVED: {
    label: 'Resolved',
    authorLabel: 'Resolved',
    authorHint: 'Please confirm it solved your issue',
    icon: CheckCircle2,
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    tint: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
    iconClass: 'text-emerald-600',
    dot: 'bg-emerald-500',
  },
  CLOSED: {
    label: 'Closed',
    authorLabel: 'Closed',
    authorHint: 'Reply any time to reopen',
    icon: Archive,
    pill: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20',
    tint: 'border-zinc-200 bg-zinc-50 text-zinc-700',
    iconClass: 'text-zinc-500',
    dot: 'bg-zinc-400',
  },
}

export const PRIORITY_META: Record<TicketPriority, Tone & { sla: string }> = {
  CRITICAL: {
    label: 'Critical',
    sla: 'Reply within 4h',
    icon: Flame,
    pill: 'bg-red-50 text-red-700 ring-red-600/20',
    tint: 'border-red-200 bg-red-50/70 text-red-900',
    iconClass: 'text-red-600',
    dot: 'bg-red-500',
  },
  HIGH: {
    label: 'High',
    sla: 'Reply within 24h',
    icon: ArrowUp,
    pill: 'bg-orange-50 text-orange-700 ring-orange-600/20',
    tint: 'border-orange-200 bg-orange-50/70 text-orange-900',
    iconClass: 'text-orange-600',
    dot: 'bg-orange-500',
  },
  MEDIUM: {
    label: 'Medium',
    sla: 'Reply within 48h',
    icon: Minus,
    pill: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    tint: 'border-amber-200 bg-amber-50/70 text-amber-900',
    iconClass: 'text-amber-600',
    dot: 'bg-amber-400',
  },
  LOW: {
    label: 'Low',
    sla: 'Reply within 72h',
    icon: ArrowDown,
    pill: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    tint: 'border-slate-200 bg-slate-50 text-slate-700',
    iconClass: 'text-slate-500',
    dot: 'bg-slate-400',
  },
}

export const CATEGORY_META: Record<TicketCategory, Tone & { short: string }> = {
  ROYALTY_PAYMENTS: {
    label: 'Royalty & Payments',
    short: 'Royalty',
    icon: Wallet,
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    tint: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
    iconClass: 'text-emerald-600',
    dot: 'bg-emerald-500',
  },
  ISBN_METADATA: {
    label: 'ISBN & Metadata Issues',
    short: 'ISBN & Metadata',
    icon: ScanBarcode,
    pill: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    tint: 'border-indigo-200 bg-indigo-50/70 text-indigo-900',
    iconClass: 'text-indigo-600',
    dot: 'bg-indigo-500',
  },
  PRINTING_QUALITY: {
    label: 'Printing & Quality',
    short: 'Printing',
    icon: Printer,
    pill: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    tint: 'border-rose-200 bg-rose-50/70 text-rose-900',
    iconClass: 'text-rose-600',
    dot: 'bg-rose-500',
  },
  DISTRIBUTION: {
    label: 'Distribution & Availability',
    short: 'Distribution',
    icon: Truck,
    pill: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20',
    tint: 'border-cyan-200 bg-cyan-50/70 text-cyan-900',
    iconClass: 'text-cyan-600',
    dot: 'bg-cyan-500',
  },
  BOOK_STATUS: {
    label: 'Book Status & Production',
    short: 'Production',
    icon: Factory,
    pill: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    tint: 'border-amber-200 bg-amber-50/70 text-amber-900',
    iconClass: 'text-amber-600',
    dot: 'bg-amber-500',
  },
  GENERAL: {
    label: 'General Inquiry',
    short: 'General',
    icon: HelpCircle,
    pill: 'bg-slate-100 text-slate-700 ring-slate-500/20',
    tint: 'border-slate-200 bg-slate-50 text-slate-800',
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
export const CATEGORIES = Object.keys(CATEGORY_META) as TicketCategory[]

export const PRODUCTION_STAGES = [
  'Manuscript Received',
  'Editing',
  'Cover Design',
  'Typesetting',
  'Proofreading',
  'ISBN Assignment',
  'Printing',
  'Distribution Setup',
  'Published & Live',
]

export const PLATFORM_STYLES: Record<string, string> = {
  'Amazon India': 'bg-orange-50 text-orange-800 ring-orange-600/20',
  'Amazon US': 'bg-orange-50 text-orange-800 ring-orange-600/20',
  'Amazon UK': 'bg-orange-50 text-orange-800 ring-orange-600/20',
  Flipkart: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  'BookLeaf Store': 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
}

/** Deterministic cover gradients so each book keeps the same look everywhere. */
const COVER_GRADIENTS = [
  'from-emerald-600 to-teal-800',
  'from-indigo-500 to-violet-700',
  'from-rose-500 to-orange-600',
  'from-sky-500 to-blue-700',
  'from-amber-500 to-orange-700',
  'from-fuchsia-500 to-purple-700',
  'from-teal-500 to-cyan-700',
]
export const coverGradient = (seed: number) => COVER_GRADIENTS[seed % COVER_GRADIENTS.length]

/** Solid band colour matching each cover gradient (same index). */
const COVER_SOLIDS = ['bg-emerald-700', 'bg-indigo-600', 'bg-rose-600', 'bg-sky-600', 'bg-amber-600', 'bg-fuchsia-600', 'bg-teal-600']
export const coverSolid = (seed: number) => COVER_SOLIDS[seed % COVER_SOLIDS.length]

export const ATTACHMENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
export const ATTACHMENT_MAX_FILES = 3
