import { Link } from 'react-router-dom'

import { Avatar, SolidChip } from '@/components/ds'
import { STATUS_CHIP, STATUS_HUE } from '@/features/inbox/model'
import { formatDate } from '@/lib/format'
import type { StaffTicket } from '@/lib/types'

import { took } from './history-utils'
import { Rating } from './HistoryTable'

/** One finished ticket as a compact card, used below the large breakpoint where the table does not fit. */
export function HistoryRow({ ticket: t, to }: { ticket: StaffTicket; to: string }) {
  const status = STATUS_CHIP[t.status]
  return (
    <li className="rounded-panel bg-surface shadow-card">
      <Link to={to} aria-label={`${t.reference}: ${t.subject}`} className="block rounded-panel px-4 py-4 outline-none focus-visible:ring-2 focus-visible:ring-violet">
        <span className="line-clamp-2 block text-[15px] leading-5 font-semibold text-ink">{t.subject}</span>
        <span className="mt-1 block truncate font-mono text-xs text-ink-3">{t.reference}</span>
        <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <SolidChip hue={STATUS_HUE[t.status]} icon={status.icon} size="sm">
            {status.label}
          </SolidChip>
          <span className="text-xs text-ink-2">
            {t.resolved_at ? formatDate(t.resolved_at) : ''}
            {t.resolved_at ? ` · took ${took(t)}` : ''}
          </span>
          <span className="ml-auto">
            <Rating score={t.csat_score} />
          </span>
        </span>
        <span className="mt-3 flex min-w-0 items-center gap-2">
          <Avatar name={t.requester.name} size="sm" />
          <span className="truncate text-sm text-ink-2">{t.requester.name}</span>
        </span>
      </Link>
    </li>
  )
}
