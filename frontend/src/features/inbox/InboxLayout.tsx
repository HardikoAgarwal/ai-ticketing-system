import { CheckCheck, Columns2, Eraser, Maximize2, Rows3, UserCheck } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useMatch, useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { useRegisterCommands, type Command } from '@/components/shell/commands'
import { useShellBleed } from '@/components/shell/shell-context'
import { useShortcut } from '@/components/shell/shortcuts'
import { TicketPane } from '@/features/ticket/TicketPane'
import { cn } from '@/lib/utils'

import { AppliedChips, InboxToolbar } from './InboxToolbar'
import { InboxList } from './InboxList'
import { inboxSearch } from './model'
import { Overview } from './Overview'
import { LIST_DEFAULT, LIST_MAX, LIST_MIN, ResizeHandle } from './ResizeHandle'
import { useFilterSpecs } from './useFilterSpecs'
import { useInbox } from './useInbox'
import { useInboxActions } from './useInboxActions'

const WIDTH_KEY = 'helpdesk.inbox.listWidth'
const WIDE = '(min-width: 1100px)'

function useWide() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(WIDE)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia(WIDE).matches,
    () => true,
  )
}

function useListWidth() {
  const [width, setWidth] = useState(() => {
    try {
      const n = Number(localStorage.getItem(WIDTH_KEY))
      return n >= LIST_MIN && n <= LIST_MAX ? n : LIST_DEFAULT
    } catch {
      return LIST_DEFAULT
    }
  })
  const set = useCallback((w: number) => {
    setWidth(w)
    try {
      localStorage.setItem(WIDTH_KEY, String(w))
    } catch {
      /* private mode: width just isn't remembered */
    }
  }, [])
  return [width, set] as const
}

/**
 * The inbox workspace: ticket list on the left, the open ticket (or an overview) on the right.
 * It is a layout route for both /agent and /agent/tickets/:id, so selecting a ticket never remounts the list,
 * and filters/scroll/selection survive. Narrow screens stack list -> ticket; the list stays mounted (hidden).
 */
