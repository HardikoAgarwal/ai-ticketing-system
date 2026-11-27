import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Tag, Tags, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { ConfirmDialog, type ConfirmOptions } from '@/components/ConfirmDialog'
import { Chip, ErrorState, IconButton, SkeletonRows } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/api'
import { categoryTone } from '@/lib/constants'
import type { Category } from '@/lib/types'

import { CategoryDialog, type CategoryValues } from './CategoryDialog'
import { SettingsCard } from './rows'

export function CategorySettings({ readOnly }: { readOnly: boolean }) {
  const { slug, api } = useWorkspace()
  const queryClient = useQueryClient()
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  // null = closed, 'new' = adding, a category = editing it
  const [dialog, setDialog] = useState<'new' | Category | null>(null)
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['categories', slug], queryFn: api.categories })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['categories', slug] })

  const create = useMutation({
    mutationFn: (v: CategoryValues) => api.createCategory({ key: v.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), ...v }),
    onSuccess: () => {
      setDialog(null)
      invalidate()
      toast.success('Category added')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
  const update = useMutation({
    mutationFn: ({ id, ...v }: CategoryValues & { id: number }) => api.updateCategory(id, v),
    onSuccess: () => {
      setDialog(null)
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
      icon={Tags}
      title="Ticket categories"
      description="Give each category a plain-words description for the AI, and keywords for the instant backup."
      actions={
        !readOnly ? (
          <Button onClick={() => setDialog('new')}>
            <Plus /> Add category
          </Button>
        ) : null
      }
    >
      {isLoading ? (
        <SkeletonRows rows={4} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !data?.length ? (
        <p className="text-sm text-ink-2">No categories yet. Add one so tickets can be sorted.</p>
      ) : (
        <ul className="-my-1 divide-y divide-line">
          {data.map((c) => {
            const tone = categoryTone(c.key, c.name)
            const kws = Object.keys(c.keywords)
            return (
              <li key={c.id} className="flex items-start gap-4 py-5 first:pt-1 last:pb-1">
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-control text-white ${tone.dot}`} aria-hidden>
                  <Tag className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-ink">
                    {c.name}
                    {c.is_default && (
                      <Chip size="sm" tone="slate" title="Tickets that match nothing else land here. It can’t be deleted.">
                        Default
                      </Chip>
                    )}
                  </p>
                  <p className="mt-1 text-[13px] leading-5 text-ink-2">{c.description || 'No description yet. Add one so the AI knows what belongs here.'}</p>
                  {kws.length > 0 && (
                    <ul aria-label={`Keywords for ${c.name}`} className="mt-3 flex flex-wrap gap-1.5">
                      {kws.slice(0, 10).map((k) => (
                        <li key={k} className="inline-flex h-6 items-center rounded-md border border-dashed border-line-strong px-2 font-mono text-xs text-ink-2">
                          <span className="mr-0.5 text-ink-3" aria-hidden>
                            #
                          </span>
                          {k}
                        </li>
                      ))}
                      {kws.length > 10 && <li className="inline-flex h-6 items-center text-xs text-ink-3">+{kws.length - 10} more</li>}
                    </ul>
                  )}
                </div>
                {!readOnly && (
                  <div className="flex shrink-0 gap-0.5">
                    <IconButton label={`Edit ${c.name}`} icon={Pencil} onClick={() => setDialog(c)} />
                    {!c.is_default && (
                      <IconButton
                        label={`Delete ${c.name}`}
                        icon={Trash2}
                        onClick={() => setConfirm({ title: 'Delete category?', description: 'Tickets in this category become uncategorised. This can’t be undone.', confirmLabel: 'Delete', destructive: true, onConfirm: () => remove.mutate(c) })}
                      />
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {dialog && (
        <CategoryDialog
          key={dialog === 'new' ? 'new' : dialog.id}
          category={dialog === 'new' ? null : dialog}
          busy={create.isPending || update.isPending}
          onSubmit={(v: CategoryValues) => (dialog === 'new' ? create.mutate(v) : update.mutate({ id: dialog.id, ...v }))}
          onClose={() => setDialog(null)}
        />
      )}
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </SettingsCard>
  )
}
