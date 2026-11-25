import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Lock, Plus, Search, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { PageHeader } from '@/components/common'
import { ConfirmDialog, type ConfirmOptions } from '@/components/ConfirmDialog'
import { KbEditor } from '@/components/dashboard/kb-editor'
import { KbIntro } from '@/components/dashboard/kb-intro'
import { ArticleCard, KbStats } from '@/components/dashboard/kb-parts'
import { KbPlayground } from '@/components/dashboard/kb-playground'
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { errorMessage } from '@/lib/api'

const ALL = '__all__'

export function KnowledgePage() {
  const { slug, api, manager } = useWorkspace()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  const [filter, setFilter] = useState('')
  const [category, setCategory] = useState(ALL)

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
    const seen = new Map<number, string>()
    articles.forEach((a) => a.category && a.category_name && seen.set(a.category, a.category_name))
    return [...seen.entries()]
  }, [articles])
  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    return articles.filter((a) => (category === ALL || String(a.category) === category) && (!needle || `${a.title} ${a.excerpt}`.toLowerCase().includes(needle)))
  }, [articles, filter, category])

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Knowledge base"
        description="The articles behind every AI draft and every self-service suggestion your customers see."
        actions={
          manager && (
            <Button onClick={() => setEditing('new')}>
              <Plus /> New article
            </Button>
          )
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
          <KbStats articles={articles} />
          <KbPlayground />

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <h2 className="text-base font-semibold sm:mr-auto">
              Articles <span className="ml-1 text-sm font-normal text-muted-foreground">{shown.length === articles.length ? articles.length : `${shown.length} of ${articles.length}`}</span>
            </h2>
            <div className="relative sm:w-64">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter articles" aria-label="Filter articles" className="pl-9" />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="sm:w-48" aria-label="Filter by category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {categories.map(([id, name]) => (
                  <SelectItem key={id} value={String(id)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {articles.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Teach the AI your answers"
              description="Start with the questions customers ask most: refunds, delivery times, how to reset a password. One short article per topic."
              action={manager ? <Button onClick={() => setEditing('new')}><Plus /> Write your first article</Button> : undefined}
            />
          ) : shown.length === 0 ? (
            <EmptyState icon={SearchX} title="No articles match" description="Try a different word or clear the category filter." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
        </>
      )}

      <KbEditor key={String(editing)} articleId={editing} readOnly={!manager} onClose={() => setEditing(null)} />
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
