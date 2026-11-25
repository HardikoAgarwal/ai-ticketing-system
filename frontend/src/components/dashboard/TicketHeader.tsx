import {
  Building2, CalendarClock, CheckCheck, ChevronRight, CircleCheck, Clock, Gauge, Mail, Package, PanelRight, PanelRightClose,
  Sparkles, Star, Ticket as TicketIcon, UserRound, UserX,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { CategoryBadge, PriorityBadge, SentimentBadge, slaLabel, StatusBadge } from '@/components/badges'
import { RelativeTime } from '@/components/common'
import { StateBadge, ticketStates } from '@/components/dashboard/badges'
import { Surface, SurfaceHeader } from '@/components/dashboard/surface'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDate, formatDateTime, formatValue, initials, labelize } from '@/lib/format'
import type { StaffTicketDetail } from '@/lib/types'
import { cn } from '@/lib/utils'

/** One cell of the key-facts strip: small caps label, a strong value, a quiet sub-line. */
function Fact({ icon: Icon, label, children, sub, className }: { icon: typeof Clock; label: string; children: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0 bg-card px-4 py-4 sm:px-5', className)}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        <Icon className="size-3.5" /> {label}
      </p>
      <div className="mt-2 text-[15px] leading-tight font-semibold">{children}</div>
      {sub && <div className="mt-1 text-[13px] text-muted-foreground">{sub}</div>}
    </div>
  )
}

function ProfileRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{children}</dd>
    </div>
  )
}

