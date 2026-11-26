import { Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { RelativeTime } from '@/components/common'
import { Avatar, DataTable, ROW, SolidChip, TBODY, Td, Th } from '@/components/ds'
import { categoryHue, STATUS_CHIP, STATUS_HUE } from '@/features/inbox/model'
import { StatusPill } from '@/features/inbox/StatusPill'
import { formatDate } from '@/lib/format'
import type { StaffTicket } from '@/lib/types'

import { took } from './history-utils'

export function Rating({ score }: { score: number | null }) {
  if (score === null) return <span className="text-sm text-ink-3">—</span>
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink tabular-nums" aria-label={`Rated ${score} out of 5`}>
      <Star className="size-4" style={{ fill: 'var(--viz-butter)', color: 'var(--viz-butter)' }} aria-hidden />
      {score}
    </span>
  )
}

function Row({ ticket: t, to }: { ticket: StaffTicket; to: string }) {
  const navigate = useNavigate()
  const status = STATUS_CHIP[t.status]
  return (
    <tr
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('a,button')) navigate(to)
      }}
      className={`group ${ROW}`}
    >
      <Td>
        <div className="flex min-w-0 items-center gap-3">
          <a
            href={to}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
              e.preventDefault()
              navigate(to)
            }}
            className="min-w-0 truncate rounded-sm text-[15px] font-medium text-ink outline-none hover:underline focus-visible:ring-2 focus-visible:ring-violet"
          >
            {t.subject}
          </a>
          <StatusPill hue={STATUS_HUE[t.status]}>{status.label}</StatusPill>
        </div>
        <div className="mt-1.5 font-mono text-xs text-ink-3">{t.reference}</div>
      </Td>
      <Td className="w-44">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={t.requester.name} size="sm" />
          <span className="truncate text-sm text-ink">{t.requester.name}</span>
        </div>
      </Td>
      <Td className="hidden w-44 xl:table-cell">
        {t.category ? (
          <SolidChip hue={categoryHue(t.category.name)} size="sm" className="max-w-full truncate">
            {t.category.name}
          </SolidChip>
        ) : (
          <span className="text-ink-3">—</span>
        )}
      </Td>
      <Td className="w-32">
        <span className="block text-sm font-semibold text-ink">{t.resolved_at ? formatDate(t.resolved_at) : '—'}</span>
        {t.resolved_at && (
          <span className="block text-xs text-ink-2">
            <RelativeTime value={t.resolved_at} />
          </span>
        )}
      </Td>
      <Td className="hidden w-24 text-sm font-semibold text-ink tabular-nums xl:table-cell">{took(t)}</Td>
      <Td className="w-36 text-right">
        <Rating score={t.csat_score} />
      </Td>
    </tr>
  )
}

/** Finished tickets as a real table: ticket (status badge beside the title), customer, category, when it finished, how long it took, rating. */
export function HistoryTable({ tickets, basePath }: { tickets: StaffTicket[]; basePath: string }) {
  return (
    <DataTable caption="Resolved and closed tickets">
      <thead>
        <tr>
          <Th>Ticket</Th>
          <Th className="w-44">Customer</Th>
          <Th className="hidden w-44 xl:table-cell">Category</Th>
          <Th className="w-32">Finished</Th>
          <Th className="hidden w-24 xl:table-cell">Took</Th>
          <Th className="w-36 text-right">Rating</Th>
        </tr>
      </thead>
      <tbody className={TBODY}>
        {tickets.map((t) => (
          <Row key={t.id} ticket={t} to={`${basePath}/${t.id}`} />
        ))}
      </tbody>
    </DataTable>
  )
}
