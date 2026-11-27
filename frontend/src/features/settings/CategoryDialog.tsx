import { Loader2, Plus, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { Category } from '@/lib/types'

export type CategoryValues = { name: string; description: string; keywords: Record<string, number> }

const splitWords = (text: string) =>
  text
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
    </div>
  )
}

/** Add or edit a ticket category in a modal: name, a plain-words description for the AI, and keywords added one at a time (Enter or Add) as removable tags. */
export function CategoryDialog({ category, busy, onSubmit, onClose }: { category: Category | null; busy: boolean; onSubmit: (v: CategoryValues) => void; onClose: () => void }) {
  const [name, setName] = useState(category?.name ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [tags, setTags] = useState<string[]>(Object.keys(category?.keywords ?? {}))
  const [draft, setDraft] = useState('')
  const valid = name.trim().length > 0

  // adds what is typed (Enter or the Add button); a pasted comma list becomes several keywords, and repeats are ignored
  const addDraft = () => {
    const words = splitWords(draft)
    if (words.length) setTags((t) => [...t, ...words.filter((w, i) => !t.includes(w) && words.indexOf(w) === i)])
    setDraft('')
  }
  const finish = () => {
    const all = [...tags, ...splitWords(draft).filter((w) => !tags.includes(w))]
    const previous = category?.keywords ?? {}
    onSubmit({ name: name.trim(), description, keywords: Object.fromEntries(all.map((k) => [k, previous[k] ?? 2])) })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="scroll-quiet max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <div className="border-b border-line px-6 py-6 pr-14">
          <DialogTitle className="text-2xl leading-8 font-semibold tracking-tight text-ink">{category ? 'Edit category' : 'New category'}</DialogTitle>
          <DialogDescription className="mt-1.5 text-[15px] leading-6 text-ink-2">{category ? 'Changes apply to new tickets straight away.' : 'Tickets are sorted into categories. The AI picks one for every new ticket.'}</DialogDescription>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (valid && !busy) finish()
          }}
        >
          <div className="space-y-6 px-6 py-6">
            <Field id="cat-name" label="Name">
              <Input id="cat-name" value={name} maxLength={80} placeholder="e.g. Shipping & Delivery" autoFocus className="h-12 text-base" onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field id="cat-desc" label="Description">
              <Input id="cat-desc" value={description} maxLength={300} placeholder="Late, lost or damaged deliveries and tracking questions." className="h-12 text-base" onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Field id="cat-kw" label="Keywords">
              <div className="flex gap-2">
                <Input
                  id="cat-kw"
                  value={draft}
                  placeholder="Type a keyword and press Enter"
                  className="h-12 flex-1 text-base"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addDraft()
                    } else if (e.key === 'Backspace' && !draft && tags.length) setTags((t) => t.slice(0, -1))
                  }}
                />
                <Button type="button" variant="outline" size="lg" className="h-12 px-4" disabled={!draft.trim()} onClick={addDraft}>
                  <Plus /> Add
                </Button>
              </div>
              <ul aria-label="Keywords" className="mt-3 flex min-h-8 flex-wrap gap-2">
                {tags.length ? (
                  tags.map((k) => (
                    <li key={k} className="inline-flex h-8 items-center gap-1 rounded-md border border-dashed border-line-strong bg-surface pr-1 pl-2.5 font-mono text-[13px] text-ink">
                      <span className="text-ink-3" aria-hidden>
                        #
                      </span>
                      {k}
                      <button type="button" aria-label={`Remove ${k}`} onClick={() => setTags((t) => t.filter((x) => x !== k))} className="ml-0.5 flex size-6 items-center justify-center rounded text-ink-3 hover:bg-sunken hover:text-ink focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none">
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="text-[13px] text-ink-3">No keywords yet.</li>
                )}
              </ul>
            </Field>
          </div>

          <div className="flex justify-end gap-3 border-t border-line bg-surface-2 px-6 py-4">
            <Button type="button" variant="outline" size="lg" className="h-11" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="lg" className="h-11" disabled={!valid || busy}>
              {busy && <Loader2 className="animate-spin" />} {category ? 'Save changes' : 'Add category'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
