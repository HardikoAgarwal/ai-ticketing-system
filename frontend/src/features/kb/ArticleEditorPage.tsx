import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, ChevronRight, FileText, Lightbulb, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { ConfirmDialog, type ConfirmOptions } from '@/components/ConfirmDialog'
import { ErrorState, Panel, Skeleton } from '@/components/ds'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusPill } from '@/features/inbox/StatusPill'
import { PageHeader } from '@/features/shared/PageHeader'
import { SaveBar } from '@/features/settings/rows'
import { errorMessage } from '@/lib/api'
import type { Article } from '@/lib/types'

import { AiButton } from './AiButton'
import { AiPreviewDialog } from './AiPreviewDialog'
import { AiSearchDialog } from './AiSearchDialog'
import { flagsFor, splitPassages, visibilityOf } from './kb-utils'
import { TipsDialog } from './TipsDialog'
import { VisibilityCards } from './VisibilityCards'

const NONE = '__none__'
const FIELD_LABEL = 'block text-base font-semibold text-ink'

/** A neutral tab on the top edge of the article card (same shape as the New message / Overdue tabs on a ticket card). */
function TabChip({ icon: Icon, onClick, children }: { icon: typeof Bot; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-9 items-center gap-2 rounded-t-xl border border-b-0 border-line bg-surface px-4 text-sm font-semibold whitespace-nowrap text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none">
      <Icon className="size-4" aria-hidden />
      {children}
    </button>
  )
}

/**
 * One full page for writing a new article and editing an existing one. How it works and Writing tips are tabs above the card; the card holds
 * category, visibility, then the title and writing area, with Test AI search and Delete in its footer; a save bar appears when something changed.
 */
