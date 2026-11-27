import { useQuery } from '@tanstack/react-query'
import { BookOpen, CircleHelp, Globe, Lock, PencilLine, Plus, X } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useWorkspace } from '@/auth/workspace'
import { ErrorState, Skeleton } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { Message, NoMatches } from '@/features/inbox/ListStates'
import { StatTile } from '@/features/inbox/StatTile'
import { ARTICLE_COLUMNS } from '@/features/inbox/table-columns'
import { TableSkeleton } from '@/features/inbox/TableSkeleton'

import { ArticleTable } from './ArticleTable'
import { ALL_CATEGORIES, visibilityOf, type Visibility } from './kb-utils'

/** The Articles tab: three visibility tiles that filter, a search box and category filter, the article table, and a collapsed "how it works". */
export function ArticlesView({ onHow }: { onHow: () => void }) {
  const { slug, api, manager } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const base = `/w/${slug}/agent/knowledge`
  const vis = (['public', 'staff', 'draft'] as const).find((v) => v === params.get('show')) ?? null
  const q = params.get('q') ?? ''
  const cat = params.get('cat') ?? ALL_CATEGORIES
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
  const articles = useMemo(() => list.data ?? [], [list.data])

  const counts = useMemo(() => {
    const c: Record<Visibility, number> = { public: 0, staff: 0, draft: 0 }
    for (const a of articles) c[visibilityOf(a)]++
    return c
  }, [articles])

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return articles.filter((a) => (!vis || visibilityOf(a) === vis) && (cat === ALL_CATEGORIES || String(a.category) === cat) && (!needle || `${a.title} ${a.excerpt}`.toLowerCase().includes(needle)))
  }, [articles, vis, cat, q])
  const filtered = !!vis || cat !== ALL_CATEGORIES || !!q.trim()

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
            <>
              {manager && (
                <Button asChild>
                  <Link to={`${base}/new`}>
                    <Plus /> Write your first article
                  </Link>
                </Button>
              )}
              <Button variant="outline" onClick={onHow}>
                <CircleHelp /> How it works
              </Button>
            </>
          }
        >
          Start with the questions customers ask most: refunds, delivery times, how to reset a password. One short article per topic.
        </Message>
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
        {filtered && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
            Showing filtered results.
            <button type="button" onClick={clearFilters} className="inline-flex h-8 items-center gap-1.5 rounded-control px-2.5 font-semibold text-ink hover:bg-sunken focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none">
              <X className="size-3.5" aria-hidden /> Clear filters
            </button>
          </div>
        )}
        {shown.length === 0 ? <NoMatches what="articles" onClear={clearFilters} /> : <ArticleTable articles={shown} basePath={base} />}
      </div>
    </div>
  )
}
