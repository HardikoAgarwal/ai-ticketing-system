import { CheckCheck, ChevronDown, ChevronUp, CopyIcon, Lock, MessagesSquare, NotebookPen, PanelRight, RefreshCw, RotateCcw, SearchX, ShieldAlert, UserPlus, WifiOff } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ConfirmDialog, type ConfirmOptions } from '@/components/ConfirmDialog'
import { EmptyState, ErrorState, Skeleton, SkeletonRows } from '@/components/ds'
import { announce } from '@/components/shell/announce'
import { useRegisterCommands, type Command } from '@/components/shell/commands'
import { useShortcut } from '@/components/shell/shortcuts'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useQueueNeighbors } from '@/features/inbox/queue-order'
import { useConnectionState } from '@/realtime/RealtimeProvider'
import { cn } from '@/lib/utils'

import { Composer, type ComposerMode } from './Composer'
import { Rail } from './Rail'
import { Thread } from './Thread'
import { TicketHeader } from './TicketHeader'
import { isOpenStatus, type ThreadFilter } from './ticket-ui'
import { useTicket } from './use-ticket'

const RAIL_KEY = 'helpdesk.ticket.rail'
/** Wide enough for the conversation to keep a comfortable measure next to a 360px panel. */
const WIDE = '(min-width: 1180px)'

function useWide() {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches)
  useEffect(() => {
    const mq = window.matchMedia(WIDE)
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
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
 * The agent ticket page. One header, then two columns of the same height that fill the screen: the conversation with its composer on the left
 * (it gets the space), and a side panel on the right that scrolls on its own. Under ~1180px the panel becomes a drawer.
 */
export function TicketView({ id }: { id: string }) {
  const ticketId = Number(id)
  const t = useTicket(ticketId)
  const { ticket, slug, meId, staff } = t
  const connection = useConnectionState()
  const navigate = useNavigate()
  const nav = useQueueNeighbors(ticketId)
  const wide = useWide()
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  const [mode, setMode] = useState<ComposerMode>('reply')
  const [focusTick, setFocusTick] = useState(0)
  const [filter, setFilter] = useState<ThreadFilter>('all')
  const [reassigned, setReassigned] = useState<string | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [railOpen, setRailOpen] = useState(() => {
    try {
      return localStorage.getItem(RAIL_KEY) !== '0'
    } catch {
      return true
    }
  })

  const readOnly = !staff
  const open = ticket ? isOpenStatus(ticket.status) : false
  const mine = ticket?.assigned_to?.id === meId
  const busy = t.update.isPending

  const toggleRail = useCallback(() => {
    if (!wide) return setDrawer((v) => !v)
    setRailOpen((v) => {
      try {
        localStorage.setItem(RAIL_KEY, v ? '0' : '1')
      } catch {
        /* ignore */
      }
      return !v
    })
  }, [wide])

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
    setFilter('notes')
    setDrawer(false)
  }, [])

  // Shortcuts (ignored while typing) and the matching palette commands.
  useShortcut('r', () => openComposer('reply'), { description: 'Reply to the customer', group: 'Ticket' })
  useShortcut('n', () => openComposer('note'), { description: 'Add an internal note', group: 'Ticket' })
  useShortcut('e', () => (open ? resolve() : reopen()), { description: 'Resolve or reopen', group: 'Ticket', enabled: !!ticket && !readOnly })
  useShortcut('a', take, { description: 'Assign to me', group: 'Ticket', enabled: !!ticket && !readOnly })
  useShortcut(']', () => onNext?.(), { description: 'Next ticket in the list', group: 'Ticket', enabled: !!onNext })
  useShortcut('[', () => onPrev?.(), { description: 'Previous ticket in the list', group: 'Ticket', enabled: !!onPrev })
  useShortcut('i', toggleRail, { description: 'Show or hide the details panel', group: 'Ticket' })

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
      { id: 'ticket.panel', title: 'Show or hide details panel', group: 'This ticket', icon: PanelRight, shortcut: 'i', perform: toggleRail },
      { id: 'ticket.copy', title: 'Copy ticket link', group: 'This ticket', icon: CopyIcon, perform: () => void navigator.clipboard.writeText(window.location.href.split('?')[0]) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ticket?.status, ticket?.assigned_to?.id, ticket?.ai_status, mine, open, readOnly, nav.prevId, nav.nextId, openComposer, take, resolve, reopen, showNotes, toggleRail],
  )
  useRegisterCommands(commands)

  if (t.isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col" aria-busy="true" aria-label="Loading ticket">
        <div className="space-y-3 border-b border-line bg-surface p-5">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-7 w-2/3" />
          <div className="flex gap-2"><Skeleton className="h-7 w-24" /><Skeleton className="h-7 w-20" /><Skeleton className="h-7 w-28" /></div>
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 bg-surface-2 p-6"><SkeletonRows rows={4} /></div>
          <div className="hidden w-[360px] border-l border-line bg-surface p-4 min-[1180px]:block"><SkeletonRows rows={5} /></div>
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

  const rail = (
    <Rail
      ticket={ticket}
      t={t}
      draft={t.draft.data}
      meId={meId}
      readOnly={readOnly}
      busy={busy}
      onAddNote={() => openComposer('note')}
      onShowNotes={showNotes}
      onAssign={assign}
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
    <div className="flex min-h-0 flex-1 flex-col bg-surface-2">
      <TicketHeader
        ticket={ticket}
        a={{
          nav,
          onPrev,
          onNext,
          wide,
          railOpen: wide ? railOpen : drawer,
          onToggleRail: toggleRail,
          members: t.members,
          meId,
          readOnly,
          busy,
          onTake: take,
          onAssign: assign,
          onResolve: resolve,
          onReopen: reopen,
          onRerun: () => t.rerun.mutate(),
          rerunning: t.rerun.isPending,
        }}
      />
      {notices.length > 0 && <div className="shrink-0 space-y-2 border-b border-line bg-surface px-3 py-2 sm:px-5">{notices}</div>}

      <div className="flex min-h-0 flex-1">
        <section aria-label="Conversation" className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Thread ticket={ticket} meName={t.me?.full_name} filter={filter} onFilterChange={setFilter} />
          <Composer ticket={ticket} t={t} mode={mode} onModeChange={setMode} focusTick={focusTick} readOnly={readOnly} onReopen={reopen} />
        </section>

        {wide && railOpen && (
          <aside aria-label="Ticket details" className="scroll-quiet hidden w-[360px] shrink-0 overflow-y-auto border-l border-line bg-surface pb-16 min-[1180px]:block">
            {rail}
          </aside>
        )}
      </div>

      {!wide && (
        <Sheet open={drawer} onOpenChange={setDrawer}>
          <SheetContent side="right" className="w-[min(26rem,100vw)] gap-0 overflow-y-auto bg-surface p-0 sm:max-w-md">
            <SheetTitle className="sr-only">Ticket details</SheetTitle>
            <SheetDescription className="sr-only">Customer, ticket fields, similar tickets, notes and activity.</SheetDescription>
            <div className="pt-10 pb-16">{rail}</div>
          </SheetContent>
        </Sheet>
      )}
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
