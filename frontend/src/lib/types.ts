export type Role = 'OWNER' | 'ADMIN' | 'AGENT' | 'REQUESTER'
export const STAFF_ROLES: Role[] = ['OWNER', 'ADMIN', 'AGENT']
export const MANAGER_ROLES: Role[] = ['OWNER', 'ADMIN']

export interface WorkspaceBrief {
  id: number
  name: string
  slug: string
  tagline: string
  is_demo: boolean
  expires_at: string | null
}

export interface Membership {
  workspace: WorkspaceBrief
  role: Role
  company: string
}

export interface User {
  id: number
  email: string
  full_name: string
  is_demo: boolean
  memberships: Membership[]
}

export interface Workspace {
  id: number
  name: string
  slug: string
  template: string
  tagline: string
  agent_title: string
  tone: string
  sla_hours: Record<TicketPriority, number>
  ai_enabled: boolean
  /** Resolved tickets close themselves after this many days with no customer reply. 0 = off. */
  auto_close_days: number
  is_demo: boolean
  expires_at: string | null
  created_at: string
  role: Role
}

export interface Category {
  id: number
  key: string
  name: string
  description: string
  keywords: Record<string, number>
  is_default: boolean
  position: number
}
export type CategoryBrief = Pick<Category, 'id' | 'key' | 'name'>

export interface RecordBrief {
  id: number
  kind: string
  reference: string
  title: string
  status: string
}
export interface WorkspaceRecord extends RecordBrief {
  data: Record<string, unknown>
  created_at: string
}

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type TicketPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type Sentiment = 'NEGATIVE' | 'NEUTRAL' | 'POSITIVE'
export type ClassificationSource = 'AI' | 'FALLBACK' | 'STAFF'
export type AIStatus = 'IDLE' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'DISABLED'
export type SlaState = 'met' | 'breached' | 'overdue' | 'at_risk' | 'on_track' | 'none'

export interface UserBrief {
  id: number
  full_name: string
  email: string
}

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
  sender_is_requester: boolean
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

/** What a requester (customer) sees. No triage data. */
export interface RequesterTicket {
  id: number
  reference: string
  subject: string
  description: string
  status: TicketStatus
  status_label: string
  record: RecordBrief | null
  has_unread: boolean
  created_at: string
  updated_at: string
  first_response_at: string | null
  resolved_at: string | null
  last_staff_reply_at: string | null
  csat_score: number | null
}
export interface RequesterTicketDetail extends RequesterTicket {
  csat_comment: string
  messages: Message[]
  attachments: Attachment[]
}

export interface StaffTicket {
  id: number
  reference: string
  subject: string
  description: string
  status: TicketStatus
  status_label: string
  category: CategoryBrief | null
  category_source: ClassificationSource
  ai_category: CategoryBrief | null
  priority: TicketPriority
  priority_label: string
  priority_source: ClassificationSource
  ai_priority: TicketPriority | ''
  ai_confidence: number | null
  sentiment: Sentiment | ''
  ai_summary: string
  ai_status: AIStatus
  ai_draft_status: AIStatus
  record: RecordBrief | null
  requester: { id: number; name: string; email: string }
  assigned_to: UserBrief | null
  sla_due_at: string | null
  sla_state: SlaState
  has_unread: boolean
  unread_kind: 'new_ticket' | 'requester_reply' | null
  first_response_at: string | null
  resolved_at: string | null
  csat_score: number | null
  created_at: string
  updated_at: string
}
export interface StaffTicketDetail extends StaffTicket {
  ai_reasoning: string
  ai_error: string
  csat_comment: string
  messages: Message[]
  attachments: Attachment[]
  activities: Activity[]
  record_detail: WorkspaceRecord | null
  requester_profile: {
    name: string
    email: string
    company: string
    profile: Record<string, unknown>
    joined: string | null
    records_count: number
    tickets_count: number
  }
}

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface Citation {
  article_id: number
  title: string
  score: number
}
export interface DraftResponse {
  status: 'ready' | 'generating' | 'failed' | 'disabled'
  draft: { id: number; content: string; citations: Citation[]; model: string; created_at: string } | null
  error: string
}

export interface SimilarTicket {
  id: number
  reference: string
  subject: string
  status: TicketStatus
  similarity: number
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

export interface AIUsage {
  global_used: number
  global_cap: number
  workspace_used: number
  workspace_cap: number
}

export interface Analytics {
  range_days: number
  totals: { created: number; resolved: number; open_now: number }
  /** The period of the same length just before this one, for "vs previous" deltas. */
  previous: { created: number; resolved: number; avg_first_response_minutes: number | null; csat_average: number | null }
  avg_first_response_minutes: number | null
  avg_resolution_minutes: number | null
  sla: { met: number; breached: number; overdue: number; breach_rate: number | null }
  by_category: { key: string; label: string; count: number }[]
  by_priority: { key: TicketPriority; label: string; count: number }[]
  by_status: { key: TicketStatus; label: string; count: number }[]
  by_sentiment: { key: Sentiment; label: string; count: number }[]
  volume: { date: string; created: number; resolved: number }[]
  csat: { average: number | null; responses: number }
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

export type NotificationKind = 'staff_reply' | 'resolved' | 'new_ticket' | 'requester_reply'

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

export interface Article {
  id: number
  title: string
  body: string
  category: number | null
  is_published: boolean
  is_internal: boolean
  created_at: string
  updated_at: string
}
export interface ArticleListItem {
  id: number
  title: string
  category: number | null
  category_name: string | null
  is_published: boolean
  is_internal: boolean
  excerpt: string
  indexed: boolean
  updated_at: string
}
export interface KBHit {
  article_id: number
  title: string
  category_name: string | null
  score: number
  /** strong = clearly this article's topic; possible = related. Anything weaker is not returned. */
  level: 'strong' | 'possible'
  /** 0-100, absolute (not relative to the best hit). */
  match: number
  text: string
  is_internal: boolean
  /** Words from the passage that the question matched on. */
  matched_terms: string[]
  /** The AI is given the best few articles when it drafts; this one is among them. */
  used_in_draft: boolean
}
export interface KBSearch {
  /** semantic = by meaning (needs the server AI key); keyword = by words. */
  mode: 'semantic' | 'keyword'
  verdict: 'covered' | 'partial' | 'none'
  /** Published articles still being indexed, so not yet matchable by meaning. */
  pending: number
  hits: KBHit[]
}
export interface Suggestion {
  article_id: number
  title: string
  excerpt: string
}

export interface Macro {
  id: number
  title: string
  body: string
}

export interface Member {
  id: number
  full_name: string
  email: string
  role: Role
  company?: string
  profile?: Record<string, unknown>
  joined_at?: string
}

export interface Invite {
  id: number
  email: string
  role: Role
  token: string
  accepted_at: string | null
  created_at: string
}

export interface DemoTemplate {
  key: string
  name: string
  tagline: string
  industry: string
}

export interface RealtimeEvent {
  event: 'connected' | 'pong' | 'ticket.created' | 'ticket.updated' | 'message.created' | 'note.created'
  role?: Role
  actor_id?: number | null
  by_requester?: boolean
  ticket?: {
    id: number
    reference: string
    subject: string
    status: TicketStatus
    priority?: TicketPriority
    category?: string | null
    requester_name?: string
    assigned_to?: number | null
  }
}

export const isStaff = (role: Role | undefined) => !!role && STAFF_ROLES.includes(role)
export const isManager = (role: Role | undefined) => !!role && MANAGER_ROLES.includes(role)
