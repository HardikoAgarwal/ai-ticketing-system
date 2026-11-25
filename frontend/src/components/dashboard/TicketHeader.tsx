import { ArrowLeft, Building2, CheckCheck, Clock3, Mail, Package, PanelRight, PanelRightClose, Sparkles, Star, Ticket as TicketIcon, UserX } from 'lucide-react'
import { Link } from 'react-router-dom'

import { CategoryBadge, PriorityBadge, SentimentBadge, SlaBadge, StatusBadge } from '@/components/badges'
import { RelativeTime } from '@/components/common'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDateTime, formatValue, initials, labelize } from '@/lib/format'
import type { StaffTicketDetail } from '@/lib/types'
import { cn } from '@/lib/utils'

function Fact({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  )
}

/** Everything about the ticket and the person behind it, structured and scannable, above the conversation. */
export function TicketHeader({
  ticket,
  backTo,
  meId,
  canResolve,
  onResolve,
  resolving,
  onTake,
  taking,
  sidebarOpen,
  onToggleSidebar,
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
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onOpenAi: () => void
}) {
  const rp = ticket.requester_profile
  const record = ticket.record_detail
  const mine = ticket.assigned_to?.id === meId
  const profile = Object.entries(rp.profile).slice(0, 3)
  const pending = ticket.ai_status === 'PENDING'

  return (
    <header className="mb-5 overflow-hidden rounded-2xl border bg-card shadow-xs">
      <div className="p-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-center gap-3">
          <Link to={backTo} className="inline-flex items-center gap-1.5 rounded-md py-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none">
            <ArrowLeft className="size-4" /> Back to queue
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {canResolve && (
              <Button size="sm" variant="outline" className="border-emerald-300 bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100" onClick={onResolve} disabled={resolving}>
                <CheckCheck /> Mark as resolved
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onToggleSidebar} aria-pressed={sidebarOpen} aria-label={sidebarOpen ? 'Hide ticket details panel' : 'Show ticket details panel'}>
              {sidebarOpen ? <PanelRightClose /> : <PanelRight />} <span className="hidden sm:inline">Details</span>
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-muted-foreground">{ticket.reference}</span>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} source={ticket.priority_source} />
          <CategoryBadge category={ticket.category} source={ticket.category_source} />
          <SentimentBadge sentiment={ticket.sentiment} size="md" />
          <SlaBadge state={ticket.sla_state} dueAt={ticket.sla_due_at} size="md" />
          {ticket.csat_score && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[13px] font-medium text-amber-800 ring-1 ring-amber-600/20 ring-inset">
              <Star className="size-3.5 fill-amber-400 text-amber-400" /> CSAT {ticket.csat_score}/5
            </span>
          )}
        </div>
        <h1 className="mt-2 max-w-5xl text-xl leading-tight font-semibold tracking-tight text-balance sm:text-2xl">{ticket.subject}</h1>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-px border-t bg-border lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section aria-label="Customer" className="min-w-0 bg-card p-4 sm:px-6 sm:py-4">
          <div className="flex items-start gap-3.5">
            <Avatar className="size-12">
              <AvatarFallback className="bg-muted text-sm font-semibold">{initials(rp.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <p className="text-base font-semibold">{rp.name}</p>
                {rp.company && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground/80">
                    <Building2 className="size-3" /> {rp.company}
                  </span>
                )}
              </div>
              <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="size-3.5 shrink-0" /> <span className="truncate">{rp.email}</span>
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {profile.map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs">
                    <span className="text-muted-foreground">{labelize(k)}</span>
                    <span className="font-medium">{formatValue(v)}</span>
                  </span>
                ))}
                <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs">
                  <TicketIcon className="size-3 text-muted-foreground" /> <span className="font-medium">{rp.tickets_count}</span> <span className="text-muted-foreground">tickets</span>
                </span>
                {record && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/[0.06] px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none">
                        <Package className="size-3" /> {record.kind}: {record.title}
                        {record.status && <span className="rounded bg-primary/10 px-1.5 py-px text-[10px]">{record.status}</span>}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-80 gap-3 p-4">
                      <div>
                        <p className="text-sm font-semibold">{record.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {record.kind}
                          {record.reference && ` · ${record.reference}`}
                          {record.status && ` · ${record.status}`}
                        </p>
                      </div>
                      <dl className="space-y-2 text-sm">
                        {Object.entries(record.data).map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-4">
                            <dt className="text-muted-foreground">{labelize(k)}</dt>
                            <dd className="text-right font-medium">{formatValue(v)}</dd>
                          </div>
                        ))}
                      </dl>
                      <p className="text-[11px] text-muted-foreground">These exact facts are what the AI is allowed to quote in drafts.</p>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Ticket details" className="grid min-w-0 grid-cols-[repeat(2,minmax(0,1fr))] content-start gap-x-4 gap-y-3.5 bg-card p-4 sm:grid-cols-[repeat(4,minmax(0,1fr))] sm:p-5 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
          <Fact label="Owner">
            {ticket.assigned_to ? (
              <div className="flex items-center gap-2">
                <Avatar className="size-6">
                  <AvatarFallback className={cn('text-[10px] font-semibold', mine ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground')}>{initials(ticket.assigned_to.full_name)}</AvatarFallback>
                </Avatar>
                <span className="truncate font-medium">{mine ? 'You' : ticket.assigned_to.full_name.split(' ')[0]}</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <UserX className="size-3.5" /> Unassigned
                </span>
                <Button variant="outline" size="xs" onClick={onTake} disabled={taking}>
                  Take
                </Button>
              </div>
            )}
          </Fact>
          <Fact label="Created">
            <p className="font-medium">
              <RelativeTime value={ticket.created_at} />
            </p>
            <p className="text-xs text-muted-foreground">{formatDateTime(ticket.created_at)}</p>
          </Fact>
          <Fact label="Last update">
            <p className="font-medium">
              <RelativeTime value={ticket.updated_at} />
            </p>
            <p className="text-xs text-muted-foreground">{formatDateTime(ticket.updated_at)}</p>
          </Fact>
          <Fact label="First reply">
            {ticket.first_response_at ? (
              <>
                <p className="flex items-center gap-1 font-medium">
                  <Clock3 className="size-3.5 text-emerald-600" /> <RelativeTime value={ticket.first_response_at} />
                </p>
                <p className="text-xs text-muted-foreground">{formatDateTime(ticket.first_response_at)}</p>
              </>
            ) : (
              <SlaBadge state={ticket.sla_state} dueAt={ticket.sla_due_at} />
            )}
          </Fact>
        </section>
      </div>

      <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-4 py-3 text-sm sm:px-6', pending ? 'bg-violet-50/50' : 'bg-violet-50/40')}>
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-violet-700">
          <span className="flex size-5 items-center justify-center rounded-md bg-violet-600 text-white">
            <Sparkles className="size-3" />
          </span>
          AI triage
        </span>
        {pending ? (
          <div className="ai-shimmer h-3 w-72 max-w-full rounded-full" />
        ) : ticket.ai_summary ? (
          <p className="min-w-0 basis-full text-foreground/90 sm:flex-1 sm:basis-0">{ticket.ai_summary}</p>
        ) : (
          <p className="min-w-0 basis-full text-muted-foreground sm:flex-1 sm:basis-0">No AI summary for this ticket.</p>
        )}
        {ticket.ai_confidence !== null && !pending && (
          <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            Confidence
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-violet-100" aria-hidden>
              <span className="block h-full rounded-full bg-violet-500" style={{ width: `${ticket.ai_confidence * 100}%` }} />
            </span>
            <span className="font-semibold text-foreground tabular-nums">{Math.round(ticket.ai_confidence * 100)}%</span>
          </span>
        )}
        <button onClick={onOpenAi} className="shrink-0 text-xs font-medium text-violet-700 underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none">
          Reasoning &amp; overrides
        </button>
      </div>
    </header>
  )
}

