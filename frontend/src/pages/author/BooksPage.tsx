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
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">Live ({live.length})</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {live.map((b) => (
                  <BookCard key={b.id} book={b} />
                ))}
              </div>
            </section>
          )}
          {production.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">In production ({production.length})</h2>
              <div className="grid gap-4 md:grid-cols-2">
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
