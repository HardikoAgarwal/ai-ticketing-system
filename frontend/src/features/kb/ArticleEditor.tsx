import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Bot, CheckCircle2, Eye, Lightbulb, Loader2, Lock, ShieldAlert, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { AiSurface, Chip, ErrorState, Panel, SkeletonRows } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { errorMessage } from '@/lib/api'
import type { Article } from '@/lib/types'

import { splitPassages, TIPS } from './kb-utils'

const NONE = '__none__'

function ToggleRow({ id, checked, onChange, title, hint, icon: Icon, disabled }: { id: string; checked: boolean; onChange: (v: boolean) => void; title: string; hint: string; icon: typeof Eye; disabled?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-3.5">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-control bg-sunken text-ink-2">
        <Icon className="size-4" aria-hidden />
      </span>
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="block text-[13px] leading-5 text-ink-2">{hint}</span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} className="mt-1" />
    </div>
  )
}

/** Inline editor shown in the right pane. Reports dirty state so the page can guard navigation. */
export function ArticleEditor({ articleId, readOnly, onClose, onDirty, onCreated, onDelete }: {
  articleId: number | 'new'
  readOnly: boolean
  onClose: () => void
  onDirty: (dirty: boolean) => void
  onCreated: (id: number) => void
  onDelete: (id: number, title: string) => void
}) {
  const { slug, api } = useWorkspace()
  const queryClient = useQueryClient()
  const isNew = articleId === 'new'
  const categories = useQuery({ queryKey: ['categories', slug], queryFn: api.categories })
  const existing = useQuery({ queryKey: ['article', slug, articleId], queryFn: () => api.article(articleId as number), enabled: !isNew })
  const [draft, setDraft] = useState<Partial<Article>>({})
  const base: Partial<Article> = isNew ? { title: '', body: '', category: null, is_published: true, is_internal: false } : (existing.data ?? {})
  const value = { ...base, ...draft }
  const title = value.title ?? ''
  const body = value.body ?? ''
  const words = body.trim() ? body.trim().split(/\s+/).length : 0
  const passages = splitPassages(body)
  const dirty = Object.keys(draft).length > 0
  const valid = title.trim().length > 0 && body.trim().length > 0

  useEffect(() => {
    onDirty(dirty)
  }, [dirty, onDirty])
  useEffect(() => () => onDirty(false), [onDirty])

  const save = useMutation({
    mutationFn: () => (isNew ? api.createArticle(value) : api.updateArticle(articleId, value)),
    onSuccess: (saved) => {
      toast.success('Article saved. It will be ready for AI search in a moment.')
      queryClient.invalidateQueries({ queryKey: ['articles', slug] })
      queryClient.invalidateQueries({ queryKey: ['article', slug, articleId] })
      setDraft({})
      if (isNew) onCreated(saved.id)
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const set = (patch: Partial<Article>) => setDraft((d) => ({ ...d, ...patch }))
  const listItem = useQuery({ queryKey: ['articles', slug], queryFn: api.articles, select: (l) => l.find((a) => a.id === articleId) })

  return (
    <Panel className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Back to articles" onClick={onClose}>
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold tracking-tight text-ink">{readOnly ? 'Article' : isNew ? 'New article' : 'Edit article'}</h2>
          <p className="truncate text-xs text-ink-3">{readOnly ? 'Only owners and admins can edit. You can read what the AI reads.' : 'Write it the way you would explain it to a customer. The AI quotes this and cites it.'}</p>
        </div>
        {!isNew && listItem.data && (
          listItem.data.indexed ? <Chip tone="green" size="sm" icon={CheckCircle2}>AI-search ready</Chip> : <Chip tone="amber" size="sm" icon={Loader2}>Indexing</Chip>
        )}
        <Button variant="ghost" size="sm" className="hidden lg:inline-flex" onClick={onClose}>
          Close
        </Button>
      </div>

      {!isNew && existing.isLoading ? (
        <div className="p-4">
          <SkeletonRows rows={4} />
        </div>
      ) : !isNew && existing.isError ? (
        <div className="p-4">
          <ErrorState error={existing.error} onRetry={() => existing.refetch()} />
        </div>
      ) : (
        <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-5 p-5">
            <div className="space-y-1.5">
              <Label htmlFor="a-title">Title</Label>
              <Input id="a-title" value={title} disabled={readOnly} maxLength={200} placeholder="e.g. Refunds and credits" className="h-11 text-base font-medium" onChange={(e) => set({ title: e.target.value })} />
              <p className="text-xs text-ink-3">Customers see this when we suggest the article. Name the topic plainly.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-cat">Category</Label>
              <Select value={value.category ? String(value.category) : NONE} disabled={readOnly} onValueChange={(v) => set({ category: v === NONE ? null : Number(v) })}>
                <SelectTrigger id="a-cat" className="w-full sm:w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No category</SelectItem>
                  {categories.data?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-ink-3">Articles in a ticket's category get a small boost when the AI picks what to read.</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-end justify-between">
                <Label htmlFor="a-body">Content</Label>
                <span className="text-xs text-ink-3 tabular-nums">
                  {words} {words === 1 ? 'word' : 'words'} · {body.length} characters
                </span>
              </div>
              <Textarea id="a-body" rows={12} value={body} disabled={readOnly} className="leading-relaxed" placeholder={'Annual plans can be refunded within 14 days of purchase.\n\nAfter that we convert the unused term into account credit.'} onChange={(e) => set({ body: e.target.value })} />
            </div>

            <div className="divide-y divide-line rounded-control border border-line px-4">
              <ToggleRow id="a-pub" icon={Eye} checked={!!value.is_published} disabled={readOnly} onChange={(v) => set({ is_published: v })} title="Published" hint="Live: the AI can use it and customers can be shown it. Turn off to keep it as a draft." />
              <ToggleRow id="a-int" icon={Lock} checked={!!value.is_internal} disabled={readOnly} onChange={(v) => set({ is_internal: v })} title="Internal only" hint="Staff guidance such as escalation rules. The AI follows it but never quotes it, and customers never see it." />
            </div>

            <AiSurface tone="quiet" className="p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Bot className="size-4 text-violet" aria-hidden /> How the AI will see this
              </h3>
              <p className="mt-1 mb-3 text-[13px] text-ink-2">Your article is cut into passages. For each ticket the AI is given the most relevant ones and cites the article.</p>
              {value.is_internal && (
                <p className="mb-3 flex items-start gap-2 rounded-control border border-butter-line bg-butter p-2.5 text-xs text-butter-ink">
                  <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden /> Internal: the AI treats this as private guidance and won't quote it.
                </p>
              )}
              {!value.is_published && <p className="mb-3 rounded-control bg-sunken p-2.5 text-xs text-ink-2">Draft: not used until published.</p>}
              {passages.length === 0 ? (
                <p className="rounded-control border border-dashed border-line-strong p-4 text-center text-xs text-ink-3">Start writing to see the passages appear here.</p>
              ) : (
                <ol className="space-y-2">
                  {passages.map((p, i) => (
                    <li key={i} className="rounded-control border border-line bg-surface-2 p-3">
                      <p className="mb-1 text-[11px] font-semibold text-ink-3">
                        {title.trim() || 'Untitled'} · passage {i + 1} of {passages.length}
                      </p>
                      <p className="line-clamp-5 text-xs leading-relaxed whitespace-pre-line text-ink-2">{p}</p>
                    </li>
                  ))}
                </ol>
              )}
            </AiSurface>

            {!readOnly && (
              <section aria-label="Writing tips">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                  <Lightbulb className="size-4 text-butter-ink" aria-hidden /> Writing tips
                </h3>
                <ul className="space-y-1.5">
                  {TIPS.map((t) => (
                    <li key={t} className="flex gap-2 text-[13px] leading-5 text-ink-2">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-mint-ink" aria-hidden /> {t}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      )}

      {!readOnly && (
        <div className="flex items-center gap-3 border-t border-line bg-surface-2 px-4 py-3">
          <p role="status" className="min-w-0 flex-1 truncate text-xs text-ink-2">
            {save.isPending ? 'Saving…' : dirty ? <span className="font-medium text-butter-ink">Unsaved changes</span> : save.isError ? <span className="text-rose-ink">Couldn't save. Try again.</span> : 'All changes saved'}
          </p>
          {!isNew && (
            <Button variant="ghost" size="sm" className="text-rose-ink hover:text-rose-ink" onClick={() => onDelete(articleId, title)}>
              <Trash2 /> Delete
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            {dirty ? 'Cancel' : 'Close'}
          </Button>
          <Button size="sm" onClick={() => save.mutate()} disabled={!valid || save.isPending || (!isNew && !dirty)}>
            {save.isPending && <Loader2 className="animate-spin" />} Save article
          </Button>
        </div>
      )}
    </Panel>
  )
}
