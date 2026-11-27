import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import { Chip } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { Category } from '@/lib/types'

export type CategoryValues = { name: string; description: string; keywords: Record<string, number> }

const toList = (text: string) =>
  text
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)

const toKeywords = (text: string, previous: Record<string, number> = {}) => Object.fromEntries(toList(text).map((k) => [k, previous[k] ?? 2]))

function Field({ id, label, hint, children }: { id: string; label: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      <p className="mt-0.5 mb-2 text-[13px] leading-5 text-ink-2">{hint}</p>
      {children}
    </div>
  )
}

/** Add or edit a ticket category in a modal: name, a plain-words description for the AI, and keywords (shown as chips as you type). */
export function CategoryDialog({ category, busy, onSubmit, onClose }: { category: Category | null; busy: boolean; onSubmit: (v: CategoryValues) => void; onClose: () => void }) {
  const [name, setName] = useState(category?.name ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [keywords, setKeywords] = useState(Object.keys(category?.keywords ?? {}).join(', '))
  const list = toList(keywords)
  const valid = name.trim().length > 0

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
            if (valid && !busy) onSubmit({ name: name.trim(), description, keywords: toKeywords(keywords, category?.keywords) })
          }}
        >
          <div className="space-y-6 px-6 py-6">
            <Field id="cat-name" label="Name" hint="Shown on tickets and in analytics.">
              <Input id="cat-name" value={name} maxLength={80} placeholder="e.g. Shipping & Delivery" autoFocus className="h-12 text-base" onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field id="cat-desc" label="Description" hint="Plain words. The AI reads this to decide which tickets belong here.">
              <Input id="cat-desc" value={description} maxLength={300} placeholder="Late, lost or damaged deliveries and tracking questions." className="h-12 text-base" onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Field id="cat-kw" label="Keywords" hint="Comma separated. They sort tickets instantly when the AI is off or unavailable.">
              <Input id="cat-kw" value={keywords} placeholder="shipping, delivery, tracking" className="h-12 text-base" onChange={(e) => setKeywords(e.target.value)} />
              <div className="mt-3 flex min-h-8 flex-wrap gap-1.5" aria-live="polite">
                {list.length ? (
                  list.map((k, i) => (
                    <Chip key={`${k}-${i}`} size="sm" tone="slate">
                      {k}
                    </Chip>
                  ))
                ) : (
                  <span className="text-[13px] text-ink-3">Your keywords will appear here.</span>
                )}
              </div>
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
