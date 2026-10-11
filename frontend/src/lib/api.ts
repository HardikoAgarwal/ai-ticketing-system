import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:8000'
export const WS_URL =
  (import.meta.env.VITE_WS_URL as string | undefined)?.replace(/\/$/, '') || API_URL.replace(/^http/, 'ws')

const ACCESS_KEY = 'bookleaf.access'
const REFRESH_KEY = 'bookleaf.refresh'

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
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
  const token = tokenStore.access
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshing: Promise<string | null> | null = null
let onSessionExpired: (() => void) | null = null

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.refresh
  if (!refresh) return null
  try {
    const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh/`, { refresh })
    tokenStore.set(data.access, data.refresh)
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

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: { message?: string; code?: string; details?: Record<string, unknown> } }>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    const isAuthCall = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh')

    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true
      const token = await ensureFreshAccessToken()
      if (token) {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      }
      tokenStore.clear()
      onSessionExpired?.()
    }

    if (!error.response) {
      return Promise.reject(new ApiError("Can't reach BookLeaf servers. Check your connection and try again.", 0, 'network_error'))
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
