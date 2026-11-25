import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, Pencil, Plus, Tags, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { ConfirmDialog, type ConfirmOptions } from '@/components/ConfirmDialog'
import { ErrorState, ListSkeleton } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/api'
import { categoryTone } from '@/lib/constants'
import type { Category } from '@/lib/types'

import { Field, Section } from './settings-shared'

const toKeywords = (text: string, previous: Record<string, number> = {}) =>
  Object.fromEntries(
    text
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean)
      .map((k) => [k, previous[k] ?? 2]),
  )

function CategoryForm({ initial, busy, submitLabel, onSubmit, onCancel }: { initial?: Category; busy: boolean; submitLabel: string; onSubmit: (v: { name: string; description: string; keywords: Record<string, number> }) => void; onCancel?: () => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [keywords, setKeywords] = useState(Object.keys(initial?.keywords ?? {}).join(', '))
  const id = initial ? `c${initial.id}` : 'new'
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field stack label="Name" htmlFor={`${id}-name`} hint="Shown on tickets and in analytics.">
          <Input id={`${id}-name`} value={name} maxLength={80} placeholder="e.g. Shipping & Delivery" onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field stack label="Keywords" htmlFor={`${id}-kw`} hint="Comma separated. They power instant rule-based sorting when AI is off or unavailable.">
          <Input id={`${id}-kw`} value={keywords} placeholder="shipping, delivery, tracking" onChange={(e) => setKeywords(e.target.value)} />
        </Field>
      </div>
      <Field stack label="Description" htmlFor={`${id}-desc`} hint="Plain words. The AI reads this to decide which tickets belong here.">
        <Input id={`${id}-desc`} value={description} maxLength={300} placeholder="Late, lost or damaged deliveries and tracking questions." onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button size="sm" disabled={!name.trim() || busy} onClick={() => onSubmit({ name: name.trim(), description, keywords: toKeywords(keywords, initial?.keywords) })}>
          {busy ? <Loader2 className="animate-spin" /> : initial ? <Check /> : <Plus />} {submitLabel}
        </Button>
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            <X /> Cancel
          </Button>
        )}
      </div>
    </div>
  )
}

export function CategoriesSection({ readOnly }: { readOnly: boolean }) {
  const { slug, api } = useWorkspace()
  const queryClient = useQueryClient()
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['categories', slug], queryFn: api.categories })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['categories', slug] })

  const create = useMutation({
    mutationFn: (v: { name: string; description: string; keywords: Record<string, number> }) => {
      const key = v.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      return api.createCategory({ key, ...v })
    },
    onSuccess: () => {
      setAdding(false)
      invalidate()
      toast.success('Category added')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
  const update = useMutation({
    mutationFn: ({ id, ...v }: { id: number; name: string; description: string; keywords: Record<string, number> }) => api.updateCategory(id, v),
    onSuccess: () => {
      setEditing(null)
      invalidate()
      toast.success('Category updated')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
  const remove = useMutation({
    mutationFn: (c: Category) => api.deleteCategory(c.id),
    onSuccess: () => {
      invalidate()
      toast.success('Category deleted')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  return (
    <Section
      id="categories"
      icon={Tags}
      title="Categories"
      description="The topics your tickets are sorted into. The AI picks one for every new ticket; keywords are the instant backup when it can’t."
      aside={
        !readOnly && !adding ? (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus /> Add category
          </Button>
        ) : null
      }
    >
      {adding && (
        <div className="rounded-lg bg-accent/40 p-4">
          <p className="mb-3 text-sm font-semibold">New category</p>
          <CategoryForm busy={create.isPending} submitLabel="Add category" onSubmit={(v) => create.mutate(v)} onCancel={() => setAdding(false)} />
        </div>
      )}

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <ul className="divide-y [&>li]:py-5 [&>li:first-child]:pt-0">
          {data?.map((c) => {
            const tone = categoryTone(c.key, c.name)
            const kws = Object.keys(c.keywords)
            return (
              <li key={c.id}>
                {editing === c.id ? (
                  <CategoryForm initial={c} busy={update.isPending} submitLabel="Save" onSubmit={(v) => update.mutate({ id: c.id, ...v })} onCancel={() => setEditing(null)} />
                ) : (
                  <div className="flex items-start gap-3.5">
                    <span className={`mt-1.5 size-3 shrink-0 rounded-full ${tone.dot}`} />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        {c.name}
                        {c.is_default && (
                          <span title="Tickets that match nothing else land here. It can’t be deleted." className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Default
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{c.description || 'No description yet. Add one so the AI knows what belongs here.'}</p>
                      {kws.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {kws.slice(0, 10).map((k) => (
                            <span key={k} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              {k}
                            </span>
                          ))}
                          {kws.length > 10 && <span className="py-0.5 text-[11px] text-muted-foreground">+{kws.length - 10} more</span>}
                        </div>
                      )}
                    </div>
                    {!readOnly && (
                      <div className="flex shrink-0 gap-0.5">
                        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c.id)}>
                          <Pencil />
                        </Button>
                        {!c.is_default && (
                          <Button variant="ghost" size="icon-sm" aria-label={`Delete ${c.name}`} onClick={() => setConfirm({ title: 'Delete category?', description: 'Tickets in this category become uncategorised. This can’t be undone.', confirmLabel: 'Delete', destructive: true, onConfirm: () => remove.mutate(c) })}>
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </Section>
  )
}
