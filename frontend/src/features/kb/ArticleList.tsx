import { CheckCircle2, FileText, Loader2, Lock, Search, SearchX } from 'lucide-react'
import { useMemo } from 'react'

import { RelativeTime } from '@/components/common'
import { Chip, EmptyState, Panel } from '@/components/ds'
import { Input } from '@/components/ui/input'
import { categoryTone } from '@/lib/constants'
import type { ArticleListItem } from '@/lib/types'
import { cn } from '@/lib/utils'

import { ALL_CATEGORIES, type StatusFilter } from './kb-utils'

const STATUS_LABEL: Record<StatusFilter, string> = { all: '', internal: 'internal-only', draft: 'draft', unindexed: 'still-indexing' }

export function ArticleList({ articles, shown, selected, filter, onFilter, category, onCategory, status, onStatus, onOpen }: {
  articles: ArticleListItem[]
  shown: ArticleListItem[]
  selected: number | 'new' | null
  filter: string
  onFilter: (v: string) => void
  category: string
  onCategory: (v: string) => void
  status: StatusFilter
  onStatus: (s: StatusFilter) => void
  onOpen: (id: number) => void
}) {
  const categories = useMemo(() => {
    const seen = new Map<number, { name: string; count: number }>()
    articles.forEach((a) => {
      if (!a.category || !a.category_name) return
      seen.set(a.category, { name: a.category_name, count: (seen.get(a.category)?.count ?? 0) + 1 })
    })
    return [...seen.entries()]
  }, [articles])

  return (
    <Panel className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="space-y-3 border-b border-line p-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <Input value={filter} onChange={(e) => onFilter(e.target.value)} placeholder="Search articles" aria-label="Search articles" className="h-9 pl-9" />
        </div>
        {categories.length > 0 && (
          <nav aria-label="Categories" className="scroll-quiet -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5 [&::-webkit-scrollbar]:hidden">
            {[[ALL_CATEGORIES, { name: 'All', count: articles.length }] as const, ...categories].map(([id, c]) => {
              const key = String(id)
              const on = category === key
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onCategory(key)}
                  className={cn(
                    'flex h-8 shrink-0 items-center gap-1.5 rounded-chip border px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                    on ? 'border-ink bg-ink text-canvas' : 'border-line bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink',
                  )}
                >
                  {key !== ALL_CATEGORIES && <span className={cn('size-2 rounded-full', categoryTone(key, c.name).dot)} aria-hidden />}
                  {c.name}
                  <span className={cn('text-xs tabular-nums', on ? 'text-canvas/70' : 'text-ink-3')}>{c.count}</span>
                </button>
              )
            })}
          </nav>
        )}
        {status !== 'all' && (
          <p className="flex items-center gap-2 rounded-control bg-violet-soft px-3 py-2 text-[13px] text-ink">
            Showing {STATUS_LABEL[status]} articles
            <button type="button" className="ml-auto font-semibold text-violet hover:underline" onClick={() => onStatus('all')}>
              Clear
            </button>
          </p>
        )}
      </div>

      <p className="px-4 pt-3 pb-1 text-xs font-medium text-ink-3" aria-live="polite">
        {shown.length === articles.length ? `${articles.length} ${articles.length === 1 ? 'article' : 'articles'}` : `${shown.length} of ${articles.length} articles`}
      </p>

      {shown.length === 0 ? (
        <div className="p-3">
          <EmptyState icon={SearchX} title="No articles match" description="Try a different word or clear the filters." />
        </div>
      ) : (
        <ul className="scroll-quiet min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {shown.map((a) => {
            const on = selected === a.id
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onOpen(a.id)}
                  aria-current={on ? 'true' : undefined}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-control p-3 text-left transition-colors',
                    on ? 'bg-violet-soft ring-1 ring-violet/40' : 'hover:bg-surface-2',
                  )}
                >
                  <span className={cn('mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-control', a.is_internal ? 'bg-butter text-butter-ink' : 'bg-sunken text-ink-2')}>
                    {a.is_internal ? <Lock className="size-4" aria-hidden /> : <FileText className="size-4" aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{a.title}</span>
                    <span className="mt-0.5 line-clamp-2 block text-[13px] leading-5 text-ink-2">{a.excerpt}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-1.5">
                      {a.category_name && a.category ? (
                        <Chip size="sm" tone="slate">
                          {a.category_name}
                        </Chip>
                      ) : null}
                      {a.is_internal && (
                        <Chip size="sm" tone="amber" icon={Lock}>
                          Internal
                        </Chip>
                      )}
                      {!a.is_published && (
                        <Chip size="sm" tone="slate">
                          Draft
                        </Chip>
                      )}
                      {!a.indexed ? (
                        <Chip size="sm" tone="amber" icon={Loader2}>
                          Indexing
                        </Chip>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-mint-ink">
                          <CheckCircle2 className="size-3.5" aria-hidden /> AI ready
                        </span>
                      )}
                      <span className="ml-auto text-xs text-ink-3">
                        <RelativeTime value={a.updated_at} />
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
