import { Star } from 'lucide-react'
import { differenceInMinutes, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'

import { RelativeTime } from '@/components/common'
import { Avatar, SolidChip } from '@/components/ds'
import { categoryHue, STATUS_CHIP, STATUS_HUE } from '@/features/inbox/model'
import { formatDate, formatDuration } from '@/lib/format'
import type { StaffTicket } from '@/lib/types'

/** Columns shared by the header row and every row (lg and up). Category and time-to-resolve appear from xl. */
export const HISTORY_GRID =
  'lg:grid lg:grid-cols-[minmax(0,1fr)_8.5rem_10rem_9rem_5.5rem] xl:grid-cols-[minmax(0,1fr)_8.5rem_10rem_10rem_9rem_6rem_5rem] lg:items-center lg:gap-x-4'

function took(t: StaffTicket) {
  return t.resolved_at ? formatDuration(differenceInMinutes(parseISO(t.resolved_at), parseISO(t.created_at))) : '—'
}

function Rating({ score }: { score: number | null }) {
  if (score === null) return <span className="text-sm text-ink-3">—</span>
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink tabular-nums" aria-label={`Rated ${score} out of 5`}>
      <Star className="size-4" style={{ fill: 'var(--viz-butter)', color: 'var(--viz-butter)' }} aria-hidden />
      {score}
    </span>
  )
}

/** One finished ticket: subject and reference, whether it is Resolved or Closed, the customer, the category, when it finished, how long it took, and the rating. */
export function HistoryRow({ ticket: t, to }: { ticket: StaffTicket; to: string }) {
  const status = STATUS_CHIP[t.status]
  const chip = (
    <SolidChip hue={STATUS_HUE[t.status]} icon={status.icon} size="sm">
      {status.label}
    </SolidChip>
  )
  return (
    <li className="rounded-panel border border-line bg-surface shadow-card transition-colors hover:border-line-strong">
      <Link to={to} aria-label={`${t.reference}: ${t.subject}`} className={`block rounded-panel px-5 py-5 outline-none focus-visible:ring-2 focus-visible:ring-violet ${HISTORY_GRID}`}>
        <span className="block min-w-0">
          <span className="line-clamp-2 block text-[15px] leading-5 font-semibold text-ink">{t.subject}</span>
          <span className="mt-1 block truncate font-mono text-xs text-ink-3">{t.reference}</span>
        </span>
        <span className="mt-3 flex flex-wrap items-center gap-2 lg:mt-0 lg:block">
          {chip}
          <span className="text-xs text-ink-2 lg:hidden">
            {t.resolved_at ? formatDate(t.resolved_at) : ''}
          </span>
        </span>
        <span className="mt-3 flex min-w-0 items-center gap-2 lg:mt-0">
          <Avatar name={t.requester.name} size="sm" />
          <span className="truncate text-sm text-ink-2">{t.requester.name}</span>
        </span>
        <span className="hidden min-w-0 xl:block">
          {t.category ? (
            <SolidChip hue={categoryHue(t.category.name)} size="sm" className="max-w-full truncate">
              {t.category.name}
            </SolidChip>
          ) : (
            <span className="text-ink-3">—</span>
          )}
        </span>
        <span className="hidden flex-col lg:flex">
          <span className="text-sm font-semibold text-ink">{t.resolved_at ? formatDate(t.resolved_at) : '—'}</span>
          {t.resolved_at && (
            <span className="text-xs text-ink-2">
              <RelativeTime value={t.resolved_at} />
            </span>
          )}
        </span>
        <span className="hidden text-sm font-semibold text-ink tabular-nums xl:block">{took(t)}</span>
        <span className="hidden lg:block lg:text-right">
          <Rating score={t.csat_score} />
        </span>
      </Link>
    </li>
  )
}
