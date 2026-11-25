import {
  ArrowLeft, Building2, CalendarClock, CheckCheck, Clock, Gauge, Mail, MessageCircleReply, Sparkles, Tag, TriangleAlert, UserRound, UserX,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { RelativeTime } from '@/components/common'
import { Chip, type ChipTone } from '@/components/dashboard/Chip'
import { Surface } from '@/components/dashboard/surface'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { PRIORITY_META, SENTIMENT_META, STATUS_META } from '@/lib/constants'
import { formatDateTime, initials } from '@/lib/format'
import type { StaffTicketDetail } from '@/lib/types'
import { cn } from '@/lib/utils'
import { slaLabel } from '@/components/badges'

const STATUS_TONE: Record<string, ChipTone> = { OPEN: 'blue', IN_PROGRESS: 'violet', RESOLVED: 'green', CLOSED: 'slate' }
const PRIORITY_TONE: Record<string, ChipTone> = { CRITICAL: 'red', HIGH: 'amber', MEDIUM: 'blue', LOW: 'slate' }
const SENTIMENT_TONE: Record<string, ChipTone> = { NEGATIVE: 'red', NEUTRAL: 'slate', POSITIVE: 'green' }

/** A labelled value in the info strip. */
function Info({ icon: Icon, label, children, className }: { icon: typeof Clock; label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0 px-4 py-3 sm:px-5', className)}>
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </p>
      <div className="mt-1 truncate text-sm font-semibold">{children}</div>
    </div>
  )
}

/** Compact ticket header: back link + actions, subject with highlight chips, then a short customer / owner / dates strip. */
export function TicketHeader({
  ticket,
  backTo,
  meId,
  canResolve,
  onResolve,
  resolving,
  onTake,
  taking,
  onOpenAi,
}: {
  ticket: StaffTicketDetail
  backTo: string
  meId?: number
  canResolve: boolean
  onResolve: () => void
  resolving: boolean
  onTake: () => void
  taking: boolean
  onOpenAi: () => void
}) {
  const rp = ticket.requester_profile
  const mine = ticket.assigned_to?.id === meId
  const pending = ticket.ai_status === 'PENDING'
  const conf = ticket.ai_confidence !== null ? Math.round(ticket.ai_confidence * 100) : null
  const status = STATUS_META[ticket.status]
  const priority = PRIORITY_META[ticket.priority]
  const sentiment = ticket.sentiment ? SENTIMENT_META[ticket.sentiment] : null
  const open = ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED'
  const sla = ticket.sla_state
  const slaText = ticket.first_response_at ? null : slaLabel(sla, ticket.sla_due_at)

  return (
    <header className="mb-4">
      <Surface aria-label="Ticket summary">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
          <Link to={backTo} className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none">
            <ArrowLeft className="size-4" /> Back to queue
          </Link>
          <span className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-xs font-semibold">{ticket.reference}</span>
          <div className="ml-auto flex items-center gap-2">
            {!ticket.assigned_to && (
              <Button variant="outline" onClick={onTake} disabled={taking}>
                <UserRound /> Take it
              </Button>
            )}
            {canResolve && (
              <Button onClick={onResolve} disabled={resolving}>
                <CheckCheck /> Mark as resolved
              </Button>
            )}
          </div>
        </div>

        <div className="px-4 pt-4 pb-4 sm:px-5">
          <h1 className="max-w-4xl text-xl leading-tight font-semibold tracking-tight text-balance sm:text-2xl">{ticket.subject}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {open && ticket.unread_kind === 'requester_reply' && <Chip tone="blue" icon={MessageCircleReply}>New message</Chip>}
            <Chip tone={STATUS_TONE[ticket.status]} icon={status.icon}>{status.label}</Chip>
            <Chip tone={PRIORITY_TONE[ticket.priority]} icon={priority.icon}>{priority.label}</Chip>
            {ticket.category && <Chip tone="slate" icon={Tag}>{ticket.category.name}</Chip>}
            {sentiment && ticket.sentiment && <Chip tone={SENTIMENT_TONE[ticket.sentiment] ?? 'slate'} icon={sentiment.icon}>{sentiment.label}</Chip>}
            {open && slaText && sla !== 'none' && (
              <Chip tone={sla === 'overdue' ? 'red' : sla === 'at_risk' ? 'amber' : 'slate'} icon={sla === 'overdue' ? TriangleAlert : Clock}>{slaText}</Chip>
            )}
            {ticket.ai_status === 'FAILED' && <Chip tone="amber" icon={TriangleAlert}>Needs triage</Chip>}
            <button onClick={onOpenAi} className="rounded-lg focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none" aria-label="Open AI triage">
              <Chip tone="violet" icon={Sparkles} className="cursor-pointer transition-colors hover:bg-violet-100 dark:hover:bg-violet-500/20">
                {pending ? 'AI triaging…' : conf !== null ? `AI triage · ${conf}% confident` : 'AI triage'}
              </Chip>
            </button>
          </div>
          {ticket.ai_summary && !pending && <p className="mt-3 max-w-4xl text-sm leading-relaxed text-muted-foreground">{ticket.ai_summary}</p>}
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-border border-t border-border sm:grid-cols-4 sm:divide-y-0 xl:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
          <div className="col-span-2 flex min-w-0 items-center gap-3 px-4 py-3 sm:col-span-4 sm:px-5 xl:col-span-1">
            <Avatar className="size-10">
              <AvatarFallback className="bg-muted text-sm font-semibold text-foreground">{initials(rp.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{rp.name}</p>
              <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="size-3 shrink-0" /> <span className="truncate">{rp.email}</span>
                {rp.company && (
                  <>
                    <Building2 className="ml-1 size-3 shrink-0" /> <span className="truncate">{rp.company}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <Info icon={UserRound} label="Owner">
            {ticket.assigned_to ? (
              mine ? 'You' : ticket.assigned_to.full_name
            ) : (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <UserX className="size-3.5" /> Unassigned
              </span>
            )}
          </Info>
          <Info icon={CalendarClock} label="Created">
            <span title={formatDateTime(ticket.created_at)}>
              <RelativeTime value={ticket.created_at} />
            </span>
          </Info>
          <Info icon={Gauge} label="Last update">
            <span title={formatDateTime(ticket.updated_at)}>
              <RelativeTime value={ticket.updated_at} />
            </span>
          </Info>
        </div>
      </Surface>
    </header>
  )
}