export function ArticleEditorPage() {
  const { id } = useParams()
  const isNew = !id
  const { slug, api, manager } = useWorkspace()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const base = `/w/${slug}/agent/knowledge`
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  const [modal, setModal] = useState<'preview' | 'tips' | 'test' | null>(null)
  const [saved, setSaved] = useState(false)
  const [draft, setDraft] = useState<Partial<Article>>({})

  const articleId = isNew ? 0 : Number(id)
  const categories = useQuery({ queryKey: ['categories', slug], queryFn: api.categories })
  const existing = useQuery({ queryKey: ['article', slug, articleId], queryFn: () => api.article(articleId), enabled: !isNew && Number.isFinite(articleId) })
  const listItem = useQuery({ queryKey: ['articles', slug], queryFn: api.articles, select: (l) => l.find((a) => a.id === articleId), enabled: !isNew, refetchInterval: (q) => (q.state.data?.some((a) => a.id === articleId && a.is_published && !a.indexed) ? 4000 : false) })

  const base_: Partial<Article> = isNew ? { title: '', body: '', category: null, is_published: true, is_internal: false } : (existing.data ?? {})
  const value = { ...base_, ...draft }
  const title = value.title ?? ''
  const body = value.body ?? ''
  const visibility = visibilityOf({ is_published: !!value.is_published, is_internal: !!value.is_internal })
  const passages = splitPassages(body)
  const words = body.trim() ? body.trim().split(/\s+/).length : 0
  const dirty = Object.keys(draft).length > 0
  const valid = title.trim().length > 0 && body.trim().length > 0
  const set = (patch: Partial<Article>) => {
    setSaved(false)
    setDraft((d) => ({ ...d, ...patch }))
  }

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const save = useMutation({
    mutationFn: () => (isNew ? api.createArticle(value) : api.updateArticle(articleId, value)),
    onSuccess: () => {
      toast.success(isNew ? 'Article created. It will be ready for AI search in a moment.' : 'Article saved.')
      queryClient.invalidateQueries({ queryKey: ['articles', slug] })
      queryClient.invalidateQueries({ queryKey: ['article', slug, articleId] })
      setDraft({})
      if (isNew) navigate(base)
      else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2600)
      }
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
  const remove = useMutation({
    mutationFn: () => api.deleteArticle(articleId),
    onSuccess: () => {
      toast.success('Article deleted')
      queryClient.invalidateQueries({ queryKey: ['articles', slug] })
      navigate(base)
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const leave = () => {
    if (!dirty) return navigate(base)
    setConfirm({ title: 'Discard your changes?', description: 'You have edits that have not been saved. If you leave now they are lost.', confirmLabel: 'Discard and leave', destructive: true, onConfirm: () => navigate(base) })
  }
  const askDelete = () =>
    setConfirm({ title: 'Delete article?', description: `"${title || 'This article'}" will no longer be used in AI drafts or suggestions. This can't be undone.`, confirmLabel: 'Delete', destructive: true, onConfirm: () => remove.mutate() })

  if (isNew && !manager) return <Navigate to={base} replace />
  const readOnly = !manager

  const crumbs = (
    <nav aria-label="Breadcrumb" className="mt-4">
      <ol className="flex min-w-0 items-center gap-2 text-sm">
        <li>
          <button type="button" onClick={leave} className="rounded-sm font-medium text-ink-2 hover:text-ink hover:underline focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none">
            Knowledge base
          </button>
        </li>
        <li aria-hidden className="text-ink-3">
          <ChevronRight className="size-4" />
        </li>
        <li className="min-w-0 truncate font-semibold text-ink" aria-current="page">
          {isNew ? 'New article' : title.trim() || 'Untitled article'}
        </li>
      </ol>
    </nav>
  )

  if (!isNew && existing.isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1000px]">
        {crumbs}
        <Skeleton className="mt-8 h-[560px] rounded-panel" />
      </div>
    )
  }
  if (!isNew && existing.isError) {
    return (
      <div className="mx-auto w-full max-w-[1000px]">
        {crumbs}
        <div className="mt-8">
          <ErrorState error={existing.error} onRetry={() => existing.refetch()} title="We couldn't open this article" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1000px] pb-8">
      <PageHeader
        icon={FileText}
        title={readOnly ? 'Article' : isNew ? 'New article' : 'Edit article'}
        description={readOnly ? 'Only owners and admins can edit. You can read exactly what the AI reads.' : 'Write it the way you would explain it to a customer. The AI quotes this and cites it.'}
      />
      {crumbs}

      <div className="mt-8 flex flex-wrap items-end gap-1.5 px-6 sm:px-8">
        <TabChip icon={Bot} onClick={() => setModal('preview')}>
          How it works
        </TabChip>
        {!readOnly && (
          <TabChip icon={Lightbulb} onClick={() => setModal('tips')}>
            Writing tips
          </TabChip>
        )}
      </div>

      <Panel>
        <div className="space-y-8 border-b border-line p-6 sm:p-8">
          <div className="max-w-md">
            <label htmlFor="article-category" className={FIELD_LABEL}>
              Select category for article
            </label>
            <Select value={value.category ? String(value.category) : NONE} disabled={readOnly} onValueChange={(v) => set({ category: v === NONE ? null : Number(v) })}>
              <SelectTrigger id="article-category" className="mt-3 h-12 w-full text-base">
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
            <p className="mt-2 text-[13px] leading-5 text-ink-2">The AI favours articles in a ticket&apos;s own category.</p>
          </div>
          <div>
            <span className={FIELD_LABEL}>Who can use it</span>
            <div className="mt-3">
              <VisibilityCards value={visibility} disabled={readOnly} onChange={(v) => set(flagsFor(v))} />
            </div>
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <input
            aria-label="Article title"
            value={title}
            disabled={readOnly}
            maxLength={200}
            placeholder="Article title, e.g. Refunds and credits"
            onChange={(e) => set({ title: e.target.value })}
            className="w-full border-0 bg-transparent text-3xl leading-10 font-semibold tracking-tight text-ink outline-none placeholder:text-ink-3 disabled:opacity-100"
          />
          <hr className="my-6 border-line" />
          <textarea
            aria-label="Article content"
            value={body}
            disabled={readOnly}
            placeholder={'Annual plans can be refunded within 14 days of purchase.\n\nAfter that we convert the unused term into account credit.'}
            onChange={(e) => set({ body: e.target.value })}
            className="block min-h-[28rem] w-full resize-y rounded-control border-0 bg-transparent p-0 text-base leading-7 text-ink outline-none placeholder:text-ink-3 disabled:opacity-100"
          />
        </div>
        <footer className="flex flex-wrap items-center gap-3 rounded-b-panel border-t border-line bg-surface-2 px-6 py-3.5 sm:px-8">
          <AiButton className="h-9" onClick={() => setModal('test')}>
            Test AI search
          </AiButton>
          {!isNew && manager && (
            <button type="button" onClick={askDelete} className="inline-flex h-9 items-center gap-2 rounded-control border border-rose-line bg-surface px-3.5 text-sm font-semibold text-rose-ink transition-colors hover:bg-rose focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none">
              <Trash2 className="size-4" aria-hidden />
              Delete article
            </button>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-3 text-[13px] text-ink-2">
            <span className="tabular-nums">
              {words} {words === 1 ? 'word' : 'words'} · {passages.length} {passages.length === 1 ? 'passage' : 'passages'}
            </span>
            {!isNew && listItem.data && listItem.data.is_published && <StatusPill hue={listItem.data.indexed ? 'mint' : 'butter'}>{listItem.data.indexed ? 'AI search ready' : 'Indexing for AI search'}</StatusPill>}
          </div>
        </footer>
      </Panel>

      {!readOnly && <SaveBar dirty={dirty} saving={save.isPending} saved={saved} error={save.error} disabled={!valid} onSave={() => save.mutate()} onDiscard={() => setDraft({})} />}
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
      <AiPreviewDialog open={modal === 'preview'} onOpenChange={(o) => !o && setModal(null)} passages={passages} title={title} />
      <TipsDialog open={modal === 'tips'} onOpenChange={(o) => !o && setModal(null)} />
      <AiSearchDialog open={modal === 'test'} onOpenChange={(o) => !o && setModal(null)} />
    </div>
  )
}
