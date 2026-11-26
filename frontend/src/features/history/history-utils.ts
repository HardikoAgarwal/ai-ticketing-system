import { differenceInMinutes, parseISO } from 'date-fns'

import { formatDuration } from '@/lib/format'
import type { StaffTicket } from '@/lib/types'

/** How long a finished ticket took, from opened to resolved ("11h", "2.1d"). */
export function took(t: StaffTicket) {
  return t.resolved_at ? formatDuration(differenceInMinutes(parseISO(t.resolved_at), parseISO(t.created_at))) : '—'
}
