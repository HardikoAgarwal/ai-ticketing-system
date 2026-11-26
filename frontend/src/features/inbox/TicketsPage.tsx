import { CheckCheck, Eraser, Inbox, UserCheck } from 'lucide-react'
import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { useRegisterCommands, type Command } from '@/components/shell/commands'
import { useShellBleed } from '@/components/shell/shell-context'
import { useShortcut } from '@/components/shell/shortcuts'
import { PageHeader } from '@/features/shared/PageHeader'

import { AppliedChips, InboxToolbar } from './InboxToolbar'
import { InboxList } from './InboxList'
import { QueueStrip } from './QueueStrip'
import { inboxSearch } from './model'
import { rememberQueue } from './queue-order'
import { useFilterSpecs } from './useFilterSpecs'
import { useInbox } from './useInbox'
import { useInboxActions } from './useInboxActions'

/**
 * /agent/tickets: every ticket, full width. Views, filters, search, sort and grouping live in the URL.
 * The visible order is remembered so the ticket page can offer Back / Previous / Next.
 */
export function TicketsPage() {
  useShellBleed()
  const { slug } = useWorkspace()
  const { user } = useAuth()
  const navigate = useNavigate()
  const ticketsPath = `/w/${slug}/agent/tickets`

  const inbox = useInbox()
  const { params, patch, setView, clearAll, view, stats, list, ordered } = inbox
  const specs = useFilterSpecs()
  const actions = useInboxActions(ordered)
  const { cursor, setCursor } = actions
  const filtered = inbox.activeFilters.length > 0 || !!inbox.search
  const listSearch = inboxSearch(params)

  // Remember what is on screen, for Back / Previous / Next on the ticket page.
  useEffect(() => {
    rememberQueue(ordered.map((t) => t.id), listSearch)
  }, [ordered, listSearch])

  /* ---------- shortcuts (this page only exists on the list route, so they are active exactly while it is shown) ---------- */
  useShortcut('j', () => actions.move(1), { description: 'Next ticket in the list', group: 'Tickets list' })
  useShortcut('k', () => actions.move(-1), { description: 'Previous ticket in the list', group: 'Tickets list' })
  useShortcut('enter', () => {
    // A focused link/button handles Enter itself; only act when focus is on the page body.
    if ((document.activeElement as HTMLElement | null)?.closest?.('a,button,[role=radio],[role=tab],[role=checkbox]')) return
    if (cursor !== null) navigate(`${ticketsPath}/${cursor}`)
  }, { description: 'Open the highlighted ticket', group: 'Tickets list', enabled: cursor !== null })
  useShortcut('x', () => cursor !== null && actions.toggle(cursor), { description: 'Select the highlighted ticket', group: 'Tickets list', enabled: cursor !== null })

  // E / A act on the selection, else on the highlighted ticket.
  const targets = useCallback(() => (actions.selected.size ? [...actions.selected] : cursor !== null ? [cursor] : []), [actions.selected, cursor])
  const hasTargets = actions.selected.size > 0 || cursor !== null
  useShortcut('e', () => void actions.resolve(targets()), { description: 'Resolve selected / highlighted tickets', group: 'Tickets list', enabled: hasTargets })
  useShortcut('a', () => void actions.assignToMe(targets()), { description: 'Assign selected / highlighted tickets to me', group: 'Tickets list', enabled: hasTargets })
  useShortcut('esc', () => (actions.selected.size ? actions.clearSelection() : setCursor(null)), { enabled: actions.selected.size > 0 || cursor !== null })

  /* ---------- command palette ---------- */
  const commands = useMemo<Command[]>(
    () => [
      { id: 'tickets.view.attention', title: 'Tickets: needs attention', group: 'Tickets', keywords: ['open', 'queue'], perform: () => setView('attention') },
      { id: 'tickets.view.mine', title: 'Tickets: assigned to me', group: 'Tickets', keywords: ['mine', 'my tickets'], perform: () => setView('mine') },
      { id: 'tickets.view.unassigned', title: 'Tickets: unassigned', group: 'Tickets', perform: () => setView('unassigned') },
      { id: 'tickets.view.all', title: 'Tickets: all, including resolved', group: 'Tickets', keywords: ['resolved', 'closed', 'history'], perform: () => setView('all') },
      { id: 'tickets.filter.overdue', title: 'Show overdue tickets', group: 'Tickets', keywords: ['sla', 'late'], perform: () => setView('attention', { sla: 'overdue' }) },
      { id: 'tickets.filter.critical', title: 'Show critical tickets', group: 'Tickets', keywords: ['urgent', 'priority'], perform: () => setView('attention', { priority: 'CRITICAL' }) },
      { id: 'tickets.filter.clear', title: 'Clear ticket filters', group: 'Tickets', icon: Eraser, when: filtered, perform: clearAll },
            { id: 'tickets.bulk.resolve', title: 'Resolve selected tickets', group: 'Tickets', icon: CheckCheck, shortcut: 'e', when: actions.selected.size > 0, perform: () => void actions.resolve([...actions.selected]) },
      { id: 'tickets.bulk.assign', title: 'Assign selected tickets to me', group: 'Tickets', icon: UserCheck, shortcut: 'a', when: actions.selected.size > 0, perform: () => void actions.assignToMe([...actions.selected]) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setView, clearAll, filtered, actions.selected, actions.resolve, actions.assignToMe],
  )
  useRegisterCommands(commands)

  const onSearch = useCallback((v: string) => patch({ q: v || null }), [patch])
  const onFilter = useCallback((k: string, v: string | null) => patch({ [k]: v }), [patch])
  const onResetFilters = useCallback(() => patch({ status: null, priority: null, category: null, assigned: null, sla: null }), [patch])

  const open = stats.data ? stats.data.open + stats.data.in_progress : undefined

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col px-2 md:px-6">
        <InboxList
          top={
            <>
        <PageHeader
          icon={Inbox}
          title="Tickets"
          description={
            list.isLoading ? 'Loading tickets…' : (
              <>
                <span className="font-semibold text-ink tabular-nums">{inbox.total}</span> {inbox.total === 1 ? 'ticket' : 'tickets'}
                {filtered ? ' match your filters' : ''}
                {!filtered && open !== undefined && view !== 'all' ? <> · {stats.data?.overdue ? <span className="tabular-nums">{stats.data.overdue} overdue</span> : 'none overdue'}</> : null}
              </>
            )
          }
        />
        <QueueStrip stats={stats.data} view={view} params={params} onPick={setView} />
        <InboxToolbar
          layout={inbox.layout}
          onLayout={(l) => patch({ layout: l === 'table' ? 'table' : null })}
          search={inbox.search}
          params={params}
          specs={specs}
          sort={inbox.sort}
          onFilter={onFilter}
          onSearch={onSearch}
          onSort={(v) => patch({ sort: v === 'default' ? null : v })}
          onResetFilters={onResetFilters}
        />
        <AppliedChips specs={specs} params={params} search={inbox.search} onFilter={onFilter} onClear={clearAll} />
            </>
          }
          ordered={ordered}
          total={inbox.total}
          loading={list.isLoading}
          fetching={list.isFetching && !list.isFetchingNextPage}
          error={list.isError ? list.error : null}
          hasNext={!!list.hasNextPage}
          fetchingNext={list.isFetchingNextPage}
          onRetry={() => list.refetch()}
          onLoadMore={() => void list.fetchNextPage()}
          ticketsPath={ticketsPath}
          cursor={cursor}
          selected={actions.selected}
          fresh={inbox.fresh}
          layout={inbox.layout}
          meId={user?.id}
          filtered={filtered}
          view={view}
          onToggle={actions.toggle}
          onSelectAll={actions.selectAll}
          onClearFilters={clearAll}
          busy={actions.busy}
          onBulkResolve={() => void actions.resolve([...actions.selected])}
          onBulkAssign={() => void actions.assignToMe([...actions.selected])}
          onClearSelection={actions.clearSelection}
        />
      </div>
    </div>
  )
}
