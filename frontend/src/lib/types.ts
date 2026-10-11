export type Role = 'AUTHOR' | 'ADMIN'

export interface AuthorProfile {
  author_code: string
  phone: string
  city: string
  joined_date: string | null
}

export interface User {
  id: number
  email: string
  full_name: string
  role: Role
  author_profile: AuthorProfile | null
}

export interface UserBrief {
  id: number
  full_name: string
  email: string
  role: Role
}

export interface RoyaltyNotes {
  below_payout_threshold: boolean
  all_paid: boolean
  never_paid: boolean
  days_since_last_payout: number | null
}

export interface Book {
  id: number
  book_code: string
  title: string
  isbn: string
  genre: string
  publication_date: string | null
  stage: string
  status: string
  is_published: boolean
  stage_index: number
  stage_count: number
  mrp: string | null
  author_royalty_per_copy: string | null
  total_copies_sold: number
  total_royalty_earned: string
  royalty_paid: string
  royalty_pending: string
  last_royalty_payout_date: string | null
  print_partner: string
  available_on: string[]
  royalty_notes: RoyaltyNotes
  author_name: string
  author_code: string
}

export interface BookBrief {
  id: number
  book_code: string
  title: string
  status: string
  is_published: boolean
}

export interface AuthorSummary {
  books_published: number
  books_in_production: number
  total_copies_sold: number
  total_royalty_earned: string
  total_royalty_paid: string
  total_royalty_pending: string
  min_payout_threshold: string
  next_payout: { quarter: string; quarter_end: string; payout_by: string }
  active_tickets: number
  unread_tickets: number
}

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type TicketCategory =
  | 'ROYALTY_PAYMENTS'
  | 'ISBN_METADATA'
  | 'PRINTING_QUALITY'
  | 'DISTRIBUTION'
  | 'BOOK_STATUS'
  | 'GENERAL'
export type TicketPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type ClassificationSource = 'AI' | 'FALLBACK' | 'ADMIN'
export type AIStatus = 'IDLE' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'DISABLED'
export type SlaState = 'met' | 'breached' | 'overdue' | 'at_risk' | 'on_track' | 'none'

export interface Attachment {
  id: number
  original_name: string
  content_type: string
  size: number
  created_at: string
}

export interface Message {
  id: number
  kind: 'REPLY' | 'NOTE' | 'SYSTEM'
  is_internal: boolean
  body: string
  sender_name: string
  sender_role: Role | 'SYSTEM'
  created_at: string
  ai_draft_id?: number | null
  ai_draft_edited?: boolean
}

export interface Activity {
  id: number
  action: string
  label: string
  from_value: string
  to_value: string
  actor_name: string | null
  created_at: string
}

export interface AuthorTicket {
  id: number
  reference: string
  subject: string
  description: string
  status: TicketStatus
  status_label: string
  book: BookBrief | null
  has_unread: boolean
  created_at: string
  updated_at: string
  first_response_at: string | null
  resolved_at: string | null
  last_admin_reply_at: string | null
}

export interface AuthorTicketDetail extends AuthorTicket {
  messages: Message[]
  attachments: Attachment[]
}

export interface AdminTicket {
  id: number
  reference: string
  subject: string
  description: string
  status: TicketStatus
  status_label: string
  category: TicketCategory
  category_label: string
  category_source: ClassificationSource
  ai_category: TicketCategory | ''
  priority: TicketPriority
  priority_label: string
  priority_source: ClassificationSource
  ai_priority: TicketPriority | ''
  ai_confidence: number | null
  ai_status: AIStatus
  ai_draft_status: AIStatus
  book: BookBrief | null
  author: { id: number; name: string; email: string; author_code: string }
  assigned_to: UserBrief | null
  sla_due_at: string | null
  sla_state: SlaState
  has_unread: boolean
  unread_kind: 'new_ticket' | 'author_reply' | null
  first_response_at: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface AdminTicketDetail extends AdminTicket {
  ai_reasoning: string
  ai_error: string
  messages: Message[]
  attachments: Attachment[]
  activities: Activity[]
  book_detail: Book | null
  author_profile: {
    author_code: string
    name: string
    email: string
    phone: string
    city: string
    joined_date: string | null
    books_count: number
    tickets_count: number
  }
}

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface DraftResponse {
  status: 'ready' | 'generating' | 'failed' | 'disabled'
  draft: {
    id: number
    content: string
    kb_sections: { key: string; title: string }[]
    model: string
    created_at: string
  } | null
  error: string
}

export interface QueueStats {
  open: number
  in_progress: number
  unassigned: number
  overdue: number
  critical: number
  mine: number
  ai_failed: number
}

export interface Analytics {
  range_days: number
  totals: { created: number; resolved: number; open_now: number }
  avg_first_response_minutes: number | null
  avg_resolution_minutes: number | null
  sla: { met: number; breached: number; overdue: number; breach_rate: number | null }
  by_category: { key: TicketCategory; label: string; count: number }[]
  by_priority: { key: TicketPriority; label: string; count: number }[]
  by_status: { key: TicketStatus; label: string; count: number }[]
  volume: { date: string; created: number; resolved: number }[]
  ai_overrides: {
    classified: number
    category_overridden: number
    priority_overridden: number
    category_override_rate: number | null
    priority_override_rate: number | null
  }
  ai_usage: {
    calls: number
    failures: number
    prompt_tokens: number
    completion_tokens: number
    cost_usd: number
    avg_latency_ms: number | null
    by_feature: { feature: string; calls: number; cost_usd: number; tokens: number }[]
  }
  drafts: { total: number; ai_as_is: number; ai_edited: number }
}

export type NotificationKind = 'admin_reply' | 'resolved' | 'new_ticket' | 'author_reply'

export interface AppNotification {
  id: string
  kind: NotificationKind
  ticket_id: number
  reference: string
  subject: string
  preview: string
  actor_name: string
  at: string | null
  priority?: TicketPriority
  owner?: 'you' | 'unassigned'
}

export interface NotificationFeed {
  count: number
  items: AppNotification[]
}

export interface RealtimeEvent {
  event: 'connected' | 'pong' | 'ticket.created' | 'ticket.updated' | 'message.created' | 'note.created'
  role?: Role
  actor_id?: number | null
  by_author?: boolean
  ticket?: {
    id: number
    reference: string
    subject: string
    status: TicketStatus
    priority?: TicketPriority
    category?: TicketCategory
    author_name?: string
    assigned_to?: number | null
  }
}
