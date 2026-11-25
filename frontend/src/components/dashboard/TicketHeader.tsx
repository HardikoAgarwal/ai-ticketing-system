import {
  ArrowLeft, CalendarClock, Check, CheckCheck, Clock, Copy, Gauge, MessageCircleReply, Reply, Sparkles, Tag, Timer, TriangleAlert, UserRound, UserX,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { RelativeTime } from '@/components/common'
import { Chip, type ChipTone } from '@/components/dashboard/Chip'
import { Surface } from '@/components/dashboard/surface'
import { Button } from '@/components/ui/button'
import { PRIORITY_META, SENTIMENT_META, STATUS_META } from '@/lib/constants'
import { formatDateTime, initials } from '@/lib/format'
import type { StaffTicketDetail } from '@/lib/types'
import { cn } from '@/lib/utils'
import { slaLabel } from '@/components/badges'

export const STATUS_TONE: Record<string, ChipTone> = { OPEN: 'blue', IN_PROGRESS: 'violet', RESOLVED: 'green', CLOSED: 'slate' }
export const PRIORITY_TONE: Record<string, ChipTone> = { CRITICAL: 'red', HIGH: 'amber', MEDIUM: 'blue', LOW: 'slate' }
export const SENTIMENT_TONE: Record<string, ChipTone> = { NEGATIVE: 'red', NEUTRAL: 'slate', POSITIVE: 'green' }

/** One cell of the facts grid: icon tile, small label, bold value. */
function Fact({ icon: Icon, label, children, tone = 'default' }: { icon: typeof Clock; label: string; children: ReactNode; tone?: 'default' | 'red' | 'amber' | 'green' }) {
  const tile = {
    default: 'bg-muted text-muted-foreground',
    red: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  }[tone]
  return (
    <div className="flex min-w-0 items-center gap-3 px-4 py-3.5 sm:px-5 xl:gap-2.5 xl:px-3.5">
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg xl:size-8', tile)}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="mt-0.5 truncate text-sm font-semibold">{children}</div>
      </div>
    </div>
  )
}

/** Header card: back link, reference and actions; avatar tile with subject and chips; SLA bar; six-up facts grid. */
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
  const [now] = useState(() => Date.now())
  const [copied, setCopied] = useState(false)
  const rp = ticket.requester_profile
  const mine = ticket.assigned_to?.id === meId
  const pending = ticket.ai_status === 'PENDING'
  const conf = ticket.ai_confidence !== null ? Math.round(ticket.ai_confidence * 100) : null
  const status = STATUS_META[ticket.status]
  const priority = PRIORITY_META[ticket.priority]
  const sentiment = ticket.sentiment ? SENTIMENT_META[ticket.sentiment] : null
  const open = ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED'
  const sla = ticket.sla_state
  const answered = !!ticket.first_response_at
  const slaText = answered ? null : slaLabel(sla, ticket.sla_due_at)
  const slaTone: 'default' | 'red' | 'amber' | 'green' = answered ? 'green' : sla === 'overdue' ? 'red' : sla === 'at_risk' ? 'amber' : 'default'

  // How much of the response window has been used (only while still waiting for the first reply).
  const start = Date.parse(ticket.created_at)
  const due = ticket.sla_due_at ? Date.parse(ticket.sla_due_at) : null
  const used = !answered && open && due && due > start ? Math.min(100, Math.max(2, Math.round(((now - start) / (due - start)) * 100))) : null

  const copyRef = async () => {
    await navigator.clipboard.writeText(ticket.reference)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <header className="mb-4">
      <Surface aria-label="Ticket summary">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5 sm:px-5">
          <Link to={backTo} className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none">
            <ArrowLeft className="size-4" /> Queue
          </Link>
          <span className="text-border">/</span>
          <button onClick={copyRef} title="Copy reference" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-xs font-semibold transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none">
            {ticket.reference} {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3 text-muted-foreground" />}
          </button>
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

        <div className="flex items-start gap-4 px-4 py-5 sm:px-5">
          <span className="hidden size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-lg font-semibold text-foreground/80 sm:flex" aria-hidden>
            {initials(rp.name)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="max-w-4xl text-xl leading-snug font-semibold tracking-tight text-balance sm:text-[22px]">{ticket.subject}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Opened by <span className="font-medium text-foreground">{rp.name}</span>
              {rp.company && <> · {rp.company}</>} · <RelativeTime value={ticket.created_at} />
            </p>
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              {open && ticket.unread_kind === 'requester_reply' && <Chip tone="blue" icon={MessageCircleReply}>New message</Chip>}
              <Chip tone={STATUS_TONE[ticket.status]} icon={status.icon}>{status.label}</Chip>
              <Chip tone={PRIORITY_TONE[ticket.priority]} icon={priority.icon}>{priority.label}</Chip>
              {ticket.category && <Chip tone="slate" icon={Tag}>{ticket.category.name}</Chip>}
              {sentiment && ticket.sentiment && <Chip tone={SENTIMENT_TONE[ticket.sentiment] ?? 'slate'} icon={sentiment.icon}>{sentiment.label}</Chip>}
              {ticket.ai_status === 'FAILED' && <Chip tone="amber" icon={TriangleAlert}>Needs triage</Chip>}
              <button onClick={onOpenAi} className="rounded-lg focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none" aria-label="Open AI triage">
                <Chip tone="violet" icon={Sparkles} className="cursor-pointer transition-colors hover:bg-violet-100 dark:hover:bg-violet-500/20">
                  {pending ? 'AI triaging…' : conf !== null ? `AI triage · ${conf}%` : 'AI triage'}
                </Chip>
              </button>
            </div>
          </div>
        </div>

        {used !== null && (
          <div className="border-t border-border bg-muted/30 px-4 py-2.5 sm:px-5">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">First-response window</span>
              <span className={cn('font-semibold', sla === 'overdue' ? 'text-red-600 dark:text-red-400' : sla === 'at_risk' ? 'text-amber-600 dark:text-amber-400' : 'text-foreground')}>{slaText}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-sm bg-muted" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={100} aria-label="Share of the first-response window used">
              <div className={cn('h-full rounded-sm', sla === 'overdue' ? 'bg-red-500' : sla === 'at_risk' ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${used}%` }} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 divide-y divide-border border-t border-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3 xl:grid-cols-6 sm:[&>*]:border-b sm:[&>*]:border-border xl:[&>*]:border-r xl:[&>*]:border-b-0 xl:[&>*:last-child]:border-r-0">
          <Fact icon={UserRound} label="Customer">
            <span title={rp.email}>{rp.name}</span>
          </Fact>
          <Fact icon={UserRound} label="Owner">
            {ticket.assigned_to ? (
              mine ? 'You' : ticket.assigned_to.full_name
            ) : (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <UserX className="size-3.5" /> Unassigned
              </span>
            )}
          </Fact>
          <Fact icon={CalendarClock} label="Created">
            <span title={formatDateTime(ticket.created_at)}><RelativeTime value={ticket.created_at} /></span>
          </Fact>
          <Fact icon={Gauge} label="Last update">
            <span title={formatDateTime(ticket.updated_at)}><RelativeTime value={ticket.updated_at} /></span>
          </Fact>
          <Fact icon={Reply} label="First response" tone={answered ? 'green' : 'default'}>
            {answered ? <RelativeTime value={ticket.first_response_at} /> : <span className="text-muted-foreground">Awaiting reply</span>}
          </Fact>
          <Fact icon={Timer} label="Reply due" tone={slaTone}>
            {answered ? 'Met' : ticket.sla_due_at && open ? (slaText ?? '—') : <span className="text-muted-foreground">—</span>}
          </Fact>
        </div>
      </Surface>
    </header>
  )
}
