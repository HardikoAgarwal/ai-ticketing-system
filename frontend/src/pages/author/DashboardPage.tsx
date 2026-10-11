import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, IndianRupee, LifeBuoy, MessageSquareText, TrendingUp, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'

import { StageProgress } from '@/components/author/BookCard'
import { TicketRow } from '@/components/author/TicketRow'
import { PageHeader, Stat } from '@/components/common'
import { ErrorState, ListSkeleton } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/auth/AuthContext'
import { booksApi, ticketsApi } from '@/lib/endpoints'
import { firstName, formatDate, formatINR, formatNumber } from '@/lib/format'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export function DashboardPage() {
  const { user } = useAuth()
  const refetchInterval = useFallbackInterval()
  const summary = useQuery({ queryKey: ['summary'], queryFn: booksApi.summary })
  const books = useQuery({ queryKey: ['books'], queryFn: booksApi.list })
  const tickets = useQuery({ queryKey: ['tickets', 'author', 'all'], queryFn: () => ticketsApi.listAuthor(), refetchInterval })

  const s = summary.data
  const unread = tickets.data?.results.filter((t) => t.has_unread) ?? []
  const inProduction = books.data?.filter((b) => !b.is_published) ?? []
  const recent = tickets.data?.results.slice(0, 3) ?? []
  const pending = Number(s?.total_royalty_pending ?? 0)
  const belowThreshold = s && pending > 0 && pending < Number(s.min_payout_threshold)

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${firstName(user?.full_name)}`}
        description="Here's how your books are doing and what's happening with your requests."
      />

      {summary.isError ? (
        <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
      ) : !s ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Books published"
            value={s.books_published}
            hint={s.books_in_production ? `${s.books_in_production} in production` : 'All books live'}
            icon={<BookOpen className="size-4" />}
          />
          <Stat label="Copies sold" value={formatNumber(s.total_copies_sold)} hint="Across all platforms" icon={<TrendingUp className="size-4" />} />
          <Stat
            label="Royalty earned"
            value={formatINR(s.total_royalty_earned)}
            hint={`${formatINR(s.total_royalty_paid)} paid to you`}
            icon={<IndianRupee className="size-4" />}
          />
          <Stat
            label="Royalty pending"
            value={formatINR(s.total_royalty_pending)}
            tone={pending > 0 ? 'warning' : 'success'}
            hint={
              pending === 0
                ? 'You are fully paid up'
                : belowThreshold
                  ? 'Below ₹1,000 minimum; rolls over to next quarter'
                  : `Next payout window: ${s.next_payout.quarter}, by ${formatDate(s.next_payout.payout_by)}`
            }
            icon={<Wallet className="size-4" />}
          />
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Your recent requests</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/author/tickets">
                View all <ArrowRight />
              </Link>
            </Button>
          </div>
          {tickets.isLoading ? (
            <ListSkeleton rows={3} />
          ) : tickets.isError ? (
            <ErrorState error={tickets.error} onRetry={() => tickets.refetch()} />
          ) : recent.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card p-6 text-center">
              <MessageSquareText className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">No requests yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Questions about royalties, ISBNs, printing or distribution? We usually reply within a day.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((t) => (
                <TicketRow key={t.id} ticket={t} />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          {unread.length > 0 && (
            <div className="rounded-xl border border-primary/30 bg-accent/40 p-4">
              <p className="text-sm font-semibold">BookLeaf replied</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {unread.length} {unread.length === 1 ? 'request has' : 'requests have'} a new reply.
              </p>
              <div className="mt-3 space-y-1">
                {unread.map((t) => (
                  <Link key={t.id} to={`/author/tickets/${t.id}`} className="block truncate text-sm font-medium text-primary hover:underline">
                    {t.subject}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {inProduction.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm font-semibold">In production</p>
              <div className="mt-3 space-y-4">
                {inProduction.map((b) => (
                  <div key={b.id}>
                    <p className="mb-2 truncate text-sm">{b.title}</p>
                    <StageProgress book={b} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm font-semibold">Need a hand?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Raise a request about any book or your account. You'll see our reply here the moment it's sent.
            </p>
            <Button asChild className="mt-3 w-full" variant="outline">
              <Link to="/author/tickets/new">
                <LifeBuoy /> Get help
              </Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
