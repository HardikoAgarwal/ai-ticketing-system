import { format, parseISO } from 'date-fns'
import { AlertTriangle, CalendarPlus, Check, CheckCheck, ChevronRight, Copy, History, Loader2, RefreshCw, RotateCcw, SlidersHorizontal, Sparkles, UserRound, type LucideIcon } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { toast } from 'sonner'

import { RelativeTime } from '@/components/common'
import { AiChip, AiSpark, Avatar, Chip, fill, IconButton, on, Skeleton, SolidChip, type Hue } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PRIORITY_HUE, PRIORITY_LOOK, STATUS_CHIP, STATUS_HUE } from '@/features/inbox/model'
import { Barcode } from '@/features/inbox/TicketCard'
import { SENTIMENT_META } from '@/lib/constants'
import { relativeTime } from '@/lib/format'
import type { StaffTicketDetail } from '@/lib/types'
import { cn } from '@/lib/utils'

import { FACT_LABEL, TicketFields, type FieldsProps } from './TicketFields'
import { aiState, isOpenStatus, SENTIMENT_CHIP, slaBadge } from './ticket-ui'

export interface HeaderActions {
  /** Show the short header: the screen isn't wide enough for the full one. */
  compact: boolean
  /** Narrow screens only: opens the details drawer (fields, timeline, similar tickets, notes). */
  onOpenDetails: () => void
  onCustomer: () => void
  meId?: number
  readOnly: boolean
  busy: boolean
  onResolve: () => void
  onReopen: () => void
  onRerun: () => void
  rerunning: boolean
}

/** "Opened 25 Nov 2026 · 12:57 AM · 3 days ago": the exact moment first, the relative time as a quiet tail. */
function Stamp({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  const d = parseISO(value)
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Icon className="size-3.5 shrink-0 text-ink-3" aria-hidden />
      <span className="text-ink-3">{label}</span>
      <time dateTime={value} className="font-medium text-ink-2 tabular-nums">
        {format(d, 'd MMM yyyy')} <span className="text-ink-3">·</span> {format(d, 'h:mm a')}
      </time>
      <span className="rounded-chip bg-sunken px-1.5 py-px text-[11.5px] font-medium text-ink-3">{relativeTime(value)}</span>
    </span>
  )
}

/**
 * The AI's read, folded into the header as a quoted line beside an aurora rail (no box): an "AI read · 95% sure"
 * label with the customer's mood as a solid chip, then the summary with the reasoning behind a "Why?" tooltip.
 * The AI's category and priority picks are not repeated here — the dropdowns in the facts row carry an
 * "AI suggested" tag instead, and Re-run sits next to Resolve in the header actions. Draft state stays on the composer.
 */
