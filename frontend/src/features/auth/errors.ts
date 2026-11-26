import { ApiError, errorMessage } from '@/lib/api'

/** Turns an API failure into something a person can act on (rate limits and cold starts get their own wording). */
export function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) return 'Too many attempts. Please wait a minute and try again.'
    if (err.status === 0 || err.status >= 502) return "We couldn't reach the server. It may be waking up, so try again in a few seconds."
    if (err.status === 401) return 'That email and password combination does not match.'
  }
  return errorMessage(err)
}
