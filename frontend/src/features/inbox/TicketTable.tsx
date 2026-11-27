import { Mail } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { RelativeTime } from '@/components/common'
import { Avatar, DataTable, ROW, ROW_SELECTED, SolidChip, TBODY, Td, Th } from '@/components/ds'
import type { StaffTicket } from '@/lib/types'
import { cn } from '@/lib/utils'

import { attentionOf, categoryHue, PRIORITY_HUE, PRIORITY_LOOK, STATUS_CHIP, STATUS_HUE, TONE_HUE } from './model'
import { NewTag } from './NewTag'
import { StatusPill } from './StatusPill'
import { SelectBox } from './SelectBox'

export interface TicketTableProps {
  tickets: StaffTicket[]
  ticketsPath: string
  cursor: number | null
  selected: Set<number>
  fresh: Set<number>
  meId?: number
  onToggle: (id: number) => void
}

function Row({ ticket: t, to, cursor, checked, fresh, meId, onToggle }: { ticket: StaffTicket; to: string; cursor: boolean; checked: boolean; fresh: boolean; meId?: number; onToggle: (id: number) => void }) {
  const navigate = useNavigate()
  const attn = attentionOf(t)
  const prio = PRIORITY_LOOK[t.priority]
  const status = STATUS_CHIP[t.status]
  const AttnIcon = attn?.icon
  // Only what needs a person (overdue, at risk, a customer waiting) gets a coloured badge; everything else is the quiet status label.
  const urgent = !!attn && ['overdue', 'message', 'atrisk'].includes(attn.kind)
  const mine = !!meId && t.assigned_to?.id === meId
  return (
    <tr
      data-ticket-id={t.id}
      onClick={(e) => {
        // The row is a big click target; real controls inside it keep their own behaviour.
        if (!(e.target as HTMLElement).closest('a,button')) navigate(to)
      }}
      className={cn('group', ROW, checked && ROW_SELECTED, cursor && 'outline-2 -outline-offset-2 outline-violet')}
    >
      <Td className="w-12 pr-0 first:pl-3.5">
        <SelectBox shape="square" checked={checked} onChange={() => onToggle(t.id)} label={`Select ${t.reference}`} className="size-5" />
      </Td>
      <Td>
        <div className="flex min-w-0 items-center gap-3">
          <a
            href={to}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
              e.preventDefault()
              navigate(to)
            }}
            className={cn('min-w-0 truncate rounded-sm text-[15px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-violet', t.has_unread ? 'font-semibold' : 'font-medium')}
          >
            {t.subject}
          </a>
          {urgent && AttnIcon ? (
            <SolidChip hue={attn.kind === 'message' ? 'mint' : TONE_HUE[attn.tone]} icon={attn.kind === 'message' ? Mail : AttnIcon} size="sm" className="shrink-0">
              {attn.label}
            </SolidChip>
          ) : (
            <StatusPill hue={STATUS_HUE[t.status]}>{status.label}</StatusPill>
          )}
          {fresh && <NewTag size="sm" className="shrink-0" />}
        </div>
        <div className="mt-1.5 font-mono text-xs text-ink-3">{t.reference}</div>
      </Td>
      <Td className="w-28">
        {prio && (
          <SolidChip hue={PRIORITY_HUE[t.priority] ?? 'slate'} icon={prio.icon} size="sm">
            {prio.label}
          </SolidChip>
        )}
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
      <Td className="hidden w-36 xl:table-cell">
        {t.assigned_to ? (
          <div className={cn('flex min-w-0 items-center gap-2.5 text-sm', mine ? 'font-semibold text-violet' : 'text-ink')}>
            <Avatar name={t.assigned_to.full_name} size="sm" />
            <span className="truncate">{mine ? 'You' : t.assigned_to.full_name}</span>
          </div>
        ) : (
          <span className="text-sm text-ink-3 italic">Unassigned</span>
        )}
      </Td>
      <Td className="w-40 text-right text-sm whitespace-nowrap text-ink-2">
        <RelativeTime value={t.updated_at} />
      </Td>
    </tr>
  )
}

/** Active tickets as a real table: select, ticket (the status or attention badge beside the title, reference underneath), priority, customer, category, owner, updated. */
export function TicketTable({ tickets, ticketsPath, cursor, selected, fresh, meId, onToggle }: TicketTableProps) {
  return (
    <DataTable caption="Active tickets">
      <thead>
        <tr>
          <Th className="w-12 first:pl-3.5">
            <span className="sr-only">Select</span>
          </Th>
          <Th>Ticket</Th>
          <Th className="w-28">Priority</Th>
          <Th className="w-44">Customer</Th>
          <Th className="hidden w-44 xl:table-cell">Category</Th>
          <Th className="hidden w-36 xl:table-cell">Owner</Th>
          <Th className="w-40 text-right">Updated</Th>
        </tr>
      </thead>
      <tbody className={TBODY}>
        {tickets.map((t) => (
          <Row key={t.id} ticket={t} to={`${ticketsPath}/${t.id}`} cursor={cursor === t.id} checked={selected.has(t.id)} fresh={fresh.has(t.id)} meId={meId} onToggle={onToggle} />
        ))}
      </tbody>
    </DataTable>
  )
}
