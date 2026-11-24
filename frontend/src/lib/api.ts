import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:8000'
export const WS_URL =
  (import.meta.env.VITE_WS_URL as string | undefined)?.replace(/\/$/, '') || API_URL.replace(/^http/, 'ws')

/**
 * Sessions. A normal login stores one session ("main"). The public demo stores two
 * ("agent" and "customer") so a visitor can flip between both sides of the same workspace.
 */
export type SessionKey = 'main' | 'agent' | 'customer'

export interface StoredSession {
  access: string
  refresh: string
}
export interface DemoMeta {
  slug: string
  expiresAt: string | null
}
interface Store {
  active: SessionKey | null
  sessions: Partial<Record<SessionKey, StoredSession>>
  demo: DemoMeta | null
}

const STORE_KEY = 'helpdesk.sessions.v1'

function read(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return JSON.parse(raw) as Store
  } catch {
    /* corrupt or unavailable storage */
  }
  return { active: null, sessions: {}, demo: null }
}

let store: Store = read()
const write = () => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store))
  } catch {
    /* ignore */
  }
}

export const sessionStore = {
  get active() {
    return store.active
  },
  get demo() {
    return store.demo
  },
  get access() {
    return store.active ? (store.sessions[store.active]?.access ?? null) : null
  },
  get refresh() {
    return store.active ? (store.sessions[store.active]?.refresh ?? null) : null
  },
  has(key: SessionKey) {
    return !!store.sessions[key]
  },
  setSession(key: SessionKey, session: StoredSession, makeActive = true) {
    store = { ...store, sessions: { ...store.sessions, [key]: session }, active: makeActive ? key : store.active }
    write()
  },
  setDemo(demo: DemoMeta | null) {
    store = { ...store, demo }
    write()
  },
  switchTo(key: SessionKey) {
    store = { ...store, active: key }
    write()
  },
  updateAccess(access: string, refresh?: string) {
    if (!store.active) return
    const current = store.sessions[store.active]
    if (!current) return
    store = { ...store, sessions: { ...store.sessions, [store.active]: { access, refresh: refresh ?? current.refresh } } }
    write()
  },
  clear() {
    store = { active: null, sessions: {}, demo: null }
    write()
  },
}

export class ApiError extends Error {
  status: number
  code: string
  details?: Record<string, unknown>

  constructor(message: string, status: number, code: string, details?: Record<string, unknown>) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }

  /** Field-level validation messages, e.g. { subject: "Ensure this field has at least 5 characters." } */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {}
    if (this.details && typeof this.details === 'object') {
      for (const [key, value] of Object.entries(this.details)) {
        out[key] = Array.isArray(value) ? String(value[0]) : String(value)
      }
    }
    return out
  }
}

export const api = axios.create({ baseURL: `${API_URL}/api/v1`, timeout: 20000 })

api.interceptors.request.use((config) => {
  const token = sessionStore.access
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshing: Promise<string | null> | null = null
let onSessionExpired: (() => void) | null = null
let onWorkspaceExpired: (() => void) | null = null

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler
}
export function setWorkspaceExpiredHandler(handler: () => void) {
  onWorkspaceExpired = handler
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = sessionStore.refresh
  if (!refresh) return null
  try {
    const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh/`, { refresh })
    sessionStore.updateAccess(data.access, data.refresh)
    return data.access as string
  } catch {
    return null
  }
}

/** Fresh access token for non-axios clients (WebSocket). */
export async function ensureFreshAccessToken(): Promise<string | null> {
  refreshing = refreshing ?? refreshAccessToken().finally(() => (refreshing = null))
  return refreshing
}

type ErrorBody = { error?: { message?: string; code?: string; details?: Record<string, unknown> } }

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ErrorBody>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    const isAuthCall = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh')

    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true
      const token = await ensureFreshAccessToken()
      if (token) {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      }
      sessionStore.clear()
      onSessionExpired?.()
    }

    if (error.response?.status === 410 && error.response.data?.error?.code === 'workspace_expired') {
      onWorkspaceExpired?.()
    }

    if (!error.response) {
      return Promise.reject(new ApiError("Can't reach the server. Check your connection and try again.", 0, 'network_error'))
    }
    const payload = error.response.data?.error
    return Promise.reject(
      new ApiError(
        payload?.message || 'Something went wrong. Please try again.',
        error.response.status,
        payload?.code || 'error',
        payload?.details,
      ),
    )
  },
)

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return 'Something went wrong. Please try again.'
}
