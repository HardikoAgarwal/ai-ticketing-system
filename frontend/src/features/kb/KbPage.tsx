import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, FlaskConical, Lock, Plus, Tags } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { ConfirmDialog, type ConfirmOptions } from '@/components/ConfirmDialog'
import { ErrorState, SkeletonRows } from '@/components/ds'
import { useRegisterCommands, type Command } from '@/components/shell/commands'
import { useShortcut } from '@/components/shell/shortcuts'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/api'
import { PageHeader } from '@/features/shared/PageHeader'

import { ArticleEditor } from './ArticleEditor'
import { ArticleList } from './ArticleList'
import { KbOverview } from './KbOverview'
import { KbStats } from './KbStats'
import { ALL_CATEGORIES, type StatusFilter } from './kb-utils'

/** Knowledge base: stat strip, then a list pane and a detail pane (editor, or the "how it works" overview + AI search test). */
export function KnowledgePage() {
  const { slug, api, manager } = useWorkspace()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  const [filter, setFilter] = useState('')
  const [category, setCategory] = useState(ALL_CATEGORIES)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [dirty, setDirty] = useState(false)

  const raw = params.get('article')
  const selected: number | 'new' | null = raw === 'new' ? (manager ? 'new' : null) : raw && Number.isFinite(Number(raw)) ? Number(raw) : null

  // While anything is still being embedded, poll so "Indexing" flips to "AI ready" on its own.
  const list = useQuery({ queryKey: ['articles', slug], queryFn: api.articles, refetchInterval: (q) => (q.state.data?.some((a) => !a.indexed) ? 4000 : false) })
  const articles = useMemo(() => list.data ?? [], [list.data])

  const go = useCallback(
    (next: number | 'new' | null) => {
      setParams(next === null ? {} : { article: String(next) }, { replace: true })
    },
    [setParams],
  )
  /** Navigate between articles, asking first when the open one has unsaved edits. */
  const request = useCallback(
    (next: number | 'new' | null) => {
      if (next === selected) return
      if (!dirty) return go(next)
      setConfirm({
        title: 'Discard unsaved changes?',
        description: 'You have edits in this article that have not been saved. They will be lost.',
        confirmLabel: 'Discard changes',
        destructive: true,
        onConfirm: () => {
          setDirty(false)
          go(next)
        },
      })
    },
    [dirty, go, selected],
  )

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const remove = useMutation({
    mutationFn: (id: number) => api.deleteArticle(id),
    onSuccess: (_d, id) => {
      toast.success('Article deleted')
      queryClient.invalidateQueries({ queryKey: ['articles', slug] })
      if (selected === id) {
        setDirty(false)
        go(null)
      }
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
  const askDelete = (id: number, title: string) =>
    setConfirm({ title: 'Delete article?', description: `"${title || 'This article'}" will no longer be used in AI drafts or suggestions. This can't be undone.`, confirmLabel: 'Delete', destructive: true, onConfirm: () => remove.mutate(id) })

  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    const ok = (a: (typeof articles)[number]) => status === 'all' || (status === 'internal' ? a.is_internal : status === 'draft' ? !a.is_published : !a.indexed)
    return articles.filter((a) => ok(a) && (category === ALL_CATEGORIES || String(a.category) === category) && (!needle || `${a.title} ${a.excerpt}`.toLowerCase().includes(needle)))
  }, [articles, filter, category, status])

  const commands = useMemo<Command[]>(
    () => [
      { id: 'kb.new', title: 'New knowledge article', group: 'Knowledge', icon: Plus, keywords: ['write', 'create', 'article'], shortcut: 'n', when: manager, perform: () => request('new') },
      { id: 'kb.test', title: 'Test what the AI would read', group: 'Knowledge', icon: FlaskConical, keywords: ['search', 'retrieval', 'playground'], perform: () => request(null) },
    ],
    [manager, request],
  )
  useRegisterCommands(commands)
  useShortcut('n', () => request('new'), { description: 'New article', group: 'Knowledge', enabled: manager })

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={BookOpen}
        title="Knowledge base"
        description="The articles behind every AI draft and every self-service suggestion your customers see."
        actions={
          <>
            <Button variant="outline" onClick={() => request(null)}>
              <FlaskConical /> Test AI search
            </Button>
            {manager && (
              <Button variant="outline" asChild>
                <Link to={`/w/${slug}/agent/settings?tab=categories`}>
                  <Tags /> Categories
                </Link>
              </Button>
            )}
            {manager && (
              <Button onClick={() => request('new')}>
                <Plus /> New article
              </Button>
            )}
          </>
        }
      />
      {!manager && (
        <p className="flex items-center gap-2 rounded-control border border-line bg-surface-2 px-4 py-3 text-sm text-ink-2">
          <Lock className="size-4 shrink-0" aria-hidden /> You can read every article. Only workspace owners and admins can add or edit them.
        </p>
      )}

      {list.isLoading ? (
        <SkeletonRows rows={5} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : (
        <>
          <KbStats articles={articles} status={status} onStatus={setStatus} />
          {articles.length === 0 && selected === null ? (
            <KbOverview empty canEdit={manager} onNew={() => request('new')} />
          ) : (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:h-[calc(100svh-22rem)] lg:min-h-[34rem] lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
              <div className={selected !== null ? 'hidden min-h-0 min-w-0 lg:flex lg:flex-col' : 'flex min-h-0 min-w-0 flex-col max-lg:h-[32rem]'}>
                <ArticleList articles={articles} shown={shown} selected={selected} filter={filter} onFilter={setFilter} category={category} onCategory={setCategory} status={status} onStatus={setStatus} onOpen={request} />
              </div>
              <div className={selected === null ? 'scroll-quiet hidden min-h-0 min-w-0 lg:block lg:overflow-y-auto' : 'min-h-0 min-w-0'}>
                {selected !== null ? (
                  <ArticleEditor key={String(selected)} articleId={selected} readOnly={!manager} onClose={() => request(null)} onDirty={setDirty} onCreated={(id) => go(id)} onDelete={askDelete} />
                ) : (
                  <KbOverview empty={false} canEdit={manager} onNew={() => request('new')} />
                )}
              </div>
            </div>
          )}
        </>
      )}
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
