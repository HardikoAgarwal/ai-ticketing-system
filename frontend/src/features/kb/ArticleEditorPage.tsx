import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, ChevronRight, FileText, Lightbulb, MoreHorizontal, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { ConfirmDialog, type ConfirmOptions } from '@/components/ConfirmDialog'
import { CHIP_TONES, ErrorState, Panel, Skeleton, type ChipTone } from '@/components/ds'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusPill } from '@/features/inbox/StatusPill'
import { PageHeader } from '@/features/shared/PageHeader'
import { SaveBar } from '@/features/settings/rows'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Article } from '@/lib/types'

import { AiPreviewDialog } from './AiPreviewDialog'
import { AiSearchDialog } from './AiSearchDialog'
import { flagsFor, splitPassages, visibilityOf } from './kb-utils'
import { TipsDialog } from './TipsDialog'
import { VisibilityCards } from './VisibilityCards'

const NONE = '__none__'
const FIELD_LABEL = 'block text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase'

/** A tab sitting on the top edge of the article card, in the same style as the New message / Overdue tabs on a ticket card. */
function TabChip({ tone, icon: Icon, onClick, children }: { tone: ChipTone; icon: typeof Bot; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn('inline-flex h-9 items-center gap-2 rounded-t-xl border border-b-0 px-4 text-sm font-semibold whitespace-nowrap transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none dark:hover:brightness-125', CHIP_TONES[tone])}>
      <Icon className="size-4" aria-hidden />
      {children}
    </button>
  )
}

/**
 * One full page for writing a new article and editing an existing one: category and visibility in a slim bar, then a big title and
 * writing area. The AI preview, writing tips and Test AI search are buttons in the header that open modals; a save bar appears when something changed.
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

      <div className="mt-8 flex items-end justify-between gap-3 px-6 sm:px-8">
        <div className="flex flex-wrap items-end gap-1.5">
          <TabChip tone="blue" icon={Bot} onClick={() => setModal('preview')}>
            AI preview
          </TabChip>
          {!readOnly && (
            <TabChip tone="amber" icon={Lightbulb} onClick={() => setModal('tips')}>
              Writing tips
            </TabChip>
          )}
        </div>
        <div className="flex items-end gap-1.5">
          <TabChip tone="ai" icon={Sparkles} onClick={() => setModal('test')}>
            Test AI search
          </TabChip>
          {!isNew && manager && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="More actions" className="inline-flex h-9 w-10 items-center justify-center rounded-t-xl border border-b-0 border-line-strong bg-surface text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none">
                  <MoreHorizontal className="size-4" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem variant="destructive" onClick={askDelete}>
                  <Trash2 /> Delete article
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <Panel>
        <div className="grid gap-x-10 gap-y-6 border-b border-line px-6 py-6 sm:px-8 md:grid-cols-[15rem_minmax(0,1fr)]">
          <div>
            <label htmlFor="article-category" className={FIELD_LABEL}>
              Category
            </label>
            <Select value={value.category ? String(value.category) : NONE} disabled={readOnly} onValueChange={(v) => set({ category: v === NONE ? null : Number(v) })}>
              <SelectTrigger id="article-category" className="mt-2 h-11 w-full">
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
            <div className="mt-2">
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
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4 text-[13px] text-ink-2">
            <span className="tabular-nums">
              {words} {words === 1 ? 'word' : 'words'} · {passages.length} {passages.length === 1 ? 'passage' : 'passages'}
            </span>
            {!isNew && listItem.data && listItem.data.is_published && (
              <span className="ml-auto">
                <StatusPill hue={listItem.data.indexed ? 'mint' : 'butter'}>{listItem.data.indexed ? 'AI search ready' : 'Indexing for AI search'}</StatusPill>
              </span>
            )}
          </div>
        </div>
      </Panel>

      {!readOnly && <SaveBar dirty={dirty} saving={save.isPending} saved={saved} error={save.error} disabled={!valid} onSave={() => save.mutate()} onDiscard={() => setDraft({})} />}
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
      <AiPreviewDialog open={modal === 'preview'} onOpenChange={(o) => !o && setModal(null)} passages={passages} title={title} />
      <TipsDialog open={modal === 'tips'} onOpenChange={(o) => !o && setModal(null)} />
      <AiSearchDialog open={modal === 'test'} onOpenChange={(o) => !o && setModal(null)} />
    </div>
  )
}
