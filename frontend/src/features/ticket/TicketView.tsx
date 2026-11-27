import { CheckCheck, ChevronDown, ChevronRight, ChevronUp, CircleUserRound, CopyIcon, Lock, MessagesSquare, NotebookPen, PanelRight, RefreshCw, RotateCcw, SearchX, ShieldAlert, UserPlus, WifiOff } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ConfirmDialog, type ConfirmOptions } from '@/components/ConfirmDialog'
import { EmptyState, ErrorState, IconButton, Skeleton, SkeletonRows } from '@/components/ds'
import { announce } from '@/components/shell/announce'
import { useRegisterCommands, type Command } from '@/components/shell/commands'
import { useShortcut } from '@/components/shell/shortcuts'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useQueueNeighbors } from '@/features/inbox/queue-order'
import { useConnectionState } from '@/realtime/RealtimeProvider'
import { cn } from '@/lib/utils'

import { Composer, type ComposerMode } from './Composer'
import { CustomerDialog } from './CustomerDialog'
import { SidePanel, type SideTab } from './SidePanel'
import { Thread } from './Thread'
import type { FieldsProps } from './TicketFields'
import { TicketHeader } from './TicketHeader'
import { isOpenStatus, type ThreadFilter } from './ticket-ui'
import { useTicket } from './use-ticket'

/** Wide enough for the full ticket header with its stub, and for the conversation to keep a comfortable measure next to the 400px side panel. */
const WIDE = '(min-width: 1180px)'
/** Same width and side padding as the other agent pages (see AgentLayout). */
const PAGE = 'mx-auto w-full max-w-[1400px] px-4 md:px-8'

function useMedia(query: string) {
  const [on, setOn] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const sync = () => setOn(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [query])
  return on
}

function Banner({ tone, icon: Icon, children, action }: { tone: 'amber' | 'sky' | 'rose'; icon: typeof WifiOff; children: React.ReactNode; action?: React.ReactNode }) {
  const cls = { amber: 'border-butter-line bg-butter text-butter-ink', sky: 'border-sky-line bg-sky text-sky-ink', rose: 'border-rose-line bg-rose text-rose-ink' }[tone]
  return (
    <div role="status" className={cn('flex flex-wrap items-center gap-2 rounded-control border px-3.5 py-2 text-[13px]', cls)}>
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">{children}</span>
      {action}
    </div>
  )
}

/**
 * The agent ticket page. A slim bar above everything moves between tickets (back to the list, previous / next); it is not part of the header.
 * Then: the ticket header (the ticket's card, opened up, with the AI's read folded in as a highlighted line), the conversation with its
 * composer (Messages and Notes tabs; a fixed height that scrolls inside while the page itself scrolls), and, on wide screens, a side
 * panel with the timeline and similar tickets.
 * Under ~1180px the side panel becomes a drawer, opened from the header's "Details" button, that also carries the editable fields. The
 * customer's details open in a dialog from the header.
 */
