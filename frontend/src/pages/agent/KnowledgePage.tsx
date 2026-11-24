import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, CheckCircle2, Eye, EyeOff, Loader2, Lock, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { PageHeader, RelativeTime } from '@/components/common'
import { ConfirmDialog, type ConfirmOptions } from '@/components/ConfirmDialog'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { errorMessage } from '@/lib/api'
import { categoryTone } from '@/lib/constants'
import type { Article } from '@/lib/types'
import { cn } from '@/lib/utils'

const NONE = '__none__'

function ArticleDialog({ articleId, open, onClose }: { articleId: number | 'new' | null; open: boolean; onClose: () => void }) {
  const { slug, api } = useWorkspace()
  const queryClient = useQueryClient()
  const categories = useQuery({ queryKey: ['categories', slug], queryFn: api.categories, enabled: open })
  const existing = useQuery({
    queryKey: ['article', slug, articleId],
    queryFn: () => api.article(articleId as number),
    enabled: open && typeof articleId === 'number',
  })
  const [draft, setDraft] = useState<Partial<Article> | null>(null)
  const base: Partial<Article> = articleId === 'new' ? { title: '', body: '', category: null, is_published: true, is_internal: false } : (existing.data ?? {})
  const value = { ...base, ...draft }

  const save = useMutation({
    mutationFn: () => (articleId === 'new' ? api.createArticle(value) : api.updateArticle(articleId as number, value)),
    onSuccess: () => {
      toast.success('Article saved. Re-indexing for AI search.')
      queryClient.invalidateQueries({ queryKey: ['articles', slug] })
      setDraft(null)
      onClose()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const valid = (value.title ?? '').trim().length > 0 && (value.body ?? '').trim().length > 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (setDraft(null), onClose())}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{articleId === 'new' ? 'New article' : 'Edit article'}</DialogTitle>
          <DialogDescription>AI drafts quote from these articles and show them as citations. Separate topics with blank lines so they index well.</DialogDescription>
        </DialogHeader>
        {existing.isLoading && articleId !== 'new' ? (
          <ListSkeleton rows={3} />
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="a-title">Title</Label>
              <Input id="a-title" value={value.title ?? ''} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-body">Content</Label>
              <Textarea id="a-body" rows={10} value={value.body ?? ''} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={value.category ? String(value.category) : NONE} onValueChange={(v) => setDraft({ ...draft, category: v === NONE ? null : Number(v) })}>
                  <SelectTrigger>
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
              </div>
              <div className="flex flex-col justify-end gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <Checkbox checked={!!value.is_published} onCheckedChange={(v) => setDraft({ ...draft, is_published: !!v })} /> Published
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox checked={!!value.is_internal} onCheckedChange={(v) => setDraft({ ...draft, is_internal: !!v })} /> Internal only (never shown to customers)
                </label>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => (setDraft(null), onClose())}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={!valid || save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} Save article
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function KnowledgePage() {
  const { slug, api, manager } = useWorkspace()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  const [q, setQ] = useState('')
  const [submitted, setSubmitted] = useState('')

  const list = useQuery({ queryKey: ['articles', slug], queryFn: api.articles })
  const search = useQuery({ queryKey: ['kb-search', slug, submitted], queryFn: () => api.searchArticles(submitted), enabled: submitted.length > 1 })

  const remove = useMutation({
    mutationFn: (id: number) => api.deleteArticle(id),
    onSuccess: () => {
      toast.success('Article deleted')
      queryClient.invalidateQueries({ queryKey: ['articles', slug] })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const articles = list.data ?? []

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Knowledge base"
        description="The source of truth for AI drafts and customer self-service suggestions."
        actions={
          manager && (
            <Button onClick={() => setEditing('new')}>
              <Plus /> New article
            </Button>
          )
        }
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setSubmitted(q.trim())
        }}
        className="mb-5 rounded-2xl border bg-card p-4 shadow-xs"
      >
        <Label htmlFor="kb-q" className="mb-2 block text-sm font-semibold">
          Test retrieval
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="kb-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a customer question to see what the AI would retrieve" className="pl-9" />
          </div>
          <Button type="submit" variant="outline" disabled={q.trim().length < 2}>
            Search
          </Button>
        </div>
        {submitted && (
          <div className="mt-3 space-y-2">
            {search.isLoading ? (
              <p className="text-sm text-muted-foreground">Searching…</p>
            ) : search.data?.length ? (
              search.data.map((h) => (
                <div key={h.article_id} className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <p className="flex items-center justify-between gap-2 font-medium">
                    {h.title}
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] text-violet-700">score {h.score.toFixed(2)}</span>
                  </p>
                  <p className="mt-1 line-clamp-3 text-xs whitespace-pre-line text-muted-foreground">{h.text}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No matching articles. The AI would tell the customer it can't confirm that yet.</p>
            )}
          </div>
        )}
      </form>

      {list.isLoading ? (
        <ListSkeleton rows={5} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : articles.length === 0 ? (
        <EmptyState icon={BookOpen} title="No articles yet" description="Add your policies and how-tos so AI replies can cite them." />
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-xs">
          {articles.map((a) => {
            const tone = a.category_name && a.category ? categoryTone(String(a.category), a.category_name) : null
            return (
              <li key={a.id} className="flex items-start gap-3 p-4 transition-colors hover:bg-muted/30 sm:gap-4 sm:p-5">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <BookOpen className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <button onClick={() => setEditing(a.id)} className="text-left text-sm font-semibold hover:underline">
                    {a.title}
                  </button>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{a.excerpt}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                    {tone && <span className={cn('rounded-full px-2 py-0.5 font-medium ring-1 ring-inset', tone.pill)}>{a.category_name}</span>}
                    {a.is_internal && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800 ring-1 ring-amber-600/20 ring-inset">
                        <Lock className="size-3" /> Internal
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-muted-foreground">{a.is_published ? <Eye className="size-3" /> : <EyeOff className="size-3" />} {a.is_published ? 'Published' : 'Draft'}</span>
                    <span className={cn('inline-flex items-center gap-1', a.indexed ? 'text-emerald-700' : 'text-muted-foreground')} title={a.indexed ? 'Embedded for semantic search' : 'Using keyword search until embedded'}>
                      <CheckCircle2 className="size-3" /> {a.indexed ? 'Semantic index' : 'Keyword index'}
                    </span>
                    <span className="text-muted-foreground">
                      Updated <RelativeTime value={a.updated_at} />
                    </span>
                  </div>
                </div>
                {manager && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${a.title}`}
                    onClick={() => setConfirm({ title: 'Delete article?', description: `"${a.title}" will no longer be used in AI drafts.`, confirmLabel: 'Delete', destructive: true, onConfirm: () => remove.mutate(a.id) })}
                  >
                    <Trash2 />
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <ArticleDialog key={String(editing)} articleId={editing} open={editing !== null} onClose={() => setEditing(null)} />
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
