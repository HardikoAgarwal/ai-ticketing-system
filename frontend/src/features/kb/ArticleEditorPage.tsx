import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Bot, ChevronDown, FileText, FlaskConical, Lightbulb, MoreHorizontal, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { ConfirmDialog, type ConfirmOptions } from '@/components/ConfirmDialog'
import { ErrorState, Panel, Skeleton } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusPill } from '@/features/inbox/StatusPill'
import { PageHeader } from '@/features/shared/PageHeader'
import { SaveBar } from '@/features/settings/rows'
import { errorMessage } from '@/lib/api'
import type { Article } from '@/lib/types'

import { flagsFor, splitPassages, TIPS, visibilityOf, type Visibility } from './kb-utils'
import { VisibilityPicker } from './VisibilityPicker'

const NONE = '__none__'

function RailSection({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <h2 className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase">{title}</h2>
      {children}
    </section>
  )
}

function Fold({ icon: Icon, title, meta, children }: { icon: typeof Bot; title: string; meta?: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-control text-sm font-semibold text-ink select-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <Icon className="size-4 text-ink-2" aria-hidden />
        <span className="flex-1">{title}</span>
        {meta && <span className="text-xs font-medium text-ink-2">{meta}</span>}
        <ChevronDown className="size-4 text-ink-3 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  )
}

/**
 * One full page for writing a new article and editing an existing one: a big title and writing area on the left,
 * category, visibility, the AI preview and writing tips on the right, and a save bar that appears when something changed.
 */
export function ArticleEditorPage() {
  const { id } = useParams()
  const isNew = !id
  const { slug, api, manager } = useWorkspace()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const base = `/w/${slug}/agent/knowledge`
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
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

  const back = (
    <button type="button" onClick={leave} className="mb-5 inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-ink-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none">
      <ArrowLeft className="size-4" aria-hidden /> Knowledge base
    </button>
  )

  if (!isNew && existing.isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        {back}
        <Skeleton className="h-[560px] rounded-panel" />
      </div>
    )
  }
  if (!isNew && existing.isError) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        {back}
        <ErrorState error={existing.error} onRetry={() => existing.refetch()} title="We couldn't open this article" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] pb-8">
      {back}
      <PageHeader
        icon={FileText}
        title={readOnly ? 'Article' : isNew ? 'New article' : 'Edit article'}
        description={readOnly ? 'Only owners and admins can edit. You can read exactly what the AI reads.' : 'Write it the way you would explain it to a customer. The AI quotes this and cites it.'}
        actions={
          <>
            <Button variant="outline" asChild className="h-10">
              <Link to={`${base}?tab=test`}>
                <FlaskConical /> Test AI search
              </Link>
            </Button>
            {!isNew && manager && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="size-10" aria-label="More actions">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem variant="destructive" onClick={askDelete}>
                    <Trash2 /> Delete article
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        }
      />

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <Panel className="p-6 sm:p-8">
          <input
            aria-label="Article title"
            value={title}
            disabled={readOnly}
            maxLength={200}
            placeholder="Article title, e.g. Refunds and credits"
            onChange={(e) => set({ title: e.target.value })}
            className="w-full border-0 bg-transparent text-3xl leading-10 font-semibold tracking-tight text-ink outline-none placeholder:text-ink-3 disabled:opacity-100"
          />
          <p className="mt-1 text-[13px] text-ink-2">Customers see this when we suggest the article. Name the topic plainly.</p>
          <hr className="my-6 border-line" />
          <textarea
            aria-label="Article content"
            value={body}
            disabled={readOnly}
            placeholder={'Annual plans can be refunded within 14 days of purchase.\n\nAfter that we convert the unused term into account credit.'}
            onChange={(e) => set({ body: e.target.value })}
            className="block min-h-[26rem] w-full resize-y rounded-control border-0 bg-transparent p-0 text-base leading-7 text-ink outline-none placeholder:text-ink-3 disabled:opacity-100"
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
        </Panel>

        <Panel className="divide-y divide-line lg:sticky lg:top-4 [&>*]:p-5">
          <RailSection title="Category">
            <Select value={value.category ? String(value.category) : NONE} disabled={readOnly} onValueChange={(v) => set({ category: v === NONE ? null : Number(v) })}>
              <SelectTrigger aria-label="Category" className="h-10 w-full">
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
            <p className="mt-2 text-[13px] leading-5 text-ink-2">Articles in a ticket&apos;s category get a small boost when the AI picks what to read.</p>
          </RailSection>

          <RailSection title="Visibility">
            <VisibilityPicker value={visibility} disabled={readOnly} onChange={(v: Visibility) => set(flagsFor(v))} />
          </RailSection>

          <div>
            <Fold icon={Bot} title="How the AI will read this" meta={`${passages.length} ${passages.length === 1 ? 'passage' : 'passages'}`}>
              <p className="mb-3 text-[13px] leading-5 text-ink-2">Your article is cut into passages. For each ticket the AI is given the most relevant ones and cites the article.</p>
              {passages.length === 0 ? (
                <p className="rounded-control border border-dashed border-line-strong p-4 text-center text-xs text-ink-3">Start writing to see the passages appear here.</p>
              ) : (
                <ol className="scroll-quiet max-h-80 space-y-2 overflow-y-auto">
                  {passages.map((p, i) => (
                    <li key={i} className="rounded-control bg-surface-2 p-3">
                      <p className="mb-1 text-[11px] font-semibold text-ink-3">
                        Passage {i + 1} of {passages.length}
                      </p>
                      <p className="line-clamp-5 text-xs leading-relaxed whitespace-pre-line text-ink-2">{p}</p>
                    </li>
                  ))}
                </ol>
              )}
            </Fold>
          </div>

          {!readOnly && (
            <div>
              <Fold icon={Lightbulb} title="Writing tips">
                <ul className="space-y-2">
                  {TIPS.map((t) => (
                    <li key={t} className="text-[13px] leading-5 text-ink-2">
                      {t}
                    </li>
                  ))}
                </ul>
              </Fold>
            </div>
          )}
        </Panel>
      </div>

      {!readOnly && <SaveBar dirty={dirty} saving={save.isPending} saved={saved} error={save.error} disabled={!valid} onSave={() => save.mutate()} onDiscard={() => setDraft({})} />}
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
