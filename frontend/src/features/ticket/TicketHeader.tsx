import {
  ArrowLeft, Check, CheckCheck, ChevronDown, ChevronUp, Copy, Ellipsis, Link2, MessageCircleReply, PanelRightClose, PanelRightOpen,
  RefreshCw, RotateCcw, SlidersHorizontal, TriangleAlert, UserPlus, UserRound,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Avatar, Chip, IconButton } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { PRIORITY_META, STATUS_META } from '@/lib/constants'
import type { Member, StaffTicketDetail } from '@/lib/types'
import type { QueueNeighbors } from '@/features/inbox/queue-order'

import { isOpenStatus, PRIORITY_TONE, slaView, STATUS_TONE } from './ticket-ui'

export interface HeaderActions {
  nav: QueueNeighbors
  onPrev?: () => void
  onNext?: () => void
  wide: boolean
  railOpen: boolean
  onToggleRail: () => void
  members: Member[]
  meId?: number
  readOnly: boolean
  busy: boolean
  onTake: () => void
  onAssign: (id: number | null) => void
  onResolve: () => void
  onReopen: () => void
  onRerun: () => void
  rerunning: boolean
}

/**
 * The only thing above the conversation. Row 1 is navigation and actions (where am I, what can I do); row 2 is the ticket itself:
 * who, what, and the three states that decide what to do next (status, priority, response clock). Everything else lives in the side panel.
 */
export function TicketHeader({ ticket, a }: { ticket: StaffTicketDetail; a: HeaderActions }) {
  const [copied, setCopied] = useState(false)
  const rp = ticket.requester_profile
  const mine = ticket.assigned_to?.id === a.meId
  const open = isOpenStatus(ticket.status)
  const sla = slaView(ticket)
  const status = STATUS_META[ticket.status]
  const priority = PRIORITY_META[ticket.priority]
  const SlaIcon = sla.answered ? CheckCheck : ticket.sla_state === 'overdue' ? TriangleAlert : undefined

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(ticket.reference)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Could not copy. Select the reference and copy it manually.')
    }
  }
  const copyLink = () => navigator.clipboard.writeText(window.location.href.split('?')[0]).then(() => toast.success('Link copied'), () => toast.error('Could not copy the link'))

  return (
    <header aria-label="Ticket summary" className="shrink-0 border-b border-line bg-surface">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-3 pt-2.5 sm:px-5">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-ink-2">
          <Link to={a.nav.backTo} aria-label={`Back to ${a.nav.backLabel.toLowerCase()}`}><ArrowLeft /> <span className="max-sm:hidden">{a.nav.backLabel}</span></Link>
        </Button>
        {a.nav.position && a.nav.total ? (
          <div className="flex items-center gap-0.5" role="group" aria-label="Move between tickets">
            <IconButton label="Previous ticket" shortcut="[" icon={ChevronUp} onClick={a.onPrev} disabled={!a.onPrev} className="size-8" />
            <span className="px-1 text-xs font-medium text-ink-3 tabular-nums" aria-live="polite">{a.nav.position} of {a.nav.total}</span>
            <IconButton label="Next ticket" shortcut="]" icon={ChevronDown} onClick={a.onNext} disabled={!a.onNext} className="size-8" />
          </div>
        ) : null}
        <button
          type="button"
          onClick={copyRef}
          aria-label={`Copy reference ${ticket.reference}`}
          className="inline-flex h-7 items-center gap-1.5 rounded-chip border border-line bg-sunken max-sm:hidden px-2 font-mono text-xs font-semibold text-ink-2 transition-colors hover:bg-surface-2"
        >
          {ticket.reference} {copied ? <Check className="size-3 text-mint-ink" aria-hidden /> : <Copy className="size-3 text-ink-3" aria-hidden />}
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          {a.wide ? (
            <IconButton label={a.railOpen ? 'Hide details panel' : 'Show details panel'} shortcut="i" icon={a.railOpen ? PanelRightClose : PanelRightOpen} onClick={a.onToggleRail} />
          ) : (
            <Button variant="outline" onClick={a.onToggleRail} aria-label="Show details panel"><SlidersHorizontal /> <span className="max-sm:hidden">Details</span></Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="More ticket actions" className="inline-flex size-9 items-center justify-center rounded-control text-ink-2 hover:bg-sunken hover:text-ink">
                <Ellipsis className="size-[18px]" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="text-xs text-ink-3">Assign to</DropdownMenuLabel>
              {a.members.map((m) => (
                <DropdownMenuItem key={m.id} disabled={a.readOnly || m.id === ticket.assigned_to?.id} onClick={() => a.onAssign(m.id)}>
                  <UserRound /> {m.id === a.meId ? `${m.full_name} (you)` : m.full_name}
                </DropdownMenuItem>
              ))}
              {ticket.assigned_to && (
                <DropdownMenuItem disabled={a.readOnly} onClick={() => a.onAssign(null)}>Unassign</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={a.onRerun} disabled={a.rerunning || ticket.ai_status === 'PENDING' || ticket.ai_status === 'DISABLED'}>
                <RefreshCw /> Re-run AI triage
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyLink}><Link2 /> Copy link</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {!mine && (
            <Button variant="outline" onClick={a.onTake} disabled={a.busy || a.readOnly}>
              <UserPlus /> <span className="hidden sm:inline">{ticket.assigned_to ? 'Take over' : 'Take it'}</span>
              <span className="sm:hidden">Take</span>
            </Button>
          )}
          {open ? (
            <Button onClick={a.onResolve} disabled={a.busy || a.readOnly} data-primary-action>
              <CheckCheck /> Resolve
            </Button>
          ) : (
            <Button onClick={a.onReopen} disabled={a.busy || a.readOnly} data-primary-action>
              <RotateCcw /> Reopen
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3.5 px-3 pt-1.5 pb-3 sm:px-5">
        <Avatar name={rp.name} size="md" className="mt-0.5 hidden sm:flex" />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg leading-snug sm:text-xl font-semibold tracking-tight [overflow-wrap:anywhere] text-ink">{ticket.subject}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:pb-0.5 max-sm:[&>*]:shrink-0">
            <span className="mr-1 text-[13px] text-ink-3 max-sm:hidden"><span className="font-medium text-ink-2">{rp.name}</span>{rp.company ? ` · ${rp.company}` : ''}</span>
            {open && ticket.unread_kind === 'requester_reply' && <Chip tone="blue" icon={MessageCircleReply}>New reply</Chip>}
            <Chip tone={STATUS_TONE[ticket.status]} icon={status.icon}>{status.label}</Chip>
            <Chip tone={PRIORITY_TONE[ticket.priority]} icon={priority.icon}>{priority.label}</Chip>
            {ticket.sla_state !== 'none' && <Chip tone={sla.tone} icon={SlaIcon ?? status.icon}>{sla.text}</Chip>}
            <Chip tone="slate" icon={UserRound}>{ticket.assigned_to ? (mine ? 'You own this' : ticket.assigned_to.full_name) : 'Unassigned'}</Chip>
          </div>
        </div>
      </div>
    </header>
  )
}
