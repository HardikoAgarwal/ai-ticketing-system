import { Check, Copy, Info, Leaf, MessageCircleQuestion } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PLATFORM_STYLES, PRODUCTION_STAGES, coverGradient, coverSolid } from '@/lib/constants'
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

export function PlatformChips({ platforms, max }: { platforms: string[]; max?: number }) {
  if (!platforms.length) return null
  const shown = max ? platforms.slice(0, max) : platforms
  const hidden = platforms.slice(shown.length)
  return (
    <div className={cn('flex gap-1.5', max ? 'flex-nowrap' : 'flex-wrap')}>
      {shown.map((p) => (
        <span
          key={p}
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset',
            PLATFORM_STYLES[p] ?? 'bg-muted text-muted-foreground ring-border',
          )}
        >
          {p}
        </span>
      ))}
      {hidden.length > 0 && (
        <span
          title={hidden.join(', ')}
          className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border ring-inset"
        >
          +{hidden.length}
        </span>
      )}
    </div>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-1 truncate text-base font-semibold">{children}</dd>
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
  const earned = Number(book.total_royalty_earned)
  const paidPct = earned ? (Number(book.royalty_paid) / earned) * 100 : 0
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-xs transition-shadow hover:shadow-md">
      <div className={cn('relative flex h-44 items-end gap-5 overflow-hidden px-6 pb-5 text-white', coverSolid(book.id))}>
        <span className="absolute -top-20 -right-16 size-56 rounded-full bg-white/10" />
        <span className="absolute -bottom-24 right-24 size-44 rounded-full bg-black/10" />
        <BookCover book={book} className="relative w-24 shadow-xl ring-2 ring-white/25" />
        <div className="relative min-w-0 flex-1 pb-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
              <span className={cn('size-1.5 rounded-full', book.is_published ? 'animate-pulse bg-emerald-300' : 'bg-amber-300')} />
              {book.is_published ? 'Live on stores' : book.status.replace('In Production - ', '')}
            </span>
            <span className="ml-auto font-mono text-[11px] text-white/70">{book.book_code}</span>
          </div>
          <h3 className="mt-3 line-clamp-2 text-xl leading-snug font-semibold tracking-tight" title={book.title}>
            {book.title}
          </h3>
          <p className="mt-1 truncate text-sm text-white/80">
            {book.genre}
            {book.publication_date ? ` · Published ${formatDate(book.publication_date)}` : ' · Not yet published'}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-6">
        <dl className="grid grid-cols-3 divide-x rounded-xl border">
          <Fact label="MRP">{formatINR(book.mrp)}</Fact>
          <Fact label="Copies sold">{book.is_published ? formatNumber(book.total_copies_sold) : '—'}</Fact>
          <Fact label="Royalty / copy">{formatINR(book.author_royalty_per_copy)}</Fact>
        </dl>

        <div className="flex flex-1 flex-col rounded-xl bg-muted/40 p-5">
          {book.is_published ? (
            <>
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-muted-foreground">Royalty earned</p>
                <p className="text-2xl font-semibold tracking-tight">{formatINR(book.total_royalty_earned)}</p>
              </div>
              <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div className="h-full bg-emerald-500" style={{ width: `${paidPct}%` }} />
                <div className="h-full bg-amber-400" style={{ width: `${earned ? 100 - paidPct : 0}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">Paid</span>
                  <span className="ml-auto font-semibold text-emerald-700">{formatINR(book.royalty_paid)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-amber-400" />
                  <span className="text-muted-foreground">Pending</span>
                  <span className="ml-auto font-semibold text-amber-700">{formatINR(book.royalty_pending)}</span>
                </span>
              </div>
              <div className="mt-auto space-y-1.5 pt-4">
                <p className="text-xs text-muted-foreground">
                  Last payout <span className="font-medium text-foreground">{formatDate(book.last_royalty_payout_date, 'none yet')}</span>
                </p>
                <RoyaltyNote book={book} />
              </div>
            </>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">Production progress</p>
              <StageProgress book={book} />
              <p className="mt-auto flex items-start gap-1.5 pt-4 text-xs text-muted-foreground">
                <Info className="mt-px size-3.5 shrink-0" />
                Sales and royalties appear here once your book is live on stores.
              </p>
            </>
          )}
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t px-6 py-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="text-xs">
            <span className="text-muted-foreground">ISBN </span>
            <IsbnChip isbn={book.isbn} />
          </div>
          {book.available_on.length ? (
            <PlatformChips platforms={book.available_on} max={2} />
          ) : (
            <span className="text-xs text-muted-foreground">Store listings appear after launch</span>
          )}
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link to={`/author/tickets/new?book=${book.id}`}>
            <MessageCircleQuestion className="text-primary" /> Ask about this book
          </Link>
        </Button>
      </footer>
    </article>
  )
}
