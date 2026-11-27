import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { ConfirmDialog, type ConfirmOptions } from '@/components/ConfirmDialog'
import { Chip, ErrorState, IconButton, SkeletonRows } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorMessage } from '@/lib/api'
import { categoryTone } from '@/lib/constants'
import type { Category } from '@/lib/types'

import { SettingsCard } from './rows'

type CategoryValues = { name: string; description: string; keywords: Record<string, number> }

const toKeywords = (text: string, previous: Record<string, number> = {}) =>
  Object.fromEntries(
    text
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean)
      .map((k) => [k, previous[k] ?? 2]),
  )

function CategoryForm({ initial, busy, submitLabel, onSubmit, onCancel }: { initial?: Category; busy: boolean; submitLabel: string; onSubmit: (v: CategoryValues) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [keywords, setKeywords] = useState(Object.keys(initial?.keywords ?? {}).join(', '))
  const id = initial ? `c${initial.id}` : 'new'
  const field = 'grid gap-x-8 gap-y-2 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]'
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim() && !busy) onSubmit({ name: name.trim(), description, keywords: toKeywords(keywords, initial?.keywords) })
      }}
    >
      <div className={field}>
        <div>
          <Label htmlFor={`${id}-name`}>Name</Label>
          <p className="mt-1 text-[13px] leading-5 text-ink-2">Shown on tickets and in analytics.</p>
        </div>
        <Input id={`${id}-name`} value={name} maxLength={80} placeholder="e.g. Shipping & Delivery" autoFocus className="h-11 max-w-md" onChange={(e) => setName(e.target.value)} />
      </div>
      <div className={field}>
        <div>
          <Label htmlFor={`${id}-desc`}>Description</Label>
          <p className="mt-1 text-[13px] leading-5 text-ink-2">Plain words. The AI reads this to decide which tickets belong here.</p>
        </div>
        <Input id={`${id}-desc`} value={description} maxLength={300} placeholder="Late, lost or damaged deliveries and tracking questions." className="h-11" onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className={field}>
        <div>
          <Label htmlFor={`${id}-kw`}>Keywords</Label>
          <p className="mt-1 text-[13px] leading-5 text-ink-2">Comma separated. They sort tickets instantly when AI is off or unavailable.</p>
        </div>
        <Input id={`${id}-kw`} value={keywords} placeholder="shipping, delivery, tracking" className="h-11" onChange={(e) => setKeywords(e.target.value)} />
      </div>
      <div className="flex gap-2 md:pl-[calc(13rem+2rem)]">
        <Button type="submit" size="sm" disabled={!name.trim() || busy}>
          {busy ? <Loader2 className="animate-spin" /> : initial ? <Check /> : <Plus />} {submitLabel}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          <X /> Cancel
        </Button>
      </div>
    </form>
  )
}

export function CategorySettings({ readOnly }: { readOnly: boolean }) {
  const { slug, api } = useWorkspace()
  const queryClient = useQueryClient()
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['categories', slug], queryFn: api.categories })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['categories', slug] })

  const create = useMutation({
    mutationFn: (v: CategoryValues) => api.createCategory({ key: v.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), ...v }),
    onSuccess: () => {
      setAdding(false)
      invalidate()
      toast.success('Category added')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
  const update = useMutation({
    mutationFn: ({ id, ...v }: CategoryValues & { id: number }) => api.updateCategory(id, v),
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
    <SettingsCard
      title="Ticket categories"
      description="Give each category a plain-words description for the AI, and keywords for the instant backup."
      actions={
        !readOnly && !adding ? (
          <Button onClick={() => setAdding(true)}>
            <Plus /> Add category
          </Button>
        ) : null
      }
    >
      {adding && (
        <div>
          <p className="mb-3 text-sm font-semibold text-ink">New category</p>
          <CategoryForm busy={create.isPending} submitLabel="Add category" onSubmit={(v) => create.mutate(v)} onCancel={() => setAdding(false)} />
        </div>
      )}
      {isLoading ? (
        <SkeletonRows rows={4} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !data?.length ? (
        <p className="text-sm text-ink-2">No categories yet. Add one so tickets can be sorted.</p>
      ) : (
        data.map((c) => {
          const tone = categoryTone(c.key, c.name)
          const kws = Object.keys(c.keywords)
          return editing === c.id ? (
            <div key={c.id}>
              <CategoryForm initial={c} busy={update.isPending} submitLabel="Save" onSubmit={(v) => update.mutate({ id: c.id, ...v })} onCancel={() => setEditing(null)} />
            </div>
          ) : (
            <div key={c.id} className="flex items-start gap-3.5">
              <span className={`mt-1.5 size-3 shrink-0 rounded-full ${tone.dot}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                  {c.name}
                  {c.is_default && (
                    <Chip size="sm" tone="slate" title="Tickets that match nothing else land here. It can’t be deleted.">
                      Default
                    </Chip>
                  )}
                </p>
                <p className="mt-0.5 text-[13px] leading-5 text-ink-2">{c.description || 'No description yet. Add one so the AI knows what belongs here.'}</p>
                {kws.length > 0 && (
                  <ul aria-label={`Keywords for ${c.name}`} className="mt-2 flex flex-wrap gap-1.5">
                    {kws.slice(0, 10).map((k) => (
                      <li key={k}>
                        <Chip size="sm" tone="slate">
                          {k}
                        </Chip>
                      </li>
                    ))}
                    {kws.length > 10 && <li className="py-1 text-xs text-ink-3">+{kws.length - 10} more</li>}
                  </ul>
                )}
              </div>
              {!readOnly && (
                <div className="flex shrink-0 gap-0.5">
                  <IconButton label={`Edit ${c.name}`} icon={Pencil} onClick={() => setEditing(c.id)} />
                  {!c.is_default && (
                    <IconButton
                      label={`Delete ${c.name}`}
                      icon={Trash2}
                      onClick={() => setConfirm({ title: 'Delete category?', description: 'Tickets in this category become uncategorised. This can’t be undone.', confirmLabel: 'Delete', destructive: true, onConfirm: () => remove.mutate(c) })}
                    />
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </SettingsCard>
  )
}
