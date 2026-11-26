import {
  ArrowLeft, Check, CheckCheck, Copy, Ellipsis, Link2, MessageCircleReply, PanelRightClose, PanelRightOpen, Maximize2, Minimize2,
  RefreshCw, RotateCcw, Tag, TriangleAlert, UserPlus, UserRound,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { RelativeTime } from '@/components/common'
import { Avatar, Chip, IconButton, ProgressBar } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { PRIORITY_META, SENTIMENT_META, STATUS_META } from '@/lib/constants'
import type { Member, StaffTicketDetail } from '@/lib/types'
import { toast } from 'sonner'

import { isOpenStatus, PRIORITY_TONE, SENTIMENT_TONE, slaView, STATUS_TONE } from './ticket-ui'

function useNow(ms = 60_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

export interface HeaderActions {
  onBack?: () => void
  focusMode: boolean
  onToggleFocus: () => void
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

/** Compact command header: identity, state chips and the primary actions. Facts live in the context rail and Details tab. */
export function TicketHeader({ ticket, a }: { ticket: StaffTicketDetail; a: HeaderActions }) {
  const [copied, setCopied] = useState(false)
  const now = useNow()
  const rp = ticket.requester_profile
  const mine = ticket.assigned_to?.id === a.meId
  const open = isOpenStatus(ticket.status)
  const sla = slaView(ticket)
  const status = STATUS_META[ticket.status]
  const priority = PRIORITY_META[ticket.priority]
  const sentiment = ticket.sentiment ? SENTIMENT_META[ticket.sentiment] : null
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

  // First-response window: only while still waiting for the first reply.
  const start = Date.parse(ticket.created_at)
  const due = ticket.sla_due_at ? Date.parse(ticket.sla_due_at) : null
  const used = sla.waiting && due && due > start ? Math.min(100, Math.max(2, Math.round(((now - start) / (due - start)) * 100))) : null

  return (
    <header aria-label="Ticket summary" className="border-b border-line px-4 pt-3 pb-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        {a.onBack && (
          <Button variant="ghost" size="sm" onClick={a.onBack} className="-ml-2 text-ink-2">
            <ArrowLeft /> Inbox
          </Button>
        )}
        <button
          type="button"
          onClick={copyRef}
          aria-label={`Copy reference ${ticket.reference}`}
          className="inline-flex h-7 items-center gap-1.5 rounded-chip border border-line bg-sunken px-2 font-mono text-xs font-semibold text-ink-2 transition-colors hover:bg-surface-2"
        >
          {ticket.reference} {copied ? <Check className="size-3 text-mint-ink" aria-hidden /> : <Copy className="size-3 text-ink-3" aria-hidden />}
        </button>
        <span className="hidden text-xs text-ink-3 @3xl:inline">
          Opened <RelativeTime value={ticket.created_at} /> by <span className="font-medium text-ink-2">{rp.name}</span>
        </span>

        <div className="ml-auto flex items-center gap-1.5" data-ticket-actions>
          <IconButton label={a.focusMode ? 'Show the ticket list' : 'Focus on this ticket'} icon={a.focusMode ? Minimize2 : Maximize2} onClick={a.onToggleFocus} className="hidden md:inline-flex" />
          <IconButton label={a.railOpen ? 'Hide customer panel' : 'Show customer panel'} icon={a.railOpen ? PanelRightClose : PanelRightOpen} onClick={a.onToggleRail} className="hidden @5xl:inline-flex" />
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
                <DropdownMenuItem disabled={a.readOnly} onClick={() => a.onAssign(null)}>
                  Unassign
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={a.onRerun} disabled={a.rerunning || ticket.ai_status === 'PENDING' || ticket.ai_status === 'DISABLED'}>
                <RefreshCw /> Re-run AI triage
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyLink}>
                <Link2 /> Copy link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {!ticket.assigned_to && (
            <Button variant="outline" onClick={a.onTake} disabled={a.busy || a.readOnly}>
              <UserPlus /> Take it
            </Button>
          )}
          {ticket.assigned_to && !mine && (
            <Button variant="outline" onClick={a.onTake} disabled={a.busy || a.readOnly}>
              <UserPlus /> Take over
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

      <div className="mt-3 flex items-start gap-3.5">
        <Avatar name={rp.name} size="lg" className="mt-0.5 hidden sm:flex" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl leading-snug font-semibold tracking-tight [overflow-wrap:anywhere] text-ink sm:text-[22px]">{ticket.subject}</h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {open && ticket.unread_kind === 'requester_reply' && <Chip tone="blue" icon={MessageCircleReply}>New reply</Chip>}
            <Chip tone={STATUS_TONE[ticket.status]} icon={status.icon}>{status.label}</Chip>
            <Chip tone={PRIORITY_TONE[ticket.priority]} icon={priority.icon}>{priority.label}</Chip>
            {ticket.sla_state !== 'none' && <Chip tone={sla.tone} icon={SlaIcon ?? status.icon}>{sla.text}</Chip>}
            {ticket.category && <Chip tone="slate" icon={Tag} className="hidden @lg:inline-flex">{ticket.category.name}</Chip>}
            {sentiment && ticket.sentiment && <Chip tone={SENTIMENT_TONE[ticket.sentiment]} icon={sentiment.icon} className="hidden @lg:inline-flex">{sentiment.label}</Chip>}
            <Chip tone="slate" icon={UserRound} className="hidden @lg:inline-flex">{ticket.assigned_to ? (mine ? 'Assigned to you' : ticket.assigned_to.full_name) : 'Unassigned'}</Chip>
          </div>
          {used !== null && (
            <div className="mt-3 max-w-md">
              <ProgressBar value={used} tone={ticket.sla_state === 'overdue' ? 'red' : ticket.sla_state === 'at_risk' ? 'amber' : 'green'} size="sm" label="Share of the first-response window used" />
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
