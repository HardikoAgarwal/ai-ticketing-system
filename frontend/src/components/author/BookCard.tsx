import { Check, Copy, Info, Leaf, MessageCircleQuestion } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { BookStatusBadge } from '@/components/badges'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PLATFORM_STYLES, PRODUCTION_STAGES, coverGradient } from '@/lib/constants'
import { formatDate, formatINR, formatNumber } from '@/lib/format'
import type { Book } from '@/lib/types'
import { cn } from '@/lib/utils'

export function BookCover({
  book,
  className,
  compact,
}: {
  book: Pick<Book, 'id' | 'title'>
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'relative flex aspect-[3/4] shrink-0 flex-col justify-between overflow-hidden rounded-lg bg-gradient-to-br text-white shadow-md',
        compact ? 'p-1.5' : 'p-2.5',
        coverGradient(book.id),
        className,
      )}
      aria-hidden
    >
      <span className="absolute inset-y-0 left-0 w-1.5 bg-black/15" />
      <span className="absolute -right-6 -bottom-6 size-20 rounded-full bg-white/10" />
      <p
        className={cn(
          'relative pl-1 leading-tight font-semibold break-words hyphens-auto',
          compact ? 'line-clamp-5 text-[9px]' : 'line-clamp-4 text-[11px]',
        )}
      >
        {book.title}
      </p>
      <Leaf className={cn('relative ml-1 opacity-80', compact ? 'size-3' : 'size-3.5')} />
    </div>
  )
}

export function StageProgress({ book, compact }: { book: Book; compact?: boolean }) {
  const current = book.stage_index
  const next = PRODUCTION_STAGES[current + 1]
  return (
    <div>
      <div className="flex items-center" aria-hidden>
        {PRODUCTION_STAGES.map((stage, i) => (
          <div key={stage} className="flex flex-1 items-center last:flex-none">
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    'relative flex size-3.5 shrink-0 items-center justify-center rounded-full',
                    i < current && 'bg-primary',
                    i === current && 'bg-amber-400 ring-4 ring-amber-100',
                    i > current && 'border-2 border-border bg-card',
                  )}
                >
                  {i < current && <Check className="size-2.5 text-white" strokeWidth={3} />}
                </span>
              </TooltipTrigger>
              <TooltipContent>{stage}</TooltipContent>
            </Tooltip>
            {i < PRODUCTION_STAGES.length - 1 && <span className={cn('h-0.5 flex-1', i < current ? 'bg-primary' : 'bg-border')} />}
          </div>
        ))}
      </div>
      <div className={cn('flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1', compact ? 'mt-2' : 'mt-3')}>
        <p className="text-sm">
          <span className="text-muted-foreground">
            Stage {current + 1}/{book.stage_count}:
          </span>{' '}
          <span className="font-semibold text-amber-800">{PRODUCTION_STAGES[current]}</span>
        </p>
        {next && <p className="text-xs text-muted-foreground">Next: {next}</p>}
      </div>
    </div>
  )
}

export function RoyaltyNote({ book }: { book: Book }) {
  const notes = book.royalty_notes
  if (notes.below_payout_threshold) {
    return (
      <p className="flex items-start gap-1.5 text-xs text-amber-800">
        <Info className="mt-px size-3.5 shrink-0" />
        Below the ₹1,000 minimum payout. It rolls over and is paid once your balance crosses ₹1,000.
      </p>
    )
  }
  if (notes.all_paid) {
    return (
      <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <Check className="size-3.5" /> All royalties paid. You're fully up to date.
      </p>
    )
  }
  if (notes.never_paid) {
    return (
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-px size-3.5 shrink-0" />
        No payouts yet. Royalties are calculated quarterly and paid within 45 days of quarter end.
      </p>
    )
  }
  return null
}

