import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Layers, Lock, Plus, Search, SearchX, Tags } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { PageHeader } from '@/components/common'
import { ConfirmDialog, type ConfirmOptions } from '@/components/ConfirmDialog'
import { KbEditor } from '@/components/dashboard/kb-editor'
import { KbIntro } from '@/components/dashboard/kb-intro'
import { ArticleCard, KbStats, type StatusFilter } from '@/components/dashboard/kb-parts'
import { KbPlayground } from '@/components/dashboard/kb-playground'
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { errorMessage } from '@/lib/api'
import { categoryTone } from '@/lib/constants'

const ALL = '__all__'

export function KnowledgePage() {
  const { slug, api, manager } = useWorkspace()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  const [filter, setFilter] = useState('')
  const [category, setCategory] = useState(ALL)
  const [status, setStatus] = useState<StatusFilter>('all')

  const list = useQuery({ queryKey: ['articles', slug], queryFn: api.articles })
  const remove = useMutation({
    mutationFn: (id: number) => api.deleteArticle(id),
    onSuccess: () => {
      toast.success('Article deleted')
      queryClient.invalidateQueries({ queryKey: ['articles', slug] })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const articles = useMemo(() => list.data ?? [], [list.data])
  const categories = useMemo(() => {
    const seen = new Map<number, { name: string; count: number }>()
    articles.forEach((a) => {
      if (!a.category || !a.category_name) return
      const cur = seen.get(a.category)
      seen.set(a.category, { name: a.category_name, count: (cur?.count ?? 0) + 1 })
    })
    return [...seen.entries()]
  }, [articles])
  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    const ok = (a: (typeof articles)[number]) => status === 'all' || (status === 'internal' ? a.is_internal : status === 'draft' ? !a.is_published : !a.indexed)
    return articles.filter((a) => ok(a) && (category === ALL || String(a.category) === category) && (!needle || `${a.title} ${a.excerpt}`.toLowerCase().includes(needle)))
  }, [articles, filter, category, status])

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Knowledge base"
        description="The articles behind every AI draft and every self-service suggestion your customers see."
        actions={
          <>
            {manager && (
              <Button variant="outline" size="lg" asChild>
                <Link to={`/w/${slug}/agent/settings?tab=categories`}>
                  <Tags /> Manage categories
                </Link>
              </Button>
            )}
            {manager && (
              <Button size="lg" onClick={() => setEditing('new')}>
                <Plus /> New article
              </Button>
            )}
          </>
        }
      />
      {!manager && (
        <p className="mb-5 flex items-center gap-2 rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <Lock className="size-4 shrink-0" /> You can read every article. Only workspace owners and admins can add or edit them.
        </p>
      )}

      <KbIntro />

      {list.isLoading ? (
        <CardGridSkeleton count={6} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : (
        <>
          <KbStats articles={articles} status={status} onStatus={setStatus} />
          <KbPlayground />

          <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start">
            <nav aria-label="Categories" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:sticky lg:top-6 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
              <p className="hidden px-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase lg:block">Categories</p>
              {[[ALL, { name: 'All articles', count: articles.length }] as const, ...categories].map(([id, c]) => {
                const key = String(id)
                const on = category === key
                return (
                  <button key={key} type="button" aria-pressed={on} onClick={() => setCategory(key)} className={cn('flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium whitespace-nowrap transition-colors lg:w-full', on ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground')}>
                    {key === ALL ? <Layers className={cn('size-4', on && 'text-primary')} /> : <span className={cn('size-2.5 rounded-full', categoryTone(key, c.name).dot)} />}
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-xs tabular-nums opacity-70">{c.count}</span>
                  </button>
                )
              })}
            </nav>

            <div className="min-w-0">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <h2 className="text-lg font-semibold sm:mr-auto">
                  Articles <span className="ml-1 text-sm font-normal text-muted-foreground">{shown.length === articles.length ? articles.length : `${shown.length} of ${articles.length}`}</span>
                </h2>
                <div className="relative sm:w-72">
                  <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search articles" aria-label="Search articles" className="h-10 pl-9" />
                </div>
              </div>
              {status !== 'all' && (
                <p className="mb-4 flex items-center gap-2 rounded-lg bg-primary/5 px-3.5 py-2.5 text-sm">
                  Showing <span className="font-semibold">{status === 'internal' ? 'internal-only' : status === 'draft' ? 'draft' : 'not-yet-indexed'}</span> articles.
                  <button type="button" className="ml-auto font-medium text-primary hover:underline" onClick={() => setStatus('all')}>Clear</button>
                </p>
              )}

              {articles.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="Teach the AI your answers"
                  description="Start with the questions customers ask most: refunds, delivery times, how to reset a password. One short article per topic."
                  action={manager ? <Button onClick={() => setEditing('new')}><Plus /> Write your first article</Button> : undefined}
                />
              ) : shown.length === 0 ? (
                <EmptyState icon={SearchX} title="No articles match" description="Try a different word or clear the filters." />
              ) : (
                <div className="space-y-3">
                  {shown.map((a) => (
                    <ArticleCard
                      key={a.id}
                      a={a}
                      canEdit={manager}
                      onOpen={() => setEditing(a.id)}
                      onDelete={() => setConfirm({ title: 'Delete article?', description: `"${a.title}" will no longer be used in AI drafts or suggestions.`, confirmLabel: 'Delete', destructive: true, onConfirm: () => remove.mutate(a.id) })}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <KbEditor key={String(editing)} articleId={editing} readOnly={!manager} onClose={() => setEditing(null)} />
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
