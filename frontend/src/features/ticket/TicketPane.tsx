import { CheckCheck, CopyIcon, MessagesSquare, NotebookPen, RefreshCw, RotateCcw, SearchX, ShieldAlert, UserPlus, WifiOff } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { ConfirmDialog, type ConfirmOptions } from '@/components/ConfirmDialog'
import { EmptyState, ErrorState, Panel, Skeleton, SkeletonRows, TabPanel, Tabs, type TabItem } from '@/components/ds'
import { announce } from '@/components/shell/announce'
import { useRegisterCommands, type Command } from '@/components/shell/commands'
import { useShortcut } from '@/components/shell/shortcuts'
import { Button } from '@/components/ui/button'
import { useConnectionState } from '@/realtime/RealtimeProvider'
import { cn } from '@/lib/utils'

import { AiStrip } from './AiStrip'
import { Composer, type ComposerMode } from './Composer'
import { ContextRail } from './ContextRail'
import { ActivityTab, DetailsTab, NotesTab, SimilarTab } from './TabPanels'
import { TicketHeader } from './TicketHeader'
import { isOpenStatus, TABS, type TicketTab } from './ticket-ui'
import { Thread } from './Thread'
import { useTicket } from './use-ticket'

export interface TicketPaneProps {
  id: string
  focusMode: boolean
  onToggleFocus: () => void
  onBack?: () => void
}

const RAIL_KEY = 'helpdesk.ticket.rail'

/** The whole ticket, as a pane: fills the height it is given, scrolls internally, knows nothing about routes except `?tab=`. */
export function TicketPane(props: TicketPaneProps) {
  // Remount per ticket so drafts, scroll and local state never leak between tickets.
  return <TicketPaneInner key={props.id} {...props} />
}

function Banner({ tone, icon: Icon, children, action }: { tone: 'amber' | 'sky' | 'rose'; icon: typeof WifiOff; children: React.ReactNode; action?: React.ReactNode }) {
  const cls = { amber: 'border-butter-line bg-butter text-butter-ink', sky: 'border-sky-line bg-sky text-sky-ink', rose: 'border-rose-line bg-rose text-rose-ink' }[tone]
  return (
    <div role="status" className={cn('flex flex-wrap items-center gap-2 rounded-panel border px-3.5 py-2 text-[13px]', cls)}>
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">{children}</span>
      {action}
    </div>
  )
}

