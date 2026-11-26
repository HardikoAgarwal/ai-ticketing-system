import { BookMarked, Building2, CheckCheck, Copy, Lightbulb, Link2, Mail, PlayCircle, RefreshCw, RotateCcw, Sparkles, Timer, UserPlus, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'

import { RelativeTime } from '@/components/common'
import { AiSurface, Avatar, Chip, KeyValue, KeyValueList } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { formatDate, formatValue, labelize } from '@/lib/format'
import type { DraftResponse, StaffTicketDetail } from '@/lib/types'
import { cn } from '@/lib/utils'

import { isOpenStatus, nextAction, slaView } from './ticket-ui'

function Card({ title, icon: Icon, children, className }: { title: string; icon: typeof Mail; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-panel border border-line bg-surface', className)}>
      <h3 className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase">
        <Icon className="size-3.5" aria-hidden /> {title}
      </h3>
      <div className="p-4">{children}</div>
    </section>
  )
}

/** Persistent right column (xl and up): who the customer is, what to do next, which sources the AI used, quick actions. */
export function ContextRail({ ticket, draft, meId, readOnly, busy, rerunning, onTake, onResolve, onReopen, onStart, onRerun, onOpenReply }: {
  ticket: StaffTicketDetail
  draft?: DraftResponse
  meId?: number
  readOnly: boolean
  busy: boolean
  rerunning: boolean
  onTake: () => void
  onResolve: () => void
  onReopen: () => void
  onStart: () => void
  onRerun: () => void
  onOpenReply: () => void
}) {
  const rp = ticket.requester_profile
  const draftReady = draft?.status === 'ready' && !!draft.draft
  const next = nextAction(ticket, draftReady, meId)
  const sla = slaView(ticket)
  const open = isOpenStatus(ticket.status)
  const highlights = Object.entries(rp.profile).slice(0, 4)
  const citations = draft?.draft?.citations ?? []
  const mine = ticket.assigned_to?.id === meId

  const copy = (text: string, done: string) => navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error('Could not copy'))

  return (
    <aside aria-label="Customer and next steps" className="scroll-quiet flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      <Card title="Customer" icon={UserRound}>
        <div className="flex items-center gap-3">
          <Avatar name={rp.name} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{rp.name}</p>
            <a href={`mailto:${rp.email}`} className="flex min-w-0 items-center gap-1.5 text-xs text-ink-3 hover:text-ink">
              <Mail className="size-3 shrink-0" aria-hidden /> <span className="truncate">{rp.email}</span>
            </a>
          </div>
        </div>
        {rp.company && <Chip tone="slate" icon={Building2} size="sm" className="mt-3">{rp.company}</Chip>}
        <KeyValueList columns={2} className="mt-4">
          <KeyValue label="Tickets">{rp.tickets_count}</KeyValue>
          <KeyValue label="Customer since">{rp.joined ? formatDate(rp.joined) : '—'}</KeyValue>
          {highlights.map(([k, v]) => <KeyValue key={k} label={labelize(k)}>{formatValue(v)}</KeyValue>)}
        </KeyValueList>
      </Card>

      <AiSurface tone="quiet" aria-label="Suggested next step" className="p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] text-lav-ink uppercase"><Lightbulb className="size-3.5 text-violet" aria-hidden /> Suggested next step</p>
        <p className="mt-1.5 text-sm leading-snug text-ink">{next.text}</p>
        {draftReady && open && <Button variant="outline" size="sm" className="mt-3" onClick={onOpenReply}><Sparkles className="text-violet" /> Review AI draft</Button>}
      </AiSurface>

      <Card title="Timing" icon={Timer}>
        <KeyValueList columns={1}>
          <KeyValue label="First response"><Chip tone={sla.tone} size="sm">{sla.text}</Chip></KeyValue>
          <KeyValue label="Created"><RelativeTime value={ticket.created_at} /></KeyValue>
          <KeyValue label="Last update"><RelativeTime value={ticket.updated_at} /></KeyValue>
        </KeyValueList>
      </Card>

      {citations.length > 0 && (
        <Card title="Sources the AI used" icon={BookMarked}>
          <ul className="space-y-1.5">
            {citations.map((c) => <li key={c.article_id} className="flex items-start gap-2 text-[13px] text-ink-2"><BookMarked className="mt-0.5 size-3.5 shrink-0 text-ink-3" aria-hidden /> <span className="[overflow-wrap:anywhere]">{c.title}</span></li>)}
          </ul>
        </Card>
      )}

      <Card title="Quick actions" icon={CheckCheck}>
        <div className="grid gap-2">
          {!mine && <Button variant="outline" className="justify-start" onClick={onTake} disabled={busy || readOnly}><UserPlus /> {ticket.assigned_to ? 'Take over' : 'Take it'}</Button>}
          {ticket.status === 'OPEN' && <Button variant="outline" className="justify-start" onClick={onStart} disabled={busy || readOnly}><PlayCircle /> Start working</Button>}
          {open ? (
            <Button variant="outline" className="justify-start" onClick={onResolve} disabled={busy || readOnly}><CheckCheck /> Mark as resolved</Button>
          ) : (
            <Button variant="outline" className="justify-start" onClick={onReopen} disabled={busy || readOnly}><RotateCcw /> Reopen</Button>
          )}
          <Button variant="outline" className="justify-start" onClick={onRerun} disabled={rerunning || ticket.ai_status === 'PENDING' || ticket.ai_status === 'DISABLED'}>
            <RefreshCw className={cn(rerunning && 'animate-spin')} /> Re-run AI triage
          </Button>
          <Button variant="ghost" className="justify-start text-ink-2" onClick={() => copy(window.location.href.split('?')[0], 'Link copied')}><Link2 /> Copy ticket link</Button>
          <Button variant="ghost" className="justify-start text-ink-2" onClick={() => copy(ticket.reference, 'Reference copied')}><Copy /> Copy reference</Button>
        </div>
      </Card>
    </aside>
  )
}
