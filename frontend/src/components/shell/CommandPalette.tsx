import { useQuery } from '@tanstack/react-query'
import { CornerDownLeft, Search, Ticket } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useWorkspace } from '@/auth/workspace'
import { Kbd } from '@/components/ds/Kbd'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

import { setPaletteOpen, useCommands, usePaletteOpen, type Command } from './commands'
import { useShortcut } from './shortcuts'

function score(c: Command, q: string): number {
  if (!q) return 1
  const hay = `${c.title} ${c.group ?? ''} ${(c.keywords ?? []).join(' ')}`.toLowerCase()
  const title = c.title.toLowerCase()
  let total = 0
  for (const token of q.toLowerCase().split(/\s+/).filter(Boolean)) {
    const at = hay.indexOf(token)
    if (at < 0) return 0
    total += title.startsWith(token) ? 4 : title.includes(token) ? 3 : 1
  }
  return total
}

type Row = { kind: 'header'; label: string } | { kind: 'item'; id: string; title: string; hint?: string; icon?: Command['icon']; shortcut?: string; run: () => void }

/**
 * Cmd/Ctrl-K palette: jump to a ticket (by reference or subject), go to a page, run commands registered with
 * useRegisterCommands. Combobox pattern: focus stays in the input, arrows move the active option, Enter runs it.
 * Mount once in a shell (AgentLayout does).
 */
export function CommandPalette() {
  const open = usePaletteOpen()
  const commands = useCommands()
  const { slug, api, staff } = useWorkspace()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useShortcut('mod+k', () => setPaletteOpen(!open), { description: 'Open command palette', group: 'General', allowInInput: true })
  useShortcut('/', () => setPaletteOpen(true), { description: 'Search', group: 'General' })

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200)
    return () => clearTimeout(t)
  }, [query])

  const tickets = useQuery({
    queryKey: ['palette-tickets', slug, debounced],
    queryFn: () => api.tickets.listStaff({ q: debounced, page_size: 6 }),
    enabled: open && staff && debounced.length >= 2,
    staleTime: 10_000,
  })

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []
    const found = tickets.data?.results ?? []
    if (found.length) {
      out.push({ kind: 'header', label: 'Tickets' })
      for (const t of found) {
        out.push({ kind: 'item', id: `t-${t.id}`, title: t.subject, hint: t.reference, icon: Ticket, run: () => navigate(`/w/${slug}/agent/tickets/${t.id}`) })
      }
    }
    const matched = commands.map((c) => ({ c, s: score(c, query) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s)
    const byGroup = new Map<string, Command[]>()
    for (const { c } of matched) {
      const g = c.group ?? 'Commands'
      byGroup.set(g, [...(byGroup.get(g) ?? []), c])
    }
    for (const [g, list] of byGroup) {
      out.push({ kind: 'header', label: g })
      for (const c of list) out.push({ kind: 'item', id: `c-${c.id}`, title: c.title, icon: c.icon, shortcut: c.shortcut, run: c.perform })
    }
    return out
  }, [tickets.data, commands, query, navigate, slug])

  const items = rows.filter((r): r is Extract<Row, { kind: 'item' }> => r.kind === 'item')
  const activeId = items[Math.min(active, items.length - 1)]?.id

  useEffect(() => {
    if (!activeId) return
    listRef.current?.querySelector(`[data-id="${activeId}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [activeId])

  const close = () => {
    setPaletteOpen(false)
    setQuery('')
    setActive(0)
  }
  const run = (item?: (typeof items)[number]) => {
    if (!item) return
    close()
    setTimeout(item.run, 0)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setPaletteOpen(v)
        if (!v) {
          setQuery('')
          setActive(0)
        }
      }}
    >
      <DialogContent showCloseButton={false} className="top-[14%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-[620px]">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">Search tickets and run commands. Use the arrow keys to choose and Enter to run.</DialogDescription>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-[18px] shrink-0 text-ink-3" aria-hidden />
          <input
            autoFocus
            role="combobox"
            aria-expanded
            aria-controls="palette-list"
            aria-activedescendant={activeId ? `palette-${activeId}` : undefined}
            aria-label="Search tickets and commands"
            placeholder={staff ? 'Search tickets or type a command…' : 'Type a command…'}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => Math.min(a + 1, items.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(a - 1, 0))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                run(items[Math.min(active, items.length - 1)])
              }
            }}
            className="h-14 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div ref={listRef} id="palette-list" role="listbox" aria-label="Results" className="scroll-quiet max-h-[min(420px,56vh)] overflow-y-auto p-2">
          {items.length === 0 && (
            <p className="px-3 py-10 text-center text-sm text-ink-3">{tickets.isFetching || (staff && query.trim().length >= 2 && query.trim() !== debounced) ? 'Searching…' : `Nothing matches "${query}".`}</p>
          )}
          {rows.map((r, i) =>
            r.kind === 'header' ? (
              <div key={`h-${i}`} role="presentation" className="px-3 pt-3 pb-1.5 text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase first:pt-1">
                {r.label}
              </div>
            ) : (
              <div
                key={r.id}
                id={`palette-${r.id}`}
                data-id={r.id}
                role="option"
                aria-selected={r.id === activeId}
                onMouseMove={() => setActive(items.findIndex((x) => x.id === r.id))}
                onClick={() => run(r)}
                className={cn('flex cursor-pointer items-center gap-3 rounded-control px-3 py-2.5 text-sm', r.id === activeId ? 'bg-violet-soft text-ink' : 'text-ink-2')}
              >
                {r.icon && <r.icon className={cn('size-4 shrink-0', r.id === activeId ? 'text-violet' : 'text-ink-3')} aria-hidden />}
                <span className="min-w-0 flex-1 truncate font-medium">{r.title}</span>
                {r.hint && <span className="shrink-0 font-mono text-xs text-ink-3">{r.hint}</span>}
                {r.shortcut && <Kbd keys={r.shortcut} />}
                {r.id === activeId && !r.shortcut && <CornerDownLeft className="size-3.5 shrink-0 text-ink-3" aria-hidden />}
              </div>
            ),
          )}
        </div>
        <div className="flex items-center gap-4 border-t border-line bg-surface-2 px-4 py-2.5 text-xs text-ink-3">
          <span className="inline-flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
          <span className="inline-flex items-center gap-1.5"><Kbd>↵</Kbd> run</span>
          <span className="ml-auto hidden sm:inline">Press <Kbd>?</Kbd> for all shortcuts</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