function AiStrip({ ticket }: { ticket: StaffTicketDetail }) {
  const state = aiState(ticket)
  const conf = ticket.ai_confidence !== null ? Math.round(ticket.ai_confidence * 100) : null
  const lowConf = conf !== null && conf < 55
  const read = state === 'done' || (state === 'idle' && !!ticket.ai_summary)
  const working = state === 'working'
  const warn = state === 'failed' || state === 'limited'

  const fallback =
    state === 'failed' ? 'AI triage was unavailable, so keyword rules set the category and priority.'
    : state === 'limited' ? "Today's shared AI budget is used up, so keyword rules set the category and priority."
    : state === 'off' ? 'AI is off for this workspace. Triage uses keyword rules.'
    : 'AI triage has not run on this ticket yet.'

  return (
    <div aria-label="AI triage" role="group" className="relative pl-4">
      <span aria-hidden className="absolute inset-y-0.5 left-0 w-[3px] rounded-full bg-gradient-to-b from-aurora-1 via-aurora-2 to-aurora-3" />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="flex items-center gap-2 text-[13px] font-bold tracking-[0.08em] text-lav-ink uppercase">
          <AiSpark working={working} className="size-4.5" />
          {working ? 'AI is reading this ticket' : warn ? 'AI read unavailable' : 'AI read'}
          {read && conf !== null && <span className="font-semibold tracking-normal normal-case tabular-nums opacity-80">· {conf}% sure</span>}
        </p>
        {read && lowConf && <Chip tone="amber" icon={AlertTriangle}>Double-check</Chip>}
      </div>
      {working ? (
        <div role="status" className="mt-2 space-y-1.5">
          <span className="sr-only">The AI is reading this ticket</span>
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ) : read ? (
        <p className="mt-1.5 text-[14px] leading-5 [overflow-wrap:anywhere] text-ink">
          {ticket.ai_summary || 'Triage is ready.'}
          {ticket.ai_reasoning && (
            <>
              {' '}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="inline align-baseline text-[12px] font-semibold text-lav-ink underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet">
                    Why?
                  </button>
                </TooltipTrigger>
                {/* The base tooltip is a one-line row (inline-flex items-center); this one is a small structured card, so switch it to a column. */}
                <TooltipContent side="bottom" className="max-w-sm flex-col items-stretch gap-0 rounded-xl px-3.5 py-3 text-left text-[13px] leading-relaxed whitespace-normal">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.08em] uppercase">
                    <Sparkles className="size-3.5" aria-hidden /> Why the AI said this
                  </p>
                  <p className="mt-1.5 opacity-90">{ticket.ai_reasoning}</p>
                  <p className="mt-2.5 border-t border-background/20 pt-2 text-[11px] leading-snug opacity-70">
                    The AI only suggests. Category and priority stay yours to change.
                  </p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </p>
      ) : (
        <p role="status" className={cn('mt-1 text-[13.5px] leading-5 [overflow-wrap:anywhere]', warn ? 'text-butter-ink' : 'text-ink-2')}>
          {fallback}
          {warn && ticket.ai_error && <span className="opacity-80"> ({ticket.ai_error})</span>}
        </p>
      )}
    </div>
  )
}

/**
 * The ticket, drawn as the opened version of its card in the list. The first-response state hangs off the top-left edge like the tabs
 * above a card, in a solid colour that matches its urgency. The main part holds the subject, when it was opened and last updated, the
 * AI's read (one aurora-ringed line: summary, confidence, mood), and the facts you can change (status, priority, category, owner).
 * The stub on the right, behind the perforation and tinted by priority, holds the reference and the customer; selecting the customer
 * opens their details. Moving between tickets, and every other action, lives outside this header. On small screens it becomes a short
 * header: subject, one row of badges, and the same AI line.
 */
export function TicketHeader({ ticket, a, fields }: { ticket: StaffTicketDetail; a: HeaderActions; fields: FieldsProps }) {
  const [copied, setCopied] = useState(false)
  const rp = ticket.requester_profile
  const mine = ticket.assigned_to?.id === a.meId
  const open = isOpenStatus(ticket.status)
  const status = STATUS_CHIP[ticket.status]
  const priority = PRIORITY_LOOK[ticket.priority]
  const band: Hue = open ? (PRIORITY_HUE[ticket.priority] ?? 'slate') : STATUS_HUE[ticket.status]
  const stub: CSSProperties = { background: `color-mix(in srgb, ${fill(band)} 24%, var(--surface))`, borderColor: `color-mix(in srgb, ${fill(band)} 65%, transparent)` }
  // Hanging off the top edge, like the tabs above a card in the list: the first-response state, solid-coloured so it reads at a glance.
  const badge = slaBadge(ticket)
  const BadgeIcon = badge.icon
  const ai = aiState(ticket)
  const aiBusy = a.rerunning || ai === 'working'
  // The customer's mood lives with the customer (stub on wide screens, badge row when compact), not as a badge in the middle of the card.
  const mood = ticket.sentiment ? SENTIMENT_META[ticket.sentiment] : null
  const MoodIcon = mood?.icon

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(ticket.reference)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Could not copy. Select the reference and copy it manually.')
    }
  }

  const actions = (
    <div className="ml-auto flex shrink-0 items-center gap-1.5">
      {a.compact && (
        <Button variant="outline" size="sm" onClick={a.onOpenDetails} aria-label="Show ticket details"><SlidersHorizontal /> <span className="max-sm:hidden">Details</span></Button>
      )}
      {ai !== 'off' && (
        <Button variant="outline" size="sm" onClick={a.onRerun} disabled={aiBusy || a.readOnly} aria-label="Re-run AI triage">
          <RefreshCw className={cn(aiBusy && 'animate-spin motion-reduce:animate-none')} /> <span className="max-sm:hidden">Re-run AI</span>
        </Button>
      )}
      {open ? (
        <Button size="sm" onClick={a.onResolve} disabled={a.busy || a.readOnly} data-primary-action>
          <CheckCheck /> Resolve
        </Button>
      ) : (
        <Button size="sm" onClick={a.onReopen} disabled={a.busy || a.readOnly} data-primary-action>
          <RotateCcw /> Reopen
        </Button>
      )}
    </div>
  )

  const hangingTabs = (
    <div className={cn('absolute bottom-full z-0 flex items-end', a.compact ? 'inset-x-5 sm:inset-x-6' : 'inset-x-8')}>
      <div
        className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-t-xl px-3 text-[13px] font-semibold whitespace-nowrap"
        style={{ background: fill(badge.hue), color: on(badge.hue) }}
      >
        <BadgeIcon className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">
          First response <span className="opacity-70">·</span> {badge.text}
          {badge.at && <span className="opacity-80"> · <RelativeTime value={badge.at} /></span>}
        </span>
      </div>
    </div>
  )

  if (a.compact) {
    return (
      <div className="relative mt-11">
        {hangingTabs}
        <header aria-label="Ticket summary" className="relative z-10 rounded-panel border border-line bg-surface px-3 pt-3.5 pb-4 shadow-panel sm:px-5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <button
              type="button"
              onClick={copyRef}
              aria-label={`Copy reference ${ticket.reference}`}
              className="inline-flex h-7 items-center gap-1.5 rounded-chip border border-line bg-sunken px-2 font-mono text-xs font-semibold text-ink-2 transition-colors hover:bg-surface-2 max-sm:hidden"
            >
              {ticket.reference} {copied ? <Check className="size-3 text-mint-ink" aria-hidden /> : <Copy className="size-3 text-ink-3" aria-hidden />}
            </button>
            {actions}
          </div>
          <div className="mt-3 flex flex-col gap-2.5 lg:flex-row lg:items-start lg:gap-4">
            <div className="min-w-0 lg:flex-1">
              <h1 className="text-lg leading-snug font-semibold tracking-tight [overflow-wrap:anywhere] text-ink sm:text-xl" title={ticket.subject}>{ticket.subject}</h1>
              <p className="mt-2 hidden flex-wrap items-center gap-x-4 gap-y-1 text-[13px] sm:flex">
                <Stamp icon={CalendarPlus} label="Opened" value={ticket.created_at} />
                <span aria-hidden className="h-3.5 w-px bg-line-strong" />
                <Stamp icon={History} label="Updated" value={ticket.updated_at} />
              </p>
            </div>
            <div className="scroll-quiet flex items-center gap-2 max-lg:overflow-x-auto max-lg:pb-0.5 [&>*]:shrink-0">
              <SolidChip hue={STATUS_HUE[ticket.status]} icon={status.icon}>{status.label}</SolidChip>
              {priority && <SolidChip hue={PRIORITY_HUE[ticket.priority] ?? 'slate'} icon={priority.icon}>{priority.label}</SolidChip>}
              {mood && ticket.sentiment && <Chip tone={SENTIMENT_CHIP[ticket.sentiment]} icon={mood.icon}>Sounds {mood.label.toLowerCase()}</Chip>}
              <Chip tone="slate" icon={UserRound}>{ticket.assigned_to ? (mine ? 'You own this' : ticket.assigned_to.full_name) : 'Unassigned'}</Chip>
              <button
                type="button"
                onClick={a.onCustomer}
                aria-label={`Customer details for ${rp.name}`}
                className="inline-flex h-7 items-center gap-1.5 rounded-chip border border-line-strong bg-surface pr-1.5 pl-1 text-[13px] font-semibold text-ink transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
              >
                <Avatar name={rp.name} size="xs" /> {rp.name} <ChevronRight className="size-3.5 text-ink-3" aria-hidden />
              </button>
            </div>
          </div>
          <div className="mt-3">
            <AiStrip ticket={ticket} />
          </div>
        </header>
      </div>
    )
  }

  return (
    <div className="relative mt-11">
      {hangingTabs}
      <header aria-label="Ticket summary" className="relative z-10 drop-shadow-[0_1px_2px_rgb(60_40_20/0.10)] drop-shadow-[0_14px_22px_rgb(60_40_20/0.10)]">
        <div className="ticket-notch grid grid-cols-[minmax(0,1fr)_var(--stub-w)] overflow-hidden rounded-panel bg-surface [--stub-w:21rem]">
          <div className="min-w-0 px-8 pt-8 pb-7">
            <div className="flex items-start gap-3">
              <h1 className="min-w-0 flex-1 line-clamp-2 text-[26px] leading-8 font-semibold tracking-tight [overflow-wrap:anywhere] text-ink" title={ticket.subject}>{ticket.subject}</h1>
              {a.busy && <span role="status" className="mt-1.5 inline-flex shrink-0 items-center gap-1.5 text-xs text-ink-3"><Loader2 className="size-3 animate-spin" aria-hidden /> Saving…</span>}
              {actions}
            </div>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
              <Stamp icon={CalendarPlus} label="Opened" value={ticket.created_at} />
              <span aria-hidden className="h-3.5 w-px bg-line-strong" />
              <Stamp icon={History} label="Updated" value={ticket.updated_at} />
            </p>
            <div className="mt-6">
              <AiStrip ticket={ticket} />
            </div>
            <dl className="mt-6 grid grid-cols-4 gap-x-7 border-t border-line pt-6">
              <TicketFields ticket={ticket} {...fields} />
            </dl>
          </div>

          <div className="flex min-w-0 flex-col justify-between gap-4 border-l-2 border-dashed p-6" style={stub}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={FACT_LABEL}>Ticket</p>
                <p className="font-mono text-xl leading-6 font-bold tracking-tight text-ink">{ticket.reference}</p>
                <span className="mt-2 block" style={{ color: fill(band) }}><Barcode code={ticket.reference} /></span>
              </div>
              <IconButton label={copied ? 'Copied' : `Copy reference ${ticket.reference}`} icon={copied ? Check : Copy} onClick={copyRef} className="-mt-1 -mr-1.5 hover:bg-surface/70" />
            </div>
            <button
              type="button"
              onClick={a.onCustomer}
              aria-haspopup="dialog"
              aria-label={`Customer details for ${rp.name}`}
              className="group block w-full min-w-0 rounded-panel border border-line bg-surface text-left shadow-[0_1px_2px_rgb(60_40_20/0.06)] transition-[border-color,box-shadow] hover:border-brand/60 hover:shadow-[0_8px_22px_-12px_rgb(11_122_92/0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <span className="flex items-center gap-3 px-3.5 py-3">
                <Avatar name={rp.name} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] leading-5 font-semibold text-ink">{rp.name}</span>
                  <span className="flex min-w-0 text-[13px] leading-5 text-ink-2">
                    {rp.company && <span className="truncate">{rp.company}</span>}
                    <span className="shrink-0 whitespace-pre">{rp.company ? ' · ' : ''}{rp.tickets_count} {rp.tickets_count === 1 ? 'ticket' : 'tickets'}</span>
                  </span>
                </span>
                <span
                  aria-hidden
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sunken text-ink-2 transition-colors group-hover:bg-brand group-hover:text-white"
                >
                  <ChevronRight className="size-4" />
                </span>
              </span>
              {mood && MoodIcon && ticket.sentiment && (
                <span className="flex items-center gap-2 border-t border-line px-3.5 py-2.5">
                  <span className={FACT_LABEL}>Mood</span>
                  <Chip tone={SENTIMENT_CHIP[ticket.sentiment]} icon={MoodIcon}>{mood.label}</Chip>
                  <AiChip size="sm" className="ml-auto">AI read</AiChip>
                </span>
              )}
            </button>
          </div>
        </div>
      </header>
    </div>
  )
}
