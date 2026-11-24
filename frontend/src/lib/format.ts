import { format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns'

const num = new Intl.NumberFormat('en-US')

export function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : num.format(value)
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const d = typeof value === 'string' ? parseISO(value) : value
  return isValid(d) ? d : null
}

export function formatDate(value: string | Date | null | undefined, fallback = '—'): string {
  const d = toDate(value)
  return d ? format(d, 'd MMM yyyy') : fallback
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const d = toDate(value)
  return d ? format(d, "d MMM yyyy, h:mm a") : '—'
}

export function relativeTime(value: string | Date | null | undefined): string {
  const d = toDate(value)
  return d ? `${formatDistanceToNowStrict(d)} ago` : '—'
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '—'
  if (minutes < 60) return `${Math.round(minutes)}m`
  const hours = minutes / 60
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)}h`
  return `${(hours / 24).toFixed(1)}d`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function firstName(fullName: string | undefined): string {
  return (fullName || '').split(' ')[0]
}

export function initials(fullName: string | undefined): string {
  return (fullName || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** "next_renewal_date" -> "Next renewal date" */
export function labelize(key: string): string {
  const s = key.replace(/_/g, ' ').trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.map(formatValue).join(', ')
  if (typeof value === 'object')
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${labelize(k)}: ${formatValue(v)}`)
      .join('; ')
  return String(value)
}

export function timeUntil(value: string | null | undefined): string | null {
  if (!value) return null
  const ms = new Date(value).getTime() - Date.now()
  if (ms <= 0) return 'expired'
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m`
}
