import { useQuery } from '@tanstack/react-query'
import { Building2, CheckCheck, Copy, Lightbulb, Link2, Mail, PlayCircle, RefreshCw, Sparkles, Ticket as TicketIcon, UserRound, Zap, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { Chip } from '@/components/dashboard/Chip'
import { PRIORITY_TONE, SENTIMENT_TONE } from '@/components/dashboard/TicketHeader'
import { Surface } from '@/components/dashboard/surface'
import { Button } from '@/components/ui/button'
import { PRIORITY_META, SENTIMENT_META } from '@/lib/constants'
import { formatDate, formatValue, initials, labelize } from '@/lib/format'
import type { StaffTicketDetail } from '@/lib/types'
import { cn } from '@/lib/utils'

function Card({ title, icon: Icon, right, children }: { title: string; icon: LucideIcon; right?: ReactNode; children: ReactNode }) {
  return (
    <Surface className="shrink-0">
      <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Icon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {right && <div className="ml-auto">{right}</div>}
      </header>
      <div className="p-4">{children}</div>
    </Surface>
  )
}

/** Short, practical suggestion derived from the ticket state: what to do next. */
function nextAction(ticket: StaffTicketDetail, draftReady: boolean, meId?: number): { text: string; tone: 'red' | 'amber' | 'green' | 'slate' } {
  if (ticket.status === 'RESOLVED') return { text: 'Waiting for the customer to confirm the fix. Reopen if they reply.', tone: 'green' }
  if (ticket.status === 'CLOSED') return { text: 'This ticket is closed. Move it back to In Progress to reply.', tone: 'slate' }
  if (ticket.sla_state === 'overdue' && !ticket.first_response_at) return { text: 'The first-response target has passed. Reply now.', tone: 'red' }
  if (!ticket.assigned_to) return { text: 'Nobody owns this yet. Take it, then review the suggested reply.', tone: 'amber' }
  if (ticket.unread_kind === 'requester_reply') return { text: 'The customer wrote back. Read their message and answer.', tone: 'amber' }
  if (draftReady && ticket.assigned_to.id === meId) return { text: 'An AI draft is ready. Check the facts, then send.', tone: 'green' }
  if (draftReady) return { text: 'An AI draft is ready for whoever picks this up.', tone: 'slate' }
  return { text: 'Reply to the customer or leave an internal note for the team.', tone: 'slate' }
}

const NEXT_TONE = {
  red: 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200',
  amber: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200',
  slate: 'border-border bg-muted/50 text-foreground/80',
} as const

/** Persistent right rail: customer, AI triage summary and quick actions. Scrolls inside the height its parent gives it. */
export function TicketRail({
  ticket,
  meId,
  canResolve,
  onTake,
  onResolve,
  onStart,
  onRerun,
  rerunning,
  busy,
  onOpenConversation,
  onOpenAi,
}: {
  ticket: StaffTicketDetail
  meId?: number
  canResolve: boolean
  onTake: () => void
  onResolve: () => void
  onStart: () => void
  onRerun: () => void
  rerunning: boolean
  busy: boolean
  onOpenConversation: () => void
  onOpenAi: () => void
}) {
  const { slug, api } = useWorkspace()
  const rp = ticket.requester_profile
  const draft = useQuery({ queryKey: ['draft', ticket.id, slug], queryFn: () => api.tickets.draft(ticket.id), enabled: ticket.status !== 'CLOSED', staleTime: 30_000 })
  const draftReady = draft.data?.status === 'ready'
  const conf = ticket.ai_confidence !== null ? Math.round(ticket.ai_confidence * 100) : null
  const aiCategory = ticket.ai_category ?? ticket.category
  const sentiment = ticket.sentiment ? SENTIMENT_META[ticket.sentiment] : null
  const next = nextAction(ticket, draftReady, meId)
  const highlights = Object.entries(rp.profile).slice(0, 3)
  const open = ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED'

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href.split('?')[0])
    toast.success('Link copied')
  }

  return (
    <aside aria-label="Customer and AI summary" className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-0.5 lg:pr-1">
      <Card title="Customer" icon={UserRound}>
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-sm font-semibold">{initials(rp.name)}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{rp.name}</p>
            <a href={`mailto:${rp.email}`} className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
              <Mail className="size-3 shrink-0" /> <span className="truncate">{rp.email}</span>
            </a>
          </div>
        </div>
        {rp.company && (
          <div className="mt-3">
            <Chip tone="slate" icon={Building2}>{rp.company}</Chip>
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><TicketIcon className="size-3" /> Tickets</p>
            <p className="mt-0.5 text-lg leading-none font-semibold tabular-nums">{rp.tickets_count}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">Customer since</p>
            <p className="mt-0.5 text-sm font-semibold">{rp.joined ? formatDate(rp.joined) : '—'}</p>
          </div>
        </div>
        {highlights.length > 0 && (
          <dl className="mt-3 divide-y divide-border text-sm">
            {highlights.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 py-1.5">
                <dt className="text-muted-foreground">{labelize(k)}</dt>
                <dd className="min-w-0 truncate text-right font-medium">{formatValue(v)}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>

      <Card
        title="AI triage"
        icon={Sparkles}
        right={
          <button onClick={onOpenAi} className="rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none">
            Details
          </button>
        }
      >
        {ticket.ai_status === 'PENDING' ? (
          <div className="space-y-2">
            <div className="ai-shimmer h-3 w-1/2 rounded-md" />
            <div className="ai-shimmer h-3 w-full rounded-md" />
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="flex flex-wrap gap-2">
              {aiCategory && <Chip tone="slate">{aiCategory.name}</Chip>}
              {ticket.ai_priority && <Chip tone={PRIORITY_TONE[ticket.ai_priority] ?? 'slate'} icon={PRIORITY_META[ticket.ai_priority].icon}>{PRIORITY_META[ticket.ai_priority].label}</Chip>}
              {sentiment && ticket.sentiment && <Chip tone={SENTIMENT_TONE[ticket.sentiment] ?? 'slate'} icon={sentiment.icon}>{sentiment.label}</Chip>}
            </div>
            {conf !== null && (
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Confidence</span>
                  <span className="font-semibold text-foreground tabular-nums">{conf}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-sm bg-muted" role="progressbar" aria-valuenow={conf} aria-valuemin={0} aria-valuemax={100}>
                  <div className={cn('h-full rounded-sm', conf >= 80 ? 'bg-emerald-500' : conf >= 55 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${conf}%` }} />
                </div>
              </div>
            )}
            {ticket.ai_summary && <p className="text-sm leading-relaxed text-muted-foreground">{ticket.ai_summary}</p>}
            <div className={cn('flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm', NEXT_TONE[next.tone])}>
              <Lightbulb className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="text-xs font-semibold tracking-wide uppercase opacity-70">Suggested next step</p>
                <p className="mt-0.5 leading-snug">{next.text}</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card title="Quick actions" icon={Zap}>
        <div className="grid gap-2">
          {draftReady && open && (
            <Button variant="outline" className="justify-start" onClick={onOpenConversation}>
              <Sparkles /> Review AI draft
            </Button>
          )}
          {!ticket.assigned_to || ticket.assigned_to.id !== meId ? (
            <Button variant="outline" className="justify-start" onClick={onTake} disabled={busy}>
              <UserRound /> {ticket.assigned_to ? 'Take over' : 'Take it'}
            </Button>
          ) : null}
          {ticket.status === 'OPEN' && (
            <Button variant="outline" className="justify-start" onClick={onStart} disabled={busy}>
              <PlayCircle /> Start working
            </Button>
          )}
          {canResolve && (
            <Button variant="outline" className="justify-start" onClick={onResolve} disabled={busy}>
              <CheckCheck /> Mark as resolved
            </Button>
          )}
          <Button variant="outline" className="justify-start" onClick={onRerun} disabled={rerunning || ticket.ai_status === 'PENDING' || ticket.ai_status === 'DISABLED'}>
            <RefreshCw className={cn(rerunning && 'animate-spin')} /> Re-run AI triage
          </Button>
          <Button variant="ghost" className="justify-start text-muted-foreground" onClick={copyLink}>
            <Link2 /> Copy ticket link
          </Button>
          <Button variant="ghost" className="justify-start text-muted-foreground" onClick={() => navigator.clipboard.writeText(ticket.reference).then(() => toast.success('Reference copied'))}>
            <Copy /> Copy reference
          </Button>
        </div>
      </Card>
    </aside>
  )
}