export function TicketView({ id }: { id: string }) {
  const ticketId = Number(id)
  const t = useTicket(ticketId)
  const { ticket, slug, meId, staff } = t
  const connection = useConnectionState()
  const navigate = useNavigate()
  const nav = useQueueNeighbors(ticketId)
  const wide = useMedia(WIDE)
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  const [mode, setMode] = useState<ComposerMode>('reply')
  const [focusTick, setFocusTick] = useState(0)
  const [filter, setFilter] = useState<ThreadFilter>('messages')
  const [reassigned, setReassigned] = useState<string | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [customer, setCustomer] = useState(false)
  const [sideTab, setSideTab] = useState<SideTab>('timeline')
  const compact = !wide

  const readOnly = !staff
  const open = ticket ? isOpenStatus(ticket.status) : false
  const mine = ticket?.assigned_to?.id === meId
  const busy = t.update.isPending

  const toggleDrawer = useCallback(() => setDrawer((v) => !v), [])

  // Writing a note shows the notes; replying shows the conversation. Picking a tab above moves the composer to match.
  const changeFilter = useCallback((f: ThreadFilter) => {
    setFilter(f)
    setMode(f === 'notes' ? 'note' : 'reply')
  }, [])

  const showCustomer = useCallback(() => {
    setDrawer(false)
    setCustomer(true)
  }, [])

  // Someone else took the ticket while it was open here.
  const prevOwner = useRef<number | null | undefined>(undefined)
  useEffect(() => {
    if (!ticket) return
    const owner = ticket.assigned_to?.id ?? null
    if (prevOwner.current !== undefined && owner !== prevOwner.current && owner !== meId) {
      const msg = owner ? `${ticket.assigned_to!.full_name} took this ticket.` : 'This ticket was unassigned.'
      setReassigned(msg)
      announce(msg)
    }
    prevOwner.current = owner
  }, [ticket, meId])

  const focusPrimary = () => requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-primary-action]')?.focus())

  const take = useCallback(() => {
    if (!meId || !ticket || ticket.assigned_to?.id === meId) return
    const apply = () => t.update.mutate({ assigned_to: meId }, { onSuccess: () => announce('Assigned to you') })
    if (ticket.assigned_to) setConfirm({ title: 'Take over this ticket?', description: `${ticket.assigned_to.full_name} currently owns it.`, confirmLabel: 'Take over', onConfirm: apply })
    else apply()
  }, [meId, ticket, t.update])

  const assign = (target: number | null) => {
    if (!ticket) return
    const apply = () => t.update.mutate({ assigned_to: target }, { onSuccess: () => announce(target ? 'Ticket assigned' : 'Ticket unassigned') })
    if (ticket.assigned_to && ticket.assigned_to.id !== meId && target !== ticket.assigned_to.id) {
      setConfirm({ title: 'Reassign this ticket?', description: `${ticket.assigned_to.full_name} currently owns it.`, confirmLabel: 'Reassign', onConfirm: apply })
    } else apply()
  }

  const resolve = useCallback(() => {
    if (!ticket || !isOpenStatus(ticket.status)) return
    setConfirm({
      title: 'Mark as resolved?',
      description: `${ticket.requester_profile.name.split(' ')[0]} will be asked to confirm that the issue is sorted.`,
      confirmLabel: 'Mark as resolved',
      onConfirm: () => t.update.mutate({ status: 'RESOLVED' }, { onSuccess: () => { announce('Ticket resolved'); focusPrimary() } }),
    })
  }, [ticket, t.update])

  const reopen = useCallback(() => {
    t.update.mutate({ status: 'IN_PROGRESS' }, { onSuccess: () => { announce('Ticket reopened'); focusPrimary() } })
  }, [t.update])

  const openComposer = useCallback((m: ComposerMode) => {
    setDrawer(false)
    setMode(m)
    setFocusTick((n) => n + 1)
  }, [])

  const goTo = useCallback((target?: number) => target && navigate(`/w/${slug}/agent/tickets/${target}`), [navigate, slug])
  const onPrev = nav.prevId ? () => goTo(nav.prevId) : undefined
  const onNext = nav.nextId ? () => goTo(nav.nextId) : undefined
  const showNotes = useCallback(() => {
    changeFilter('notes')
    setDrawer(false)
  }, [changeFilter])

  // Shortcuts (ignored while typing) and the matching palette commands.
  useShortcut('r', () => openComposer('reply'), { description: 'Reply to the customer', group: 'Ticket' })
  useShortcut('n', () => openComposer('note'), { description: 'Add an internal note', group: 'Ticket' })
  useShortcut('e', () => (open ? resolve() : reopen()), { description: 'Resolve or reopen', group: 'Ticket', enabled: !!ticket && !readOnly })
  useShortcut('a', take, { description: 'Assign to me', group: 'Ticket', enabled: !!ticket && !readOnly })
  useShortcut(']', () => onNext?.(), { description: 'Next ticket in the list', group: 'Ticket', enabled: !!onNext })
  useShortcut('[', () => onPrev?.(), { description: 'Previous ticket in the list', group: 'Ticket', enabled: !!onPrev })
  useShortcut('i', toggleDrawer, { description: 'Open ticket details', group: 'Ticket', enabled: !wide })
  useShortcut('c', showCustomer, { description: 'Customer details', group: 'Ticket', enabled: !!ticket })

  const commands = useMemo<Command[]>(
    () => [
      { id: 'ticket.reply', title: 'Reply to customer', group: 'This ticket', icon: MessagesSquare, shortcut: 'r', perform: () => openComposer('reply') },
      { id: 'ticket.note', title: 'Add internal note', group: 'This ticket', icon: NotebookPen, shortcut: 'n', perform: () => openComposer('note') },
      { id: 'ticket.take', title: 'Assign to me', group: 'This ticket', icon: UserPlus, shortcut: 'a', when: !!ticket && !mine && !readOnly, perform: take },
      { id: 'ticket.resolve', title: 'Resolve ticket', group: 'This ticket', icon: CheckCheck, shortcut: 'e', when: open && !readOnly, perform: resolve },
      { id: 'ticket.reopen', title: 'Reopen ticket', group: 'This ticket', icon: RotateCcw, shortcut: 'e', when: !!ticket && !open && !readOnly, perform: reopen },
      { id: 'ticket.regen', title: 'Regenerate AI draft', group: 'This ticket', icon: RefreshCw, keywords: ['ai', 'suggested reply'], when: !!ticket && ticket.status !== 'CLOSED' && !readOnly, perform: () => t.regenerate.mutate() },
      { id: 'ticket.rerun', title: 'Re-run AI triage', group: 'This ticket', icon: RefreshCw, keywords: ['classify', 'category'], when: !!ticket && ticket.ai_status !== 'DISABLED', perform: () => t.rerun.mutate() },
      { id: 'ticket.next', title: 'Next ticket', group: 'This ticket', icon: ChevronDown, shortcut: ']', when: !!onNext, perform: () => onNext?.() },
      { id: 'ticket.prev', title: 'Previous ticket', group: 'This ticket', icon: ChevronUp, shortcut: '[', when: !!onPrev, perform: () => onPrev?.() },
      { id: 'ticket.notes', title: 'Show only team notes', group: 'This ticket', icon: Lock, perform: showNotes },
      { id: 'ticket.panel', title: 'Open ticket details', group: 'This ticket', icon: PanelRight, shortcut: 'i', when: !wide, perform: toggleDrawer },
      { id: 'ticket.customer', title: 'Customer details', group: 'This ticket', icon: CircleUserRound, shortcut: 'c', keywords: ['requester', 'profile', 'account'], when: !!ticket, perform: showCustomer },
      { id: 'ticket.copy', title: 'Copy ticket link', group: 'This ticket', icon: CopyIcon, perform: () => void navigator.clipboard.writeText(window.location.href.split('?')[0]) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ticket?.status, ticket?.assigned_to?.id, ticket?.ai_status, mine, open, readOnly, wide, nav.prevId, nav.nextId, openComposer, take, resolve, reopen, showNotes, toggleDrawer, showCustomer],
  )
  useRegisterCommands(commands)

  if (t.isLoading) {
    return (
      <div className={cn('flex min-h-0 flex-1 flex-col pt-6 pb-6 md:pt-8 md:pb-8', PAGE)} aria-busy="true" aria-label="Loading ticket">
        <Skeleton className="mb-8 h-10 w-44 md:mb-10" />
        <div className="space-y-4 rounded-panel border border-line bg-surface p-6 shadow-panel">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-10 w-full rounded-control" />
          <div className="flex gap-3 border-t border-line pt-5"><Skeleton className="h-9 w-32" /><Skeleton className="h-9 w-32" /><Skeleton className="h-9 w-32 max-sm:hidden" /><Skeleton className="h-9 w-32 max-sm:hidden" /></div>
        </div>
        <div className="mt-4 flex min-h-0 flex-1 gap-4">
          <div className="min-w-0 flex-1 rounded-panel border border-line bg-surface p-5 shadow-panel"><SkeletonRows rows={4} /></div>
          <div className="hidden w-[400px] rounded-panel border border-line bg-surface p-4 shadow-panel min-[1180px]:block"><SkeletonRows rows={5} /></div>
        </div>
      </div>
    )
  }
  if (t.isError && !ticket) {
    return (
      <div className="p-6">
        {t.isNotFound ? (
          <EmptyState icon={SearchX} title="Ticket not found" description="It may have been removed, or it belongs to a workspace you can't open." action={<Button asChild variant="outline"><Link to={nav.backTo}>Back to tickets</Link></Button>} />
        ) : (
          <ErrorState error={t.error} title="We couldn't load this ticket" onRetry={() => t.refetch()} />
        )}
      </div>
    )
  }
  if (!ticket) return null

  const fields: FieldsProps = { categories: t.categories, members: t.members, meId, readOnly, onUpdate: (patch) => t.update.mutate(patch), onAssign: assign }
  const side = (inDrawer: boolean) => (
    <SidePanel
      ticket={ticket}
      t={t}
      tab={sideTab}
      onTab={setSideTab}
      inDrawer={inDrawer}
      fields={fields}
      onCustomer={showCustomer}
    />
  )

  const notices = [
    connection === 'offline' && (
      <Banner key="off" tone="amber" icon={WifiOff} action={<Button variant="outline" size="sm" onClick={() => t.refetch()}>Refresh now</Button>}>
        Live updates are paused. You are seeing the last data we loaded; we keep trying to reconnect.
      </Banner>
    ),
    t.isError && (
      <Banner key="err" tone="rose" icon={ShieldAlert} action={<Button variant="outline" size="sm" onClick={() => t.refetch()}>Try again</Button>}>
        We couldn't refresh this ticket. What you see may be out of date.
      </Banner>
    ),
    reassigned && (
      <Banner key="re" tone="sky" icon={UserPlus} action={<Button variant="ghost" size="sm" onClick={() => setReassigned(null)}>Dismiss</Button>}>
        {reassigned} Replying is still possible, but check with them first.
      </Banner>
    ),
    readOnly && <Banner key="ro" tone="amber" icon={ShieldAlert}>You have read-only access to this workspace. You can read tickets but not change them.</Banner>,
  ].filter(Boolean)

  return (
    // The page scrolls as a whole; the conversation and side panel below get a fixed, comfortable height and scroll inside.
    <div className="scroll-quiet flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className={cn('shrink-0 pt-6 md:pt-8', PAGE)}>
        <div className="mb-8 flex min-h-10 items-center gap-3 md:mb-10">
          <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex min-w-0 items-center gap-2 text-[15px]">
              <li>
                <Link to={nav.backTo} className="rounded-sm font-medium whitespace-nowrap text-ink-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none">
                  {nav.backLabel === 'History' ? 'Ticket history' : 'Tickets'}
                </Link>
              </li>
              <li aria-hidden className="text-ink-3">
                <ChevronRight className="size-4" />
              </li>
              <li className="min-w-0 truncate font-mono font-semibold text-ink" aria-current="page">
                {ticket.reference}
              </li>
            </ol>
          </nav>
          {nav.position && nav.total ? (
            <div className="ml-auto flex shrink-0 items-center rounded-control border border-line bg-surface p-1 shadow-panel" role="group" aria-label="Move between tickets">
              <IconButton label="Previous ticket" shortcut="[" icon={ChevronUp} onClick={onPrev} disabled={!onPrev} className="size-9" />
              <span className="px-3 text-sm whitespace-nowrap text-ink-3 tabular-nums" aria-live="polite">
                <span className="font-semibold text-ink">{nav.position}</span> of {nav.total}
              </span>
              <IconButton label="Next ticket" shortcut="]" icon={ChevronDown} onClick={onNext} disabled={!onNext} className="size-9" />
            </div>
          ) : null}
        </div>
        <TicketHeader
          ticket={ticket}
          fields={fields}
          a={{
            compact,
            onOpenDetails: toggleDrawer,
            onCustomer: showCustomer,
            meId,
            readOnly,
            busy,
            onResolve: resolve,
            onReopen: reopen,
            onRerun: () => t.rerun.mutate(),
            rerunning: t.rerun.isPending,
          }}
        />
        {notices.length > 0 && <div className="mt-3 space-y-2">{notices}</div>}
      </div>

      <div className={cn('flex h-[max(36rem,calc(100svh-6rem))] shrink-0 gap-6 pt-8 pb-6 md:pt-10 md:pb-8', PAGE)}>
        <section aria-label="Conversation" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-panel border border-line bg-thread shadow-panel">
          <Thread ticket={ticket} meName={t.me?.full_name} filter={filter} onFilterChange={changeFilter} />
          <Composer ticket={ticket} t={t} mode={mode} onModeChange={setMode} focusTick={focusTick} readOnly={readOnly} onReopen={reopen} />
        </section>

        {wide && (
          <aside aria-label="Timeline and similar tickets" className="hidden w-[400px] shrink-0 overflow-hidden rounded-panel border border-line bg-surface shadow-panel min-[1180px]:block">
            {side(false)}
          </aside>
        )}
      </div>

      {!wide && (
        <Sheet open={drawer} onOpenChange={setDrawer}>
          <SheetContent side="right" className="gap-0 overflow-y-auto bg-surface p-0 data-[side=right]:w-[min(26rem,100vw)] data-[side=right]:sm:max-w-md">
            <SheetTitle className="sr-only">Ticket details</SheetTitle>
            <SheetDescription className="sr-only">Customer, ticket fields, timeline, similar tickets and notes.</SheetDescription>
            <div className="pt-12 pb-16">{side(true)}</div>
          </SheetContent>
        </Sheet>
      )}
      <CustomerDialog ticket={ticket} open={customer} onOpenChange={setCustomer} />
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
