import { Check, Copy, Info, MessageCircleQuestion } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { BookStatusBadge } from '@/components/badges'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PRODUCTION_STAGES } from '@/lib/constants'
import { formatDate, formatINR, formatNumber } from '@/lib/format'
import type { Book } from '@/lib/types'
import { cn } from '@/lib/utils'

export function StageProgress({ book }: { book: Book }) {
  const current = book.stage_index
  return (
    <div>
      <div className="flex gap-1" aria-hidden>
        {PRODUCTION_STAGES.map((stage, i) => (
          <Tooltip key={stage}>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  'h-1.5 flex-1 rounded-full',
                  i < current ? 'bg-primary' : i === current ? 'bg-amber-400' : 'bg-muted',
                )}
              />
            </TooltipTrigger>
            <TooltipContent>{stage}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      <p className="mt-2 text-sm">
        <span className="font-medium">
          Stage {current + 1} of {book.stage_count}: {PRODUCTION_STAGES[current]}
        </span>
        {current + 1 < PRODUCTION_STAGES.length && (
          <span className="text-muted-foreground"> · Next: {PRODUCTION_STAGES[current + 1]}</span>
        )}
      </p>
    </div>
  )
}

function RoyaltyBar({ book }: { book: Book }) {
  const earned = Number(book.total_royalty_earned)
  const paidPct = earned ? (Number(book.royalty_paid) / earned) * 100 : 0
  return (
    <div className="h-2 overflow-hidden rounded-full bg-amber-100" aria-hidden>
      <div className="h-full rounded-full bg-primary" style={{ width: `${paidPct}%` }} />
    </div>
  )
}

function RoyaltyNote({ book }: { book: Book }) {
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
      <p className="flex items-center gap-1.5 text-xs text-emerald-700">
        <Check className="size-3.5" /> All royalties paid
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

export function BookCard({ book }: { book: Book }) {
  const copyIsbn = async () => {
    await navigator.clipboard.writeText(book.isbn)
    toast.success('ISBN copied')
  }

  return (
    <article className="flex flex-col rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold" title={book.title}>
            {book.title}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{book.genre}</p>
        </div>
        <BookStatusBadge status={book.status} published={book.is_published} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">ISBN</dt>
          <dd className="flex items-center gap-1 font-mono text-xs">
            {book.isbn || '—'}
            {book.isbn && (
              <button onClick={copyIsbn} className="text-muted-foreground hover:text-foreground" aria-label="Copy ISBN">
                <Copy className="size-3" />
              </button>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Published</dt>
          <dd>{formatDate(book.publication_date, 'Not yet')}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">MRP</dt>
          <dd>{formatINR(book.mrp)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Copies sold</dt>
          <dd>{book.is_published ? formatNumber(book.total_copies_sold) : '—'}</dd>
        </div>
      </dl>

      <div className="mt-4 rounded-lg bg-muted/60 p-3">
        {book.is_published ? (
          <>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Earned</p>
                <p className="font-semibold">{formatINR(book.total_royalty_earned)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="font-semibold text-emerald-700">{formatINR(book.royalty_paid)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="font-semibold text-amber-700">{formatINR(book.royalty_pending)}</p>
              </div>
            </div>
            <div className="mt-2.5">
              <RoyaltyBar book={book} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Last payout: {formatDate(book.last_royalty_payout_date, 'none yet')}</span>
            </div>
            <div className="mt-2">
              <RoyaltyNote book={book} />
            </div>
          </>
        ) : (
          <>
            <StageProgress book={book} />
            <p className="mt-2 text-xs text-muted-foreground">Sales and royalties appear here once your book is live.</p>
          </>
        )}
      </div>

      {book.available_on.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {book.available_on.map((p) => (
            <span key={p} className="rounded-md border px-1.5 py-0.5 text-[11px] text-muted-foreground">
              {p}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex justify-end border-t pt-3">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/author/tickets/new?book=${book.id}`}>
            <MessageCircleQuestion /> Ask about this book
          </Link>
        </Button>
      </div>
    </article>
  )
}
