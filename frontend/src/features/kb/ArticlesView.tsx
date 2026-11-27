import { useQuery } from '@tanstack/react-query'
import { BookOpen, Globe, Lock, PencilLine, Plus, Search, X } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useWorkspace } from '@/auth/workspace'
import { ErrorState, Skeleton } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Message, NoMatches } from '@/features/inbox/ListStates'
import { StatTile } from '@/features/inbox/StatTile'
import { ARTICLE_COLUMNS } from '@/features/inbox/table-columns'
import { TableSkeleton } from '@/features/inbox/TableSkeleton'

import { ArticleTable } from './ArticleTable'
import { HowItWorks } from './HowItWorks'
import { visibilityOf, type Visibility } from './kb-utils'

const ALL = '__all__'

/** The Articles tab: three visibility tiles that filter, a search box and category filter, the article table, and a collapsed "how it works". */
export function ArticlesView() {
  const { slug, api, manager } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const base = `/w/${slug}/agent/knowledge`
  const vis = (['public', 'staff', 'draft'] as const).find((v) => v === params.get('show')) ?? null
  const q = params.get('q') ?? ''
  const cat = params.get('cat') ?? ALL
  const patch = (changes: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(changes)) {
          if (v) next.set(k, v)
          else next.delete(k)
        }
        return next
      },
      { replace: true },
    )

  const clearFilters = () => patch({ show: null, q: null, cat: null })

  // While anything is still being embedded, poll so "Indexing" flips to "AI ready" on its own.
  const list = useQuery({ queryKey: ['articles', slug], queryFn: api.articles, refetchInterval: (query) => (query.state.data?.some((a) => a.is_published && !a.indexed) ? 4000 : false) })
  const categories = useQuery({ queryKey: ['categories', slug], queryFn: api.categories, staleTime: 60_000 })
  const articles = useMemo(() => list.data ?? [], [list.data])

  const counts = useMemo(() => {
    const c: Record<Visibility, number> = { public: 0, staff: 0, draft: 0 }
    for (const a of articles) c[visibilityOf(a)]++
    return c
  }, [articles])

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return articles.filter((a) => (!vis || visibilityOf(a) === vis) && (cat === ALL || String(a.category) === cat) && (!needle || `${a.title} ${a.excerpt}`.toLowerCase().includes(needle)))
  }, [articles, vis, cat, q])
  const filtered = !!vis || cat !== ALL || !!q.trim()

  if (list.isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-panel sm:h-[158px]" />
          ))}
        </div>
        <TableSkeleton columns={ARTICLE_COLUMNS} caption="Loading articles" />
      </div>
    )
  }
  if (list.isError) return <ErrorState error={list.error} onRetry={() => list.refetch()} />

  if (articles.length === 0) {
    return (
      <div className="space-y-6">
        <Message
          icon={BookOpen}
          hue="lav"
          title="Teach the AI your answers"
          actions={
            manager ? (
              <Button asChild>
                <Link to={`${base}/new`}>
                  <Plus /> Write your first article
                </Link>
              </Button>
            ) : undefined
          }
        >
          Start with the questions customers ask most: refunds, delivery times, how to reset a password. One short article per topic.
        </Message>
        <HowItWorks open />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-3" role="group" aria-label="Articles by visibility. Select one to filter the list">
        <StatTile icon={Globe} hue="mint" label="Public" value={counts.public} foot="Customers and the AI" active={vis === 'public'} onPick={() => patch({ show: vis === 'public' ? null : 'public' })} />
        <StatTile icon={Lock} hue="butter" label="Staff only" value={counts.staff} foot="The AI follows, never quotes" active={vis === 'staff'} onPick={() => patch({ show: vis === 'staff' ? null : 'staff' })} />
        <StatTile icon={PencilLine} hue="slate" label="Drafts" value={counts.draft} foot="Not used yet" active={vis === 'draft'} onPick={() => patch({ show: vis === 'draft' ? null : 'draft' })} />
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1 basis-64 sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
            <input
              type="search"
              value={q}
              onChange={(e) => patch({ q: e.target.value || null })}
              placeholder="Search articles"
              aria-label="Search articles"
              className="h-10 w-full rounded-control border border-line-strong bg-surface pr-9 pl-10 text-sm text-ink shadow-card outline-none placeholder:text-ink-3 focus:border-violet focus:ring-2 focus:ring-violet/30 [&::-webkit-search-cancel-button]:hidden"
            />
            {q && (
              <button type="button" onClick={() => patch({ q: null })} aria-label="Clear search" className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-3 hover:bg-sunken hover:text-ink focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none">
                <X className="size-3.5" aria-hidden />
              </button>
            )}
          </div>
          {!!categories.data?.length && (
            <Select value={cat} onValueChange={(v) => patch({ cat: v === ALL ? null : v })}>
              <SelectTrigger aria-label="Filter by category" className="h-10 w-52 border-line-strong bg-surface shadow-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {categories.data.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {filtered && (
            <button type="button" onClick={clearFilters} className="inline-flex h-10 items-center gap-1.5 rounded-control px-3 text-sm font-semibold text-ink-2 hover:bg-sunken hover:text-ink focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none">
              <X className="size-4" aria-hidden /> Clear filters
            </button>
          )}
        </div>
        {shown.length === 0 ? (
          <NoMatches what="articles" onClear={clearFilters} />
        ) : (
          <ArticleTable articles={shown} basePath={base} />
        )}
      </div>

      <HowItWorks />
    </div>
  )
}
