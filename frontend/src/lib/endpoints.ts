import { api } from './api'
import type {
  AIUsage,
  Analytics,
  Article,
  ArticleListItem,
  Category,
  DemoTemplate,
  DraftResponse,
  Invite,
  KBSearch,
  Macro,
  Member,
  Message,
  NotificationFeed,
  Paginated,
  QueueStats,
  RequesterTicket,
  RequesterTicketDetail,
  SimilarTicket,
  StaffTicket,
  StaffTicketDetail,
  Suggestion,
  TicketPriority,
  TicketStatus,
  User,
  Workspace,
  WorkspaceRecord,
} from './types'

export interface AuthResponse {
  access: string
  refresh: string
  user: User
  workspace_slug?: string
}
export interface DemoSession {
  access: string
  refresh: string
  user: User
}
export interface DemoStartResponse {
  workspace_slug: string
  expires_at: string
  agent: DemoSession
  customer: DemoSession
}

export const authApi = {
  login: (email: string, password: string) => api.post<AuthResponse>('/auth/login/', { email, password }).then((r) => r.data),
  register: (data: { full_name: string; email: string; password: string; workspace_name: string }) =>
    api.post<AuthResponse>('/auth/register/', data).then((r) => r.data),
  acceptInvite: (data: { token: string; full_name: string; password: string }) =>
    api.post<AuthResponse>('/auth/accept-invite/', data).then((r) => r.data),
  me: () => api.get<User>('/auth/me/').then((r) => r.data),
}

export const demoApi = {
  templates: () => api.get<DemoTemplate[]>('/demo/templates/').then((r) => r.data),
  start: (template: string) => api.post<DemoStartResponse>('/demo/start/', { template }, { timeout: 60000 }).then((r) => r.data),
}

export interface WorkspaceRequestInput {
  full_name: string
  email: string
  company: string
  team_size: string
  message: string
}

/** The landing page's "request a workspace" form. Public; the request is stored and read in the Django admin. */
export const workspaceRequestApi = {
  send: (data: WorkspaceRequestInput) => api.post('/workspace-requests/', data).then(() => undefined),
}

export type TicketQuery = Record<string, string | number | undefined>

