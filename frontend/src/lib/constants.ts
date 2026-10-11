import type { SlaState, TicketCategory, TicketPriority, TicketStatus } from './types'

export const STATUS_META: Record<TicketStatus, { label: string; authorLabel: string; className: string }> = {
  OPEN: { label: 'Open', authorLabel: 'Waiting on BookLeaf', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  IN_PROGRESS: {
    label: 'In Progress',
    authorLabel: "We're on it",
    className: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  RESOLVED: { label: 'Resolved', authorLabel: 'Resolved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CLOSED: { label: 'Closed', authorLabel: 'Closed', className: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
}

export const PRIORITY_META: Record<TicketPriority, { label: string; className: string; dot: string }> = {
  CRITICAL: { label: 'Critical', className: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  HIGH: { label: 'High', className: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  MEDIUM: { label: 'Medium', className: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  LOW: { label: 'Low', className: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
}

export const CATEGORY_META: Record<TicketCategory, { label: string; short: string }> = {
  ROYALTY_PAYMENTS: { label: 'Royalty & Payments', short: 'Royalty' },
  ISBN_METADATA: { label: 'ISBN & Metadata Issues', short: 'ISBN & Metadata' },
  PRINTING_QUALITY: { label: 'Printing & Quality', short: 'Printing' },
  DISTRIBUTION: { label: 'Distribution & Availability', short: 'Distribution' },
  BOOK_STATUS: { label: 'Book Status & Production Updates', short: 'Production' },
  GENERAL: { label: 'General Inquiry', short: 'General' },
}

export const SLA_META: Record<SlaState, { label: string; className: string }> = {
  overdue: { label: 'Overdue', className: 'bg-red-50 text-red-700 border-red-200' },
  at_risk: { label: 'Due soon', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  on_track: { label: 'On track', className: 'bg-zinc-50 text-zinc-600 border-zinc-200' },
  met: { label: 'Responded', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  breached: { label: 'Responded late', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  none: { label: '—', className: 'bg-zinc-50 text-zinc-500 border-zinc-200' },
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

export const ATTACHMENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
export const ATTACHMENT_MAX_FILES = 3