/** Breadcrumb + actions, then the ticket card (title, badges, key facts, AI strip) next to its own customer card. */
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
  const pending = ticket.ai_status === 'PENDING'
  const states = ticketStates(ticket)
  const hasCritical = states.some((s) => s.kind === 'critical')
  const sla = ticket.sla_state
  const slaTone = sla === 'overdue' ? 'text-red-700' : sla === 'at_risk' ? 'text-amber-700' : sla === 'breached' ? 'text-orange-700' : 'text-foreground'
  const conf = ticket.ai_confidence !== null ? Math.round(ticket.ai_confidence * 100) : null

  return (
    <header className="mb-5 space-y-4">
      {/* breadcrumb + page actions */}
      <div className="flex flex-wrap items-center gap-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
          <Link to={backTo} className="rounded-md px-1.5 py-1 font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none">
            Queue
          </Link>
          <ChevronRight className="size-4 text-muted-foreground/60" />
          <span className="rounded-md bg-card px-2 py-1 font-mono text-[13px] font-semibold shadow-xs ring-1 ring-slate-200">{ticket.reference}</span>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {canResolve && (
            <Button className="bg-emerald-600 text-white shadow-sm hover:bg-emerald-700" onClick={onResolve} disabled={resolving}>
              <CheckCheck /> Mark as resolved
            </Button>
          )}
          <Button variant="outline" className="bg-card shadow-xs" onClick={onToggleSidebar} aria-pressed={sidebarOpen} aria-label={sidebarOpen ? 'Hide ticket details panel' : 'Show ticket details panel'}>
            {sidebarOpen ? <PanelRightClose /> : <PanelRight />} <span className="hidden sm:inline">Details</span>
          </Button>
        </div>
      </div>

      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* ticket card */}
        <Surface aria-label="Ticket summary" className="flex flex-col">
          <div className="flex-1 px-5 pt-5 pb-6 sm:px-7 sm:pt-6">
            <div className="flex flex-wrap items-center gap-2">
              {states.map((s) => (
                <StateBadge key={s.kind} kind={s.kind} label={s.label} pulse={s.pulse} />
              ))}
              <StatusBadge status={ticket.status} size="card" />
              {!hasCritical && <PriorityBadge priority={ticket.priority} source={ticket.priority_source} size="card" />}
              <CategoryBadge category={ticket.category} source={ticket.category_source} size="card" />
              <SentimentBadge sentiment={ticket.sentiment} size="card" />
            </div>
            <h1 className="mt-4 max-w-4xl text-2xl leading-[1.15] font-semibold tracking-tight text-balance sm:text-[1.9rem]">{ticket.subject}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Opened by <span className="font-medium text-foreground">{rp.name}</span> · <RelativeTime value={ticket.created_at} />
            </p>
          </div>

          {/* key facts */}
          <div className="grid grid-cols-2 gap-px border-y border-slate-200/80 bg-slate-200/70 sm:grid-cols-6">
            <Fact icon={UserRound} label="Owner" className="col-span-2">
              {ticket.assigned_to ? (
                <span className="flex items-center gap-2">
                  <Avatar className="size-7">
                    <AvatarFallback className={cn('text-[11px] font-semibold', mine ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground')}>{initials(ticket.assigned_to.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{mine ? 'You' : ticket.assigned_to.full_name}</span>
                </span>
              ) : (
                <span className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
                    <UserX className="size-4" /> Unassigned
                  </span>
                  <Button variant="outline" size="xs" onClick={onTake} disabled={taking}>
                    Take it
                  </Button>
                </span>
              )}
            </Fact>
            <Fact icon={CalendarClock} label="Created" sub={formatDateTime(ticket.created_at)} className="sm:col-span-2">
              <RelativeTime value={ticket.created_at} />
            </Fact>
            <Fact icon={Clock} label="Last update" sub={formatDateTime(ticket.updated_at)} className="sm:col-span-2">
              <RelativeTime value={ticket.updated_at} />
            </Fact>
            <Fact
              icon={CircleCheck}
              className="sm:col-span-3"
              label="First reply"
              sub={ticket.first_response_at ? formatDateTime(ticket.first_response_at) : ticket.sla_due_at ? `Target ${formatDateTime(ticket.sla_due_at)}` : undefined}
            >
              {ticket.first_response_at ? (
                <span className={sla === 'breached' ? 'text-orange-700' : 'text-emerald-700'}>
                  <RelativeTime value={ticket.first_response_at} />
                </span>
              ) : (
                <span className={slaTone}>{slaLabel(sla, ticket.sla_due_at)}</span>
              )}
            </Fact>
            {ticket.csat_score ? (
              <Fact icon={Star} label="Satisfaction" sub={ticket.csat_comment || 'Customer rating'} className="sm:col-span-3">
                <span className="flex items-center gap-0.5" aria-label={`${ticket.csat_score} out of 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={cn('size-4', n <= ticket.csat_score! ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
                  ))}
                </span>
              </Fact>
            ) : (
              <Fact icon={Gauge} label="AI confidence" className="sm:col-span-3" sub={conf !== null ? 'in the suggested category' : 'No AI triage yet'}>
                {conf !== null ? (
                  <span className="flex items-center gap-2.5">
                    <span className="tabular-nums">{conf}%</span>
                    <span className="h-1.5 w-full max-w-20 overflow-hidden rounded-full bg-violet-100" aria-hidden>
                      <span className="block h-full rounded-full bg-violet-500" style={{ width: `${conf}%` }} />
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </Fact>
            )}
          </div>

          {/* AI triage: slim banner */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-violet-50/70 px-5 py-3.5 text-sm sm:px-7">
            <span className="flex shrink-0 items-center gap-2 text-[13px] font-semibold text-violet-800">
              <span className="flex size-6 items-center justify-center rounded-md bg-violet-600 text-white">
                <Sparkles className="size-3.5" />
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
            <button onClick={onOpenAi} className="shrink-0 rounded-md px-1 text-[13px] font-semibold text-violet-700 underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none">
              Reasoning &amp; overrides
            </button>
          </div>
        </Surface>

        {/* customer card */}
        <Surface aria-label="Customer">
          <SurfaceHeader icon={UserRound} tone="blue" title="Customer" />
          <div className="p-5">
            <div className="flex items-center gap-3.5">
              <Avatar className="size-14 ring-4 ring-slate-100">
                <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-base font-semibold text-slate-700">{initials(rp.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-lg leading-tight font-semibold">{rp.name}</p>
                <a href={`mailto:${rp.email}`} className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <Mail className="size-3.5 shrink-0" /> <span className="truncate">{rp.email}</span>
                </a>
              </div>
            </div>

            <dl className="mt-4 divide-y divide-slate-200/80 rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 sm:grid sm:grid-cols-2 sm:gap-x-10 sm:divide-y-0 xl:block xl:divide-y">
              {rp.company && (
                <ProfileRow label="Company">
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-muted-foreground" /> {rp.company}
                  </span>
                </ProfileRow>
              )}
              {Object.entries(rp.profile).map(([k, v]) => (
                <ProfileRow key={k} label={labelize(k)}>
                  {formatValue(v)}
                </ProfileRow>
              ))}
              <ProfileRow label="Customer since">{rp.joined ? formatDate(rp.joined) : '—'}</ProfileRow>
              <ProfileRow label="Tickets">
                <span className="inline-flex items-center gap-1.5">
                  <TicketIcon className="size-3.5 text-muted-foreground" /> {rp.tickets_count}
                </span>
              </ProfileRow>
            </dl>

            {record && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="mt-4 flex w-full items-center gap-3 rounded-xl border border-primary/25 bg-primary/[0.06] p-3 text-left transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Package className="size-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{record.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {record.kind}
                        {record.status && ` · ${record.status}`}
                      </span>
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 gap-3 p-4">
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
        </Surface>
      </div>
    </header>
  )
}
