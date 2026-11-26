import { useEffect, useState } from 'react'

import { Kbd } from '@/components/ds/Kbd'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

import { SHORTCUTS_EVENT, useShortcut, useShortcutList } from './shortcuts'

/** "?" sheet listing every registered shortcut that has a description, grouped. Mount once in a shell. */
export function ShortcutsHelp() {
  const [open, setOpen] = useState(false)
  const list = useShortcutList()
  useShortcut('?', () => setOpen((o) => !o), { description: 'Show keyboard shortcuts', group: 'General' })
  useEffect(() => {
    const on = () => setOpen(true)
    window.addEventListener(SHORTCUTS_EVENT, on)
    return () => window.removeEventListener(SHORTCUTS_EVENT, on)
  }, [])

  const groups = new Map<string, typeof list>()
  for (const s of list) groups.set(s.group, [...(groups.get(s.group) ?? []), s])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[80vh] gap-0 overflow-y-auto p-0 sm:max-w-md">
        <div className="border-b border-line px-5 py-4">
          <DialogTitle className="text-base font-semibold">Keyboard shortcuts</DialogTitle>
          <DialogDescription className="mt-0.5 text-[13px] text-ink-3">Everything in the dashboard works without a mouse.</DialogDescription>
        </div>
        <div className="space-y-5 px-5 py-4">
          {[...groups].map(([group, items]) => (
            <section key={group} aria-label={group}>
              <h3 className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase">{group}</h3>
              <ul className="space-y-1.5">
                {items.map((s) => (
                  <li key={s.keys + s.description} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-ink-2">{s.description}</span>
                    <Kbd keys={s.keys} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
