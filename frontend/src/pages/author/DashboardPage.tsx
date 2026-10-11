import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  ChevronRight,
  IndianRupee,
  LifeBuoy,
  MessageCircleReply,
  MessageSquareText,
  Plus,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { BookCover, StageProgress } from '@/components/author/BookCard'
import { BookStatusBadge, StatusBadge } from '@/components/badges'
import { RelativeTime, Stat } from '@/components/common'
import { ErrorState, ListSkeleton } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/auth/AuthContext'
import { booksApi, ticketsApi } from '@/lib/endpoints'
import { STATUS_META } from '@/lib/constants'
import { firstName, formatDate, formatINR, formatNumber } from '@/lib/format'
import type { AuthorSummary, AuthorTicket, Book } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function Hero({ name, summary }: { name: string; summary?: AuthorSummary }) {
  const pending = Number(summary?.total_royalty_pending ?? 0)
  const belowThreshold = summary && pending > 0 && pending < Number(summary.min_payout_threshold)
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-700 p-6 text-white shadow-lg shadow-emerald-900/10 sm:p-8">
      <span className="absolute -top-16 -right-16 size-64 rounded-full bg-white/10" />
      <span className="absolute -bottom-24 right-40 size-56 rounded-full bg-white/5" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-100">{greeting()},</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{name}</h1>
          <p className="mt-2 max-w-md text-sm text-emerald-50/90">
            Here's how your books are doing and what's happening with your requests.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild className="bg-white text-emerald-800 shadow-none hover:bg-emerald-50">
              <Link to="/author/tickets/new">
                <LifeBuoy /> Get help
              </Link>
            </Button>
            <Button asChild variant="ghost" className="text-white hover:bg-white/15 hover:text-white">
              <Link to="/author/books">
                View my books <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>

        {summary && (
          <div className="rounded-2xl bg-white/12 p-5 ring-1 ring-white/20 backdrop-blur-sm lg:min-w-80">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-emerald-100 uppercase">
              <CalendarClock className="size-4" /> Next royalty payout
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{formatINR(summary.total_royalty_pending)}</p>
            <p className="mt-1 text-sm text-emerald-50/90">
              {pending === 0
                ? 'You are fully paid up.'
                : belowThreshold
                  ? 'Below the ₹1,000 minimum; rolls over to next quarter.'
                  : `${summary.next_payout.quarter} payout, by ${formatDate(summary.next_payout.payout_by)}`}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

function BookTile({ book }: { book: Book }) {
  return (
    <Link
      to="/author/books"
      className="group flex gap-4 rounded-2xl border bg-card p-4 shadow-xs transition-all hover:-translate-y-px hover:shadow-md"
    >
      <BookCover book={book} className="w-16" compact />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 font-semibold leading-snug">{book.title}</p>
          <BookStatusBadge status={book.status} published={book.is_published} size="sm" />
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{book.genre}</p>
        {book.is_published ? (
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Sold</p>
              <p className="mt-0.5 text-sm font-semibold">{formatNumber(book.total_copies_sold)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Earned</p>
              <p className="mt-0.5 text-sm font-semibold">{formatINR(book.total_royalty_earned)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Pending</p>
              <p className="mt-0.5 text-sm font-semibold text-amber-700">{formatINR(book.royalty_pending)}</p>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <StageProgress book={book} compact />
          </div>
        )}
      </div>
    </Link>
  )
}

function RecentRequests({ tickets }: { tickets: AuthorTicket[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <ul className="divide-y">
        {tickets.map((t) => {
          const meta = STATUS_META[t.status]
          const Icon = meta.icon
          return (
            <li key={t.id}>
              <Link to={`/author/tickets/${t.id}`} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40">
                <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', meta.tint)}>
                  <Icon className={cn('size-[18px]', meta.iconClass)} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={cn('truncate text-sm', t.has_unread ? 'font-semibold' : 'font-medium')}>{t.subject}</p>
                    {t.has_unread && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="New reply" />}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    <span className="font-mono">{t.reference}</span>
                    <span className="mx-1.5">·</span>
                    {t.book ? t.book.title : 'General'}
                    <span className="mx-1.5">·</span>
                    <RelativeTime value={t.updated_at} />
                  </p>
                </div>
                <StatusBadge status={t.status} audience="author" size="sm" />
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          )
        })}
      </ul>
      <Link
        to="/author/tickets/new"
        className="flex items-center justify-center gap-2 border-t bg-muted/20 px-5 py-3 text-sm font-medium text-primary transition-colors hover:bg-muted/40"
      >
        <Plus className="size-4" /> Raise a new request
      </Link>
    </div>
  )
}

function SectionHeader({ title, to, icon: Icon }: { title: string; to: string; icon: typeof BookOpen }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 font-semibold">
        <Icon className="size-4 text-primary" /> {title}
      </h2>
      <Button asChild variant="ghost" size="sm">
        <Link to={to}>
          View all <ArrowRight />
        </Link>
      </Button>
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const refetchInterval = useFallbackInterval()
  const summary = useQuery({ queryKey: ['summary'], queryFn: booksApi.summary })
  const books = useQuery({ queryKey: ['books'], queryFn: booksApi.list })
  const tickets = useQuery({ queryKey: ['tickets', 'author', 'all'], queryFn: () => ticketsApi.listAuthor(), refetchInterval })

  const s = summary.data
  const unread = tickets.data?.results.filter((t) => t.has_unread) ?? []
  const recent = tickets.data?.results.slice(0, 4) ?? []

  return (
    <div className="space-y-6">
      <Hero name={firstName(user?.full_name)} summary={s} />

      {summary.isError ? (
        <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
      ) : !s ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Books published"
            value={s.books_published}
            hint={s.books_in_production ? `${s.books_in_production} more in production` : 'All books live'}
            icon={<BookOpen className="size-4" />}
            accent="blue"
          />
          <Stat label="Copies sold" value={formatNumber(s.total_copies_sold)} hint="Across all platforms" icon={<TrendingUp className="size-4" />} accent="violet" />
          <Stat
            label="Royalty earned"
            value={formatINR(s.total_royalty_earned)}
            hint={`${formatINR(s.total_royalty_paid)} paid to you`}
            icon={<IndianRupee className="size-4" />}
            accent="green"
          />
          <Stat
            label="Royalty pending"
            value={formatINR(s.total_royalty_pending)}
            hint={Number(s.total_royalty_pending) > 0 ? `Paid by ${formatDate(s.next_payout.payout_by)}` : 'Fully paid up'}
            icon={<Wallet className="size-4" />}
            accent={Number(s.total_royalty_pending) > 0 ? 'amber' : 'green'}
          />
        </div>
      )}

      {unread.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/[0.06] p-4 sm:flex-row sm:items-center">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <MessageCircleReply className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              BookLeaf replied to {unread.length} {unread.length === 1 ? 'request' : 'requests'}
            </p>
            <p className="truncate text-sm text-muted-foreground">{unread.map((t) => t.subject).join(' · ')}</p>
          </div>
          <Button asChild size="sm">
            <Link to={`/author/tickets/${unread[0].id}`}>
              Read reply <ChevronRight />
            </Link>
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section>
          <SectionHeader title="My books" to="/author/books" icon={BookOpen} />
          {books.isLoading ? (
            <ListSkeleton rows={2} />
          ) : books.isError ? (
            <ErrorState error={books.error} onRetry={() => books.refetch()} />
          ) : (
            <div className="space-y-3">
              {books.data?.map((b) => (
                <BookTile key={b.id} book={b} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeader title="Recent requests" to="/author/tickets" icon={MessageSquareText} />
          {tickets.isLoading ? (
            <ListSkeleton rows={3} />
          ) : tickets.isError ? (
            <ErrorState error={tickets.error} onRetry={() => tickets.refetch()} />
          ) : recent.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
              <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MessageSquareText className="size-5" />
              </span>
              <p className="mt-3 font-medium">No requests yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Questions about royalties, ISBNs, printing or distribution? We usually reply within a day.
              </p>
              <Button asChild className="mt-4">
                <Link to="/author/tickets/new">
                  <LifeBuoy /> Raise a request
                </Link>
              </Button>
            </div>
          ) : (
            <RecentRequests tickets={recent} />
          )}
        </section>
      </div>
    </div>
  )
}
