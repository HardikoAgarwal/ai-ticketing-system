import { api } from './api'
import type {
  AdminTicket,
  AdminTicketDetail,
  Analytics,
  AuthorSummary,
  AuthorTicket,
  AuthorTicketDetail,
  Book,
  DraftResponse,
  Message,
  NotificationFeed,
  Paginated,
  QueueStats,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  User,
  UserBrief,
} from './types'

export interface LoginResponse {
  access: string
  refresh: string
  user: User
}

export const authApi = {
  login: (email: string, password: string) => api.post<LoginResponse>('/auth/login/', { email, password }).then((r) => r.data),
  me: () => api.get<User>('/auth/me/').then((r) => r.data),
}

export const booksApi = {
  list: () => api.get<Book[]>('/books/').then((r) => r.data),
  summary: () => api.get<AuthorSummary>('/me/summary/').then((r) => r.data),
}

export type TicketQuery = Record<string, string | number | undefined>

export const ticketsApi = {
  listAuthor: (params: TicketQuery = {}) =>
    api.get<Paginated<AuthorTicket>>('/tickets/', { params: { page_size: 100, ...params } }).then((r) => r.data),
  listAdmin: (params: TicketQuery = {}) => api.get<Paginated<AdminTicket>>('/tickets/', { params }).then((r) => r.data),
  getAuthor: (id: number) => api.get<AuthorTicketDetail>(`/tickets/${id}/`).then((r) => r.data),
  getAdmin: (id: number) => api.get<AdminTicketDetail>(`/tickets/${id}/`).then((r) => r.data),
  create: (form: FormData, onProgress?: (pct: number) => void) =>
    api
      .post<AuthorTicketDetail>('/tickets/', form, {
        timeout: 60000,
        onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
      })
      .then((r) => r.data),
  update: (
    id: number,
    data: Partial<{ status: TicketStatus; category: TicketCategory; priority: TicketPriority; assigned_to: number | null }>,
  ) => api.patch<AdminTicketDetail>(`/tickets/${id}/`, data).then((r) => r.data),
  assignToMe: (id: number) => api.post<AdminTicketDetail>(`/tickets/${id}/assign-to-me/`).then((r) => r.data),
  postMessage: (id: number, data: { body: string; kind?: 'REPLY' | 'NOTE'; ai_draft_id?: number | null; resolve?: boolean }) =>
    api.post<Message>(`/tickets/${id}/messages/`, data).then((r) => r.data),
  markSeen: (id: number) => api.post(`/tickets/${id}/mark-seen/`),
  confirmResolution: (id: number, resolved: boolean, message?: string) =>
    api.post<AuthorTicketDetail>(`/tickets/${id}/confirm-resolution/`, { resolved, message }).then((r) => r.data),
  draft: (id: number) => api.get<DraftResponse>(`/tickets/${id}/draft/`).then((r) => r.data),
  regenerateDraft: (id: number) => api.post<DraftResponse>(`/tickets/${id}/draft/regenerate/`).then((r) => r.data),
  reclassify: (id: number) => api.post<AdminTicket>(`/tickets/${id}/reclassify/`).then((r) => r.data),
  attachmentUrl: (id: number, attachmentId: number) =>
    api.get<{ url: string; name: string }>(`/tickets/${id}/attachments/${attachmentId}/`).then((r) => r.data),
  stats: () => api.get<QueueStats>('/tickets/stats/').then((r) => r.data),
  notifications: () => api.get<NotificationFeed>('/tickets/notifications/').then((r) => r.data),
  markAllNotificationsRead: () => api.post('/tickets/notifications/mark-all-read/'),
}

export const adminApi = {
  agents: () => api.get<UserBrief[]>('/admin/agents/').then((r) => r.data),
  analytics: (days: number) => api.get<Analytics>('/admin/analytics/summary/', { params: { days } }).then((r) => r.data),
}