export function InboxLayout() {
  useShellBleed()
  const { slug } = useWorkspace()
  const { user } = useAuth()
  const navigate = useNavigate()
  const wide = useWide()
  const [width, setWidth] = useListWidth()
  const [focus, setFocus] = useState(false)

  const match = useMatch('/w/:slug/agent/tickets/:id')
  const openParam = match?.params.id ?? null
  const openId = openParam && /^\d+$/.test(openParam) ? Number(openParam) : null
  const base = `/w/${slug}/agent`

  const inbox = useInbox()
  const { params, patch, setView, clearAll, view, stats, list, ordered, groups } = inbox
  const specs = useFilterSpecs(view)
  const actions = useInboxActions(ordered, openId)
  const { cursor, setCursor } = actions
  const search = inboxSearch(params)
  const filtered = inbox.activeFilters.length > 0 || !!inbox.search

  // Focus mode only exists while a ticket is open; opening another ticket keeps it, closing the ticket leaves it.
  useEffect(() => {
    if (openId === null) setFocus(false)
    setCursor(null)
  }, [openId, setCursor])

  const listVisible = openId === null || (wide && !focus)
  const detailVisible = openId !== null || wide
  const keysOn = listVisible

  /* ---------- shortcuts (list ones only fire while the list is on screen) ---------- */
  useShortcut('j', () => actions.move(1), { description: 'Next ticket', group: 'Inbox', enabled: keysOn })
  useShortcut('k', () => actions.move(-1), { description: 'Previous ticket', group: 'Inbox', enabled: keysOn })
  useShortcut('enter', () => {
    // A focused link/button handles Enter itself; only act when focus is on the page body.
    if ((document.activeElement as HTMLElement | null)?.closest?.('a,button,[role=radio],[role=tab],[role=separator]')) return
    if (cursor !== null) navigate(`${base}/tickets/${cursor}${search}`)
  }, { description: 'Open the highlighted ticket', group: 'Inbox', enabled: keysOn && cursor !== null })
  useShortcut('x', () => cursor !== null && actions.toggle(cursor), { description: 'Select the highlighted ticket', group: 'Inbox', enabled: keysOn && cursor !== null })

  // E / A act on the selection, else on the highlighted ticket. With nothing highlighted they are left to the open ticket's own shortcuts.
  const targets = useCallback(() => (actions.selected.size ? [...actions.selected] : cursor !== null && cursor !== openId ? [cursor] : []), [actions.selected, cursor, openId])
  useShortcut('e', () => void actions.resolve(targets()), { description: 'Resolve selected / highlighted tickets', group: 'Inbox', enabled: keysOn && targets().length > 0 })
  useShortcut('a', () => void actions.assignToMe(targets()), { description: 'Assign selected / highlighted tickets to me', group: 'Inbox', enabled: keysOn && targets().length > 0 })
  useShortcut('esc', () => (actions.selected.size ? actions.clearSelection() : focus ? setFocus(false) : setCursor(null)), { enabled: actions.selected.size > 0 || focus || cursor !== null })
  useShortcut('f', () => setFocus((f) => !f), { description: 'Toggle focus mode (hide the list)', group: 'Inbox', enabled: openId !== null && wide })

  /* ---------- command palette ---------- */
  const commands = useMemo<Command[]>(
    () => [
      { id: 'inbox.view.attention', title: 'Inbox: needs attention', group: 'Inbox', keywords: ['open', 'queue'], perform: () => setView('attention') },
      { id: 'inbox.view.mine', title: 'Inbox: assigned to me', group: 'Inbox', keywords: ['mine', 'my tickets'], perform: () => setView('mine') },
      { id: 'inbox.view.unassigned', title: 'Inbox: unassigned tickets', group: 'Inbox', perform: () => setView('unassigned') },
      { id: 'inbox.view.all', title: 'Inbox: all tickets', group: 'Inbox', keywords: ['resolved', 'closed', 'history'], perform: () => setView('all') },
      { id: 'inbox.filter.overdue', title: 'Show overdue tickets', group: 'Inbox', keywords: ['sla', 'late'], perform: () => setView('attention', { sla: 'overdue' }) },
      { id: 'inbox.filter.critical', title: 'Show critical tickets', group: 'Inbox', keywords: ['urgent', 'priority'], perform: () => setView('attention', { priority: 'CRITICAL' }) },
      { id: 'inbox.filter.clear', title: 'Clear inbox filters', group: 'Inbox', icon: Eraser, when: filtered, perform: clearAll },
      { id: 'inbox.density', title: inbox.density === 'compact' ? 'Use comfortable rows' : 'Use compact rows', group: 'Inbox', icon: inbox.density === 'compact' ? Rows3 : Columns2, perform: () => patch({ density: inbox.density === 'compact' ? null : 'compact' }) },
      { id: 'inbox.focus', title: focus ? 'Show the ticket list' : 'Focus mode: hide the ticket list', group: 'Inbox', icon: Maximize2, shortcut: 'f', when: openId !== null && wide, perform: () => setFocus((f) => !f) },
      { id: 'inbox.bulk.resolve', title: 'Resolve selected tickets', group: 'Inbox', icon: CheckCheck, shortcut: 'e', when: actions.selected.size > 0, perform: () => void actions.resolve([...actions.selected]) },
      { id: 'inbox.bulk.assign', title: 'Assign selected tickets to me', group: 'Inbox', icon: UserCheck, shortcut: 'a', when: actions.selected.size > 0, perform: () => void actions.assignToMe([...actions.selected]) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setView, clearAll, patch, filtered, inbox.density, focus, openId, wide, actions.selected, actions.resolve, actions.assignToMe],
  )
  useRegisterCommands(commands)

  const onSearch = useCallback((v: string) => patch({ q: v || null }), [patch])
  const onFilter = useCallback((k: string, v: string | null) => patch({ [k]: v }), [patch])
  const onResetFilters = useCallback(() => patch({ status: null, priority: null, category: null, assigned: null, sla: null }), [patch])

  return (
    <div className="flex min-h-0 flex-1 bg-canvas">
      <aside
        aria-label="Tickets"
        style={wide ? { width } : undefined}
        className={cn('flex min-h-0 shrink-0 flex-col bg-surface', wide ? 'border-r border-line' : 'w-full', !listVisible && 'hidden')}
      >
        <div className="space-y-3 px-4 pt-4 pb-3">
          <div className="flex items-baseline justify-between">
            <h1 className="text-lg font-semibold tracking-tight text-ink">Inbox</h1>
          </div>
          <InboxToolbar
            view={view}
            stats={stats.data}
            search={inbox.search}
            params={params}
            specs={specs}
            sort={inbox.sort}
            density={inbox.density}
            onView={(v) => setView(v)}
            onFilter={onFilter}
            onSearch={onSearch}
            onSort={(v) => patch({ sort: v === 'default' ? null : v })}
            onDensity={(d) => patch({ density: d === 'compact' ? 'compact' : null })}
            onResetFilters={onResetFilters}
          />
          <AppliedChips specs={specs} params={params} search={inbox.search} onFilter={onFilter} onClear={clearAll} />
        </div>
        <InboxList
          groups={groups}
          ordered={ordered}
          total={inbox.total}
          loading={list.isLoading}
          fetching={list.isFetching && !list.isFetchingNextPage}
          error={list.isError ? list.error : null}
          hasNext={!!list.hasNextPage}
          fetchingNext={list.isFetchingNextPage}
          onRetry={() => list.refetch()}
          onLoadMore={() => void list.fetchNextPage()}
          baseUrl={base}
          search={search}
          openId={openId}
          cursor={cursor}
          selected={actions.selected}
          fresh={inbox.fresh}
          compact={inbox.density === 'compact'}
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
      </aside>

      {wide && listVisible && <ResizeHandle width={width} onChange={setWidth} />}

      <section aria-label={openId !== null ? 'Ticket' : 'Inbox overview'} className={cn('min-h-0 min-w-0 flex-1', !detailVisible && 'hidden')}>
        {openId !== null ? (
          <TicketPane
            key={openId}
            id={String(openId)}
            focusMode={focus}
            onToggleFocus={() => setFocus((f) => !f)}
            onBack={wide ? undefined : () => navigate(`${base}${search}`)}
          />
        ) : (
          <Overview
            stats={stats.data}
            hasTickets={ordered.length > 0}
            onView={setView}
            onOpenFirst={() => ordered[0] && navigate(`${base}/tickets/${ordered[0].id}${search}`)}
          />
        )}
      </section>
    </div>
  )
}