export function RoyaltyBreakdown({ book }: { book: Book }) {
  const earned = Number(book.total_royalty_earned)
  const paid = Number(book.royalty_paid)
  const paidPct = earned ? (paid / earned) * 100 : 0
  return (
    <div className="rounded-xl bg-gradient-to-br from-emerald-50/70 via-card to-amber-50/50 p-4 ring-1 ring-border ring-inset">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium text-muted-foreground">Royalty earned</p>
        <p className="text-lg font-semibold tracking-tight">{formatINR(book.total_royalty_earned)}</p>
      </div>
      <div className="mt-2.5 flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full bg-emerald-500" style={{ width: `${paidPct}%` }} />
        <div className="h-full bg-amber-400" style={{ width: `${earned ? 100 - paidPct : 0}%` }} />
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">Paid</span>
          <span className="ml-auto font-semibold text-emerald-700">{formatINR(book.royalty_paid)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="text-muted-foreground">Pending</span>
          <span className="ml-auto font-semibold text-amber-700">{formatINR(book.royalty_pending)}</span>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-1.5 border-t border-dashed pt-2.5">
        <p className="text-xs text-muted-foreground">
          Last payout: <span className="font-medium text-foreground">{formatDate(book.last_royalty_payout_date, 'none yet')}</span>
        </p>
        <RoyaltyNote book={book} />
      </div>
    </div>
  )
}

export function PlatformChips({ platforms }: { platforms: string[] }) {
  if (!platforms.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {platforms.map((p) => (
        <span
          key={p}
          className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', PLATFORM_STYLES[p] ?? 'bg-muted text-muted-foreground ring-border')}
        >
          {p}
        </span>
      ))}
    </div>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold">{children}</dd>
    </div>
  )
}

export function IsbnChip({ isbn }: { isbn: string }) {
  if (!isbn) return <span className="text-muted-foreground">Assigned at ISBN stage</span>
  const copy = async () => {
    await navigator.clipboard.writeText(isbn)
    toast.success('ISBN copied')
  }
  return (
    <button onClick={copy} className="group inline-flex items-center gap-1.5 font-mono text-xs hover:text-primary" aria-label="Copy ISBN">
      {isbn}
      <Copy className="size-3 text-muted-foreground group-hover:text-primary" />
    </button>
  )
}

export function BookCard({ book }: { book: Book }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-xs transition-shadow hover:shadow-md">
      <div className="flex gap-5 p-5">
        <BookCover book={book} className="w-24" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <BookStatusBadge status={book.status} published={book.is_published} />
            <span className="font-mono text-[11px] text-muted-foreground">{book.book_code}</span>
          </div>
          <h3 className="mt-2 line-clamp-2 text-lg leading-snug font-semibold" title={book.title}>
            {book.title}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {book.genre}
            {book.publication_date && <> · Published {formatDate(book.publication_date)}</>}
          </p>
          <dl className="mt-4 grid grid-cols-3 gap-3">
            <Fact label="MRP">{formatINR(book.mrp)}</Fact>
            <Fact label="Copies sold">{book.is_published ? formatNumber(book.total_copies_sold) : '—'}</Fact>
            <Fact label="Per copy">{formatINR(book.author_royalty_per_copy)}</Fact>
          </dl>
        </div>
      </div>

      <div className="flex-1 px-5 pb-5">
        {book.is_published ? (
          <RoyaltyBreakdown book={book} />
        ) : (
          <div className="rounded-xl bg-amber-50/50 p-4 ring-1 ring-amber-600/15 ring-inset">
            <StageProgress book={book} />
            <p className="mt-3 text-xs text-muted-foreground">Sales and royalties appear here once your book is live.</p>
          </div>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 px-5 py-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="text-xs">
            <span className="text-muted-foreground">ISBN </span>
            <IsbnChip isbn={book.isbn} />
          </div>
          <PlatformChips platforms={book.available_on} />
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={`/author/tickets/new?book=${book.id}`}>
            <MessageCircleQuestion className="text-primary" /> Ask about this book
          </Link>
        </Button>
      </footer>
    </article>
  )
}