function TicketPaneInner({ id, focusMode, onToggleFocus, onBack }: TicketPaneProps) {
  const ticketId = Number(id)
  const t = useTicket(ticketId)
  const { ticket, slug, meId, staff } = t
  const connection = useConnectionState()
  const [params, setParams] = useSearchParams()
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  const [mode, setMode] = useState<ComposerMode>('reply')
  const [focusTick, setFocusTick] = useState(0)
  const [reassigned, setReassigned] = useState<string | null>(null)
  const [railOpen, setRailOpen] = useState(() => {
    try {
      return localStorage.getItem(RAIL_KEY) !== '0'
    } catch {
      return true
    }
  })

  const raw = params.get('tab')
  const tab: TicketTab = TABS.includes(raw as TicketTab) ? (raw as TicketTab) : 'conversation'
  const setTab = useCallback(
    (next: TicketTab) =>
      setParams((p) => {
        const q = new URLSearchParams(p)
        if (next === 'conversation') q.delete('tab')
        else q.set('tab', next)
        return q
      }, { replace: true }),
    [setParams],
  )
  const toggleRail = () =>
    setRailOpen((v) => {
      try {
        localStorage.setItem(RAIL_KEY, v ? '0' : '1')
      } catch {
        /* ignore */
      }
      return !v
    })

  const readOnly = !staff
  const open = ticket ? isOpenStatus(ticket.status) : false
  const mine = ticket?.assigned_to?.id === meId
  const busy = t.update.isPending

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
    setTab('conversation')
    setMode(m)
    setFocusTick((n) => n + 1)
  }, [setTab])

  const cycleTab = useCallback((dir: 1 | -1) => setTab(TABS[(TABS.indexOf(tab) + dir + TABS.length) % TABS.length]), [tab, setTab])

  // Shortcuts (ignored while typing) and the matching palette commands.
  useShortcut('r', () => openComposer('reply'), { description: 'Reply to the customer', group: 'Ticket' })
  useShortcut('n', () => openComposer('note'), { description: 'Add an internal note', group: 'Ticket' })
  useShortcut('e', () => (open ? resolve() : reopen()), { description: 'Resolve or reopen', group: 'Ticket', enabled: !!ticket && !readOnly })
  useShortcut('a', take, { description: 'Assign to me', group: 'Ticket', enabled: !!ticket && !readOnly })
  useShortcut(']', () => cycleTab(1), { description: 'Next tab', group: 'Ticket' })
  useShortcut('[', () => cycleTab(-1), { description: 'Previous tab', group: 'Ticket' })

  const commands = useMemo<Command[]>(
    () => [
      { id: 'ticket.reply', title: 'Reply to customer', group: 'This ticket', icon: MessagesSquare, shortcut: 'r', perform: () => openComposer('reply') },
      { id: 'ticket.note', title: 'Add internal note', group: 'This ticket', icon: NotebookPen, shortcut: 'n', perform: () => openComposer('note') },
      { id: 'ticket.take', title: 'Assign to me', group: 'This ticket', icon: UserPlus, shortcut: 'a', when: !!ticket && !mine && !readOnly, perform: take },
      { id: 'ticket.resolve', title: 'Resolve ticket', group: 'This ticket', icon: CheckCheck, shortcut: 'e', when: open && !readOnly, perform: resolve },
      { id: 'ticket.reopen', title: 'Reopen ticket', group: 'This ticket', icon: RotateCcw, shortcut: 'e', when: !!ticket && !open && !readOnly, perform: reopen },
      { id: 'ticket.regen', title: 'Regenerate AI draft', group: 'This ticket', icon: RefreshCw, keywords: ['ai', 'suggested reply'], when: !!ticket && ticket.status !== 'CLOSED' && !readOnly, perform: () => t.regenerate.mutate() },
      { id: 'ticket.rerun', title: 'Re-run AI triage', group: 'This ticket', icon: RefreshCw, keywords: ['classify', 'category'], when: !!ticket && ticket.ai_status !== 'DISABLED', perform: () => t.rerun.mutate() },
      { id: 'ticket.next-tab', title: 'Next tab', group: 'This ticket', shortcut: ']', perform: () => cycleTab(1) },
      { id: 'ticket.prev-tab', title: 'Previous tab', group: 'This ticket', shortcut: '[', perform: () => cycleTab(-1) },
      { id: 'ticket.copy', title: 'Copy ticket link', group: 'This ticket', icon: CopyIcon, perform: () => void navigator.clipboard.writeText(window.location.href.split('?')[0]) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ticket?.status, ticket?.assigned_to?.id, ticket?.ai_status, mine, open, readOnly, openComposer, take, resolve, reopen, cycleTab],
  )
  useRegisterCommands(commands)

  if (t.isLoading) {
    return (
      <div className="flex h-full flex-col gap-3 p-3 md:p-4" aria-busy="true" aria-label="Loading ticket">
        <Panel className="space-y-4 p-5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-3/4" />
          <div className="flex gap-2"><Skeleton className="h-7 w-24" /><Skeleton className="h-7 w-20" /><Skeleton className="h-7 w-28" /></div>
        </Panel>
        <Panel className="flex-1 p-5"><SkeletonRows rows={5} /></Panel>
      </div>
    )
  }
  if (t.isError && !ticket) {
    return (
      <div className="p-4">
        {t.isNotFound ? (
          <EmptyState
            icon={SearchX}
            title="Ticket not found"
            description="It may have been removed, or it belongs to a workspace you can't open."
            action={onBack ? <Button variant="outline" onClick={onBack}>Back to inbox</Button> : undefined}
          />
        ) : (
          <ErrorState error={t.error} title="We couldn't load this ticket" onRetry={() => t.refetch()} />
        )}
      </div>
    )
  }
  if (!ticket) return null

  const notes = ticket.messages.filter((m) => m.is_internal).length
  const items: TabItem<TicketTab>[] = [
    { value: 'conversation', label: 'Conversation', icon: MessagesSquare, count: ticket.messages.filter((m) => !m.is_internal).length },
    { value: 'details', label: 'Details' },
    { value: 'similar', label: 'Similar', count: t.similar.data?.length },
    { value: 'activity', label: 'Activity', count: ticket.activities.length },
    { value: 'notes', label: 'Notes', count: notes },
  ]

  return (
    <div className="@container scroll-quiet flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3 md:p-4">
      {connection === 'offline' && (
        <Banner tone="amber" icon={WifiOff} action={<Button variant="outline" size="sm" onClick={() => t.refetch()}>Refresh now</Button>}>
          Live updates are paused. You are seeing the last data we loaded; we keep trying to reconnect.
        </Banner>
      )}
      {t.isError && ticket && (
        <Banner tone="rose" icon={ShieldAlert} action={<Button variant="outline" size="sm" onClick={() => t.refetch()}>Try again</Button>}>
          We couldn't refresh this ticket. What you see may be out of date.
        </Banner>
      )}
      {reassigned && (
        <Banner tone="sky" icon={UserPlus} action={<Button variant="ghost" size="sm" onClick={() => setReassigned(null)}>Dismiss</Button>}>
          {reassigned} Replying is still possible, but check with them first.
        </Banner>
      )}
      {readOnly && (
        <Banner tone="amber" icon={ShieldAlert}>You have read-only access to this workspace. You can read tickets but not change them.</Banner>
      )}

      <div className={cn('grid min-h-[44rem] flex-1 gap-3', railOpen && '@5xl:grid-cols-[minmax(0,1fr)_340px]')}>
        <Panel className="flex h-full min-h-0 flex-col overflow-hidden">
          <TicketHeader
            ticket={ticket}
            a={{
              onBack,
              focusMode,
              onToggleFocus,
              railOpen,
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
          <AiStrip ticket={ticket} categories={t.categories} onUpdate={(p) => t.update.mutate(p)} onRerun={() => t.rerun.mutate()} rerunning={t.rerun.isPending} readOnly={readOnly} />
          <Tabs<TicketTab> value={tab} onChange={setTab} items={items} idPrefix="ticket" ariaLabel="Ticket sections" className="mt-2 shrink-0" />

          <TabPanel idPrefix="ticket" value="conversation" current={tab} keepMounted className="flex min-h-0 flex-1 flex-col [&[hidden]]:hidden">
            <Thread ticket={ticket} active={tab === 'conversation'} meName={t.me?.full_name} />
            <Composer ticket={ticket} t={t} mode={mode} onModeChange={setMode} focusTick={focusTick} readOnly={readOnly} onReopen={reopen} />
          </TabPanel>
          <TabPanel idPrefix="ticket" value="details" current={tab} className="flex min-h-0 flex-1 flex-col">
            <DetailsTab ticket={ticket} categories={t.categories} members={t.members} meId={meId} saving={busy} readOnly={readOnly} onUpdate={(p) => t.update.mutate(p)} onAssign={assign} />
          </TabPanel>
          <TabPanel idPrefix="ticket" value="similar" current={tab} className="flex min-h-0 flex-1 flex-col">
            <SimilarTab slug={slug} query={t.similar} />
          </TabPanel>
          <TabPanel idPrefix="ticket" value="activity" current={tab} className="flex min-h-0 flex-1 flex-col">
            <ActivityTab ticket={ticket} />
          </TabPanel>
          <TabPanel idPrefix="ticket" value="notes" current={tab} className="flex min-h-0 flex-1 flex-col">
            <NotesTab ticket={ticket} onAdd={() => openComposer('note')} />
          </TabPanel>
        </Panel>

        {railOpen && (
          <div className="hidden min-h-0 @5xl:block">
            <ContextRail
              ticket={ticket}
              draft={t.draft.data}
              meId={meId}
              readOnly={readOnly}
              busy={busy}
              rerunning={t.rerun.isPending}
              onTake={take}
              onResolve={resolve}
              onReopen={reopen}
              onStart={() => t.update.mutate({ status: 'IN_PROGRESS' })}
              onRerun={() => t.rerun.mutate()}
              onOpenReply={() => openComposer('reply')}
            />
          </div>
        )}
      </div>
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
