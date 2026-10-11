import { useQuery } from '@tanstack/react-query'
import { BookOpen } from 'lucide-react'

import { BookCard } from '@/components/author/BookCard'
import { PageHeader } from '@/components/common'
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components/states'
import { booksApi } from '@/lib/endpoints'

export function BooksPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['books'], queryFn: booksApi.list })
  const live = data?.filter((b) => b.is_published) ?? []
  const production = data?.filter((b) => !b.is_published) ?? []

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
        <div className="space-y-8">
          {live.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <span className="size-2 rounded-full bg-emerald-500" /> Live on stores
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700 ring-1 ring-emerald-600/20 ring-inset">{live.length}</span>
              </h2>
              <div className="grid gap-5 lg:grid-cols-2">
                {live.map((b) => (
                  <BookCard key={b.id} book={b} />
                ))}
              </div>
            </section>
          )}
          {production.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <span className="size-2 rounded-full bg-amber-500" /> In production
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800 ring-1 ring-amber-600/20 ring-inset">{production.length}</span>
              </h2>
              <div className="grid gap-5 lg:grid-cols-2">
                {production.map((b) => (
                  <BookCard key={b.id} book={b} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