/** All workspace resources live under /w/<slug>/. */
export const wsApi = (slug: string) => {
  const base = `/w/${slug}`
  return {
    workspace: () => api.get<Workspace>(`${base}/`).then((r) => r.data),
    updateWorkspace: (data: Partial<Pick<Workspace, 'name' | 'tagline' | 'agent_title' | 'tone' | 'sla_hours' | 'ai_enabled' | 'auto_close_days'>>) =>
      api.patch<Workspace>(`${base}/`, data).then((r) => r.data),

    categories: () => api.get<Category[]>(`${base}/categories/`).then((r) => r.data),
    createCategory: (data: Partial<Category>) => api.post<Category>(`${base}/categories/`, data).then((r) => r.data),
    updateCategory: (id: number, data: Partial<Category>) => api.patch<Category>(`${base}/categories/${id}/`, data).then((r) => r.data),
    deleteCategory: (id: number) => api.delete(`${base}/categories/${id}/`),

    members: (staffOnly = false) =>
      api.get<Member[]>(`${base}/members/`, { params: staffOnly ? { role: 'staff' } : {} }).then((r) => r.data),
    invites: () => api.get<Invite[]>(`${base}/invites/`).then((r) => r.data),
    createInvite: (data: { email: string; role: string }) => api.post<Invite>(`${base}/invites/`, data).then((r) => r.data),
    revokeInvite: (id: number) => api.delete(`${base}/invites/${id}/`),
    updateMemberRole: (id: number, role: 'ADMIN' | 'AGENT') => api.patch<Member>(`${base}/members/${id}/`, { role }).then((r) => r.data),
    removeMember: (id: number) => api.delete(`${base}/members/${id}/`),

    records: () => api.get<WorkspaceRecord[]>(`${base}/records/`).then((r) => r.data),

    articles: () => api.get<ArticleListItem[]>(`${base}/articles/`).then((r) => r.data),
    article: (id: number) => api.get<Article>(`${base}/articles/${id}/`).then((r) => r.data),
    createArticle: (data: Partial<Article>) => api.post<Article>(`${base}/articles/`, data).then((r) => r.data),
    updateArticle: (id: number, data: Partial<Article>) => api.patch<Article>(`${base}/articles/${id}/`, data).then((r) => r.data),
    deleteArticle: (id: number) => api.delete(`${base}/articles/${id}/`),
    searchArticles: (q: string) => api.get<KBSearch>(`${base}/articles/search/`, { params: { q } }).then((r) => r.data),
    suggestions: (q: string) => api.get<Suggestion[]>(`${base}/suggestions/`, { params: { q } }).then((r) => r.data),

    macros: () => api.get<Macro[]>(`${base}/macros/`).then((r) => r.data),
    createMacro: (data: Partial<Macro>) => api.post<Macro>(`${base}/macros/`, data).then((r) => r.data),
    deleteMacro: (id: number) => api.delete(`${base}/macros/${id}/`),

    analytics: (days: number) => api.get<Analytics>(`${base}/analytics/summary/`, { params: { days } }).then((r) => r.data),

    tickets: {
      listRequester: (params: TicketQuery = {}) =>
        api.get<Paginated<RequesterTicket>>(`${base}/tickets/`, { params: { page_size: 100, ...params } }).then((r) => r.data),
      listStaff: (params: TicketQuery = {}) => api.get<Paginated<StaffTicket>>(`${base}/tickets/`, { params }).then((r) => r.data),
      getRequester: (id: number) => api.get<RequesterTicketDetail>(`${base}/tickets/${id}/`).then((r) => r.data),
      getStaff: (id: number) => api.get<StaffTicketDetail>(`${base}/tickets/${id}/`).then((r) => r.data),
      create: (form: FormData, onProgress?: (pct: number) => void) =>
        api
          .post<RequesterTicketDetail>(`${base}/tickets/`, form, {
            timeout: 60000,
            onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
          })
          .then((r) => r.data),
      update: (
        id: number,
        data: Partial<{ status: TicketStatus; category: string; priority: TicketPriority; assigned_to: number | null }>,
      ) => api.patch<StaffTicketDetail>(`${base}/tickets/${id}/`, data).then((r) => r.data),
      assignToMe: (id: number) => api.post<StaffTicketDetail>(`${base}/tickets/${id}/assign-to-me/`).then((r) => r.data),
      postMessage: (id: number, data: { body: string; kind?: 'REPLY' | 'NOTE'; ai_draft_id?: number | null; resolve?: boolean }) =>
        api.post<Message>(`${base}/tickets/${id}/messages/`, data).then((r) => r.data),
      markSeen: (id: number) => api.post(`${base}/tickets/${id}/mark-seen/`),
      confirmResolution: (id: number, resolved: boolean, message?: string) =>
        api.post<RequesterTicketDetail>(`${base}/tickets/${id}/confirm-resolution/`, { resolved, message }).then((r) => r.data),
      csat: (id: number, score: number, comment?: string) =>
        api.post<RequesterTicketDetail>(`${base}/tickets/${id}/csat/`, { score, comment }).then((r) => r.data),
      draft: (id: number) => api.get<DraftResponse>(`${base}/tickets/${id}/draft/`).then((r) => r.data),
      regenerateDraft: (id: number) => api.post<DraftResponse>(`${base}/tickets/${id}/draft/regenerate/`).then((r) => r.data),
      reclassify: (id: number) => api.post<StaffTicket>(`${base}/tickets/${id}/reclassify/`).then((r) => r.data),
      similar: (id: number) => api.get<SimilarTicket[]>(`${base}/tickets/${id}/similar/`).then((r) => r.data),
      attachmentUrl: (id: number, attachmentId: number) =>
        api.get<{ url: string; name: string }>(`${base}/tickets/${id}/attachments/${attachmentId}/`).then((r) => r.data),
      stats: () => api.get<QueueStats>(`${base}/tickets/stats/`).then((r) => r.data),
      aiUsage: () => api.get<AIUsage>(`${base}/tickets/ai-usage/`).then((r) => r.data),
      notifications: () => api.get<NotificationFeed>(`${base}/tickets/notifications/`).then((r) => r.data),
      markAllNotificationsRead: () => api.post(`${base}/tickets/notifications/mark-all-read/`),
    },
  }
}
