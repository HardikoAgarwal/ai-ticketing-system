import { useQuery } from '@tanstack/react-query'
import { BookOpen, Factory, Store, type LucideIcon } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { BookCard } from '@/components/author/BookCard'
import { PageHeader } from '@/components/common'
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components/states'
import { booksApi } from '@/lib/endpoints'
import { cn } from '@/lib/utils'

type Tab = 'live' | 'production'

const TABS: Record<Tab, { label: string; hint: string; icon: LucideIcon; active: string; tile: string; count: string }> = {
  live: {
    label: 'Live on stores',
    hint: 'Selling and earning royalties',
    icon: Store,
    active: 'border-emerald-500 ring-4 ring-emerald-500/10',
    tile: 'bg-emerald-100 text-emerald-700',
    count: 'bg-emerald-600 text-white',
  },
  production: {
    label: 'In production',
    hint: 'Being prepared for launch',
    icon: Factory,
    active: 'border-amber-500 ring-4 ring-amber-500/10',
    tile: 'bg-amber-100 text-amber-700',
    count: 'bg-amber-500 text-white',
  },
}

export function BooksPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['books'], queryFn: booksApi.list })
  const [params, setParams] = useSearchParams()
  const live = data?.filter((b) => b.is_published) ?? []
  const production = data?.filter((b) => !b.is_published) ?? []
  const requested = params.get('tab') as Tab | null
  const tab: Tab = requested && requested in TABS ? requested : live.length || !production.length ? 'live' : 'production'
  const books = tab === 'live' ? live : production
  const counts: Record<Tab, number> = { live: live.length, production: production.length }

  return (
    <div>
      <PageHeader title="My Books" description="Sales, royalties and production status for every book you publish with BookLeaf." />
      {isLoading ? (
        <CardGridSkeleton />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState icon={BookOpen} title="No books yet" description="Once your manuscript is received, your book will appear here." />
      ) : (
        <div className="space-y-6">
          <div role="tablist" className="grid gap-4 sm:grid-cols-2">
            {(Object.keys(TABS) as Tab[]).map((key) => {
              const t = TABS[key]
              const Icon = t.icon
              const selected = key === tab
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setParams({ tab: key }, { replace: true })}
                  className={cn(
                    'flex items-center gap-4 rounded-2xl border-2 bg-card p-5 text-left shadow-xs transition-all',
                    selected ? t.active : 'border-transparent hover:border-border',
                  )}
                >
                  <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl', t.tile)}>
                    <Icon className="size-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-semibold">{t.label}</span>
                    <span className="block text-sm text-muted-foreground">{t.hint}</span>
                  </span>
                  <span
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-full text-base font-semibold',
                      selected ? t.count : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {counts[key]}
                  </span>
                </button>
              )
            })}
          </div>

          {books.length === 0 ? (
            <EmptyState
              icon={tab === 'live' ? Store : Factory}
              title={tab === 'live' ? 'No books on stores yet' : 'Nothing in production'}
              description={
                tab === 'live'
                  ? 'Your books will show up here as soon as they go live.'
                  : 'All your books are live. New manuscripts will appear here while they are being prepared.'
              }
            />
          ) : (
            <div className="grid items-stretch gap-6 lg:grid-cols-2">
              {books.map((b) => (
                <BookCard key={b.id} book={b} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
