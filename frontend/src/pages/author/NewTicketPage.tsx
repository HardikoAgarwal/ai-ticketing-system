import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  BookOpen,
  Camera,
  Check,
  Clock,
  Eye,
  IndianRupee,
  Lightbulb,
  LifeBuoy,
  Loader2,
  Send,
  Store,
  UserRound,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { BookCover, IsbnChip, PlatformChips, StageProgress } from '@/components/author/BookCard'
import { FileDropzone } from '@/components/tickets/FileDropzone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, errorMessage } from '@/lib/api'
import { coverSolid } from '@/lib/constants'
import { booksApi, ticketsApi } from '@/lib/endpoints'
import { formatDate, formatINR, formatNumber } from '@/lib/format'
import type { Book } from '@/lib/types'
import { cn } from '@/lib/utils'

const GENERAL = 'general'

const schema = z.object({
  book: z.string().min(1, 'Choose a book, or General / Account Level.'),
  subject: z.string().trim().min(5, 'Add a short subject (at least 5 characters).').max(150, 'Keep the subject under 150 characters.'),
  description: z
    .string()
    .trim()
    .min(20, 'Please describe the issue in a bit more detail (at least 20 characters).')
    .max(5000, 'Please keep the description under 5,000 characters.'),
})
type FormValues = z.infer<typeof schema>

const stageName = (book: Book) => book.status.replace('In Production - ', '')

const TIPS = [
  { icon: Camera, tint: 'bg-sky-100 text-sky-700', title: 'Print or quality issues', body: 'Attach photos of the affected pages or cover.' },
  { icon: Store, tint: 'bg-violet-100 text-violet-700', title: 'Listing issues', body: 'Mention the platform and country, e.g. Amazon India.' },
  { icon: IndianRupee, tint: 'bg-emerald-100 text-emerald-700', title: 'Royalty questions', body: 'Mention the quarter or period you are asking about.' },
]

function Step({ n, title, hint }: { n: number; title: string; hint: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{n}</span>
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>
      </div>
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-red-600">{message}</p> : null
}

function PickerTile({
  selected,
  onSelect,
  visual,
  title,
  subtitle,
}: {
  selected: boolean
  onSelect: () => void
  visual: ReactNode
  title: string
  subtitle: ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3.5 rounded-xl border-2 bg-card p-3 text-left transition-all outline-none focus-visible:ring-4 focus-visible:ring-primary/20',
        selected ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-border hover:border-primary/40 hover:bg-muted/40',
      )}
    >
      {visual}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <span
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full transition-colors',
          selected ? 'bg-primary text-primary-foreground' : 'border-2 border-border',
        )}
      >
        {selected && <Check className="size-3" strokeWidth={3} />}
      </span>
    </button>
  )
}

function BookPicker({
  books,
  loading,
  value,
  onChange,
}: {
  books: Book[]
  loading: boolean
  value: string
  onChange: (v: string) => void
}) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[74px] rounded-xl" />
        ))}
      </div>
    )
  }
  const ordered = [...books.filter((b) => b.is_published), ...books.filter((b) => !b.is_published)]
  return (
    <div role="radiogroup" aria-label="What is this about?" className="grid gap-3 sm:grid-cols-2">
      {ordered.map((b) => (
        <PickerTile
          key={b.id}
          selected={value === String(b.id)}
          onSelect={() => onChange(String(b.id))}
          visual={<BookCover book={b} compact hideTitle className="w-10" />}
          title={b.title}
          subtitle={
            b.is_published ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" /> Live on stores
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-amber-400" /> In production · {stageName(b)}
              </span>
            )
          }
        />
      ))}
      <PickerTile
        selected={value === GENERAL}
        onSelect={() => onChange(GENERAL)}
        visual={
          <span className="flex aspect-[3/4] w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UserRound className="size-5" />
          </span>
        }
        title="General / Account level"
        subtitle="Account, payouts, anything else"
      />
    </div>
  )
}

function MiniStat({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2.5">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className={cn('mt-0.5 truncate text-sm font-semibold', className)}>{value}</p>
    </div>
  )
}

function SeenByTeam() {
  return (
    <p className="flex items-start gap-2 rounded-lg bg-primary/5 px-3 py-2.5 text-xs text-primary">
      <Eye className="mt-px size-3.5 shrink-0" />
      Our team sees these details alongside your request, so you don't need to repeat them.
    </p>
  )
}

function SelectedBookCard({ book }: { book: Book }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <div className={cn('relative flex items-center gap-4 overflow-hidden px-5 py-5 text-white', coverSolid(book.id))}>
        <span className="absolute -top-16 -right-12 size-40 rounded-full bg-white/10" />
        <BookCover book={book} compact className="relative w-16 shadow-xl ring-2 ring-white/25" />
        <div className="relative min-w-0">
          <p className="text-[11px] font-medium tracking-wide text-white/70 uppercase">Selected book</p>
          <p className="mt-1 line-clamp-2 text-lg leading-snug font-semibold" title={book.title}>
            {book.title}
          </p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium">
            <span className={cn('size-1.5 rounded-full', book.is_published ? 'bg-emerald-300' : 'bg-amber-300')} />
            {book.is_published ? 'Live on stores' : stageName(book)}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {book.is_published ? (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <MiniStat label="Copies sold" value={formatNumber(book.total_copies_sold)} />
              <MiniStat label="Royalty pending" value={formatINR(book.royalty_pending)} className="text-amber-700" />
              <MiniStat label="Royalty earned" value={formatINR(book.total_royalty_earned)} />
              <MiniStat label="Last payout" value={formatDate(book.last_royalty_payout_date, 'None yet')} />
            </div>
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center gap-3">
                <dt className="w-14 shrink-0 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">ISBN</dt>
                <dd className="min-w-0">
                  <IsbnChip isbn={book.isbn} />
                </dd>
              </div>
              <div className="flex items-start gap-3">
                <dt className="w-14 shrink-0 pt-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Stores</dt>
                <dd className="min-w-0 flex-1">
                  <PlatformChips platforms={book.available_on} />
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="mb-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">Production progress</p>
            <StageProgress book={book} />
          </div>
        )}
        <SeenByTeam />
      </div>
    </div>
  )
}

function GeneralCard() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <div className="relative flex items-center gap-4 overflow-hidden bg-primary px-5 py-5 text-primary-foreground">
        <span className="absolute -top-16 -right-12 size-40 rounded-full bg-white/10" />
        <span className="relative flex size-14 shrink-0 items-center justify-center rounded-xl bg-white/15">
          <UserRound className="size-7" />
        </span>
        <div className="relative">
          <p className="text-[11px] font-medium tracking-wide text-white/70 uppercase">Selected</p>
          <p className="mt-1 text-lg font-semibold">General / Account level</p>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <p className="text-sm text-muted-foreground">
          Use this for questions about your account, publishing package, payouts across several books, or anything not tied to a single book.
        </p>
        <SeenByTeam />
      </div>
    </div>
  )
}

function EmptySelection() {
  return (
    <div className="flex flex-col items-center rounded-2xl border-2 border-dashed bg-card px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <BookOpen className="size-6" />
      </span>
      <p className="mt-3 text-sm font-semibold">No book selected yet</p>
      <p className="mt-1 text-sm text-muted-foreground">Pick a book in step 1 and its details will show up here.</p>
    </div>
  )
}

function TipsCard() {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-xs">
      <p className="flex items-center gap-2.5 text-sm font-semibold">
        <span className="flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <Lightbulb className="size-4" />
        </span>
        Tips for a faster answer
      </p>
      <ul className="mt-4 space-y-3">
        {TIPS.map(({ icon: Icon, tint, title, body }) => (
          <li key={title} className="flex items-start gap-3 rounded-xl border bg-muted/20 p-3">
            <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', tint)}>
              <Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function NewTicketPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState<number | null>(null)
  const { data: books, isLoading: booksLoading } = useQuery({ queryKey: ['books'], queryFn: booksApi.list })

  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { book: params.get('book') ?? '', subject: '', description: '' },
  })

  const bookValue = watch('book')
  const subject = watch('subject') ?? ''
  const description = watch('description') ?? ''
  const selectedBook = books?.find((b) => String(b.id) === bookValue)

  useEffect(() => {
    if (!isDirty && files.length === 0) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty, files.length])

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const form = new FormData()
      if (values.book !== GENERAL) form.append('book_id', values.book)
      form.append('subject', values.subject)
      form.append('description', values.description)
      files.forEach((f) => form.append('attachments', f))
      return ticketsApi.create(form, files.length ? setProgress : undefined)
    },
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      toast.success('Request submitted', { description: 'Our team typically replies within 24 hours. You will see the reply here.' })
      navigate(`/author/tickets/${ticket.id}`, { replace: true })
    },
    onError: (err) => {
      setProgress(null)
      if (err instanceof ApiError && err.code === 'validation_error') {
        const fields = err.fieldErrors
        if (fields.book_id) setError('book', { message: fields.book_id })
        if (fields.subject) setError('subject', { message: fields.subject })
        if (fields.description) setError('description', { message: fields.description })
        if (fields.attachments) toast.error(fields.attachments)
        else toast.error(err.message)
        return
      }
      toast.error(errorMessage(err))
    },
  })

  return (
    <div className="mx-auto max-w-6xl pb-6">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/author/tickets">
          <ArrowLeft /> My Tickets
        </Link>
      </Button>

      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <LifeBuoy className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">How can we help?</h1>
            <p className="mt-1 text-sm text-muted-foreground">Tell us what's going on. The more specific you are, the faster we can sort it out.</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary sm:self-auto">
          <Clock className="size-4" /> Typically replies within 24 hours
        </span>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form
          onSubmit={handleSubmit((v) => mutation.mutate(v))}
          className="overflow-hidden rounded-2xl border bg-card shadow-xs"
          noValidate
        >
          <section className="space-y-5 px-7 py-7">
            <Step n={1} title="What is this about?" hint="Pick the book your question relates to, or General for anything else." />
            <Controller
              control={control}
              name="book"
              render={({ field }) => <BookPicker books={books ?? []} loading={booksLoading} value={field.value} onChange={field.onChange} />}
            />
            <FieldError message={errors.book?.message} />
          </section>

          <section className="space-y-5 border-t px-7 py-7">
            <Step n={2} title="Describe the issue" hint="A clear subject and a few details help us route it to the right person." />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="subject">Subject</Label>
                <span className={cn('text-xs tabular-nums', subject.length > 150 ? 'text-red-600' : 'text-muted-foreground')}>
                  {subject.length}/150
                </span>
              </div>
              <Input id="subject" className="h-11" placeholder="e.g. Royalty for Q2 not received" aria-invalid={!!errors.subject} {...register('subject')} />
              <FieldError message={errors.subject?.message} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Details</Label>
                <span className={cn('text-xs tabular-nums', description.length > 5000 ? 'text-red-600' : 'text-muted-foreground')}>
                  {formatNumber(description.length)}/5,000
                </span>
              </div>
              <Textarea
                id="description"
                rows={8}
                className="min-h-44"
                placeholder="What happened, and when? Include dates, platform names (Amazon, Flipkart) or order details if relevant."
                aria-invalid={!!errors.description}
                {...register('description')}
              />
              <FieldError message={errors.description?.message} />
            </div>
          </section>

          <section className="space-y-5 border-t px-7 py-7">
            <Step n={3} title="Attachments" hint="Optional. Photos of defects, screenshots or statements help us resolve it faster." />
            <FileDropzone files={files} onChange={setFiles} disabled={mutation.isPending} />
            {progress !== null && mutation.isPending && (
              <div className="space-y-1.5">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground">Uploading attachments… {progress}%</p>
              </div>
            )}
          </section>

          <footer className="flex flex-col-reverse gap-3 border-t bg-muted/30 px-7 py-5 sm:flex-row sm:items-center sm:justify-end">
            <Button type="button" variant="ghost" size="lg" onClick={() => navigate(-1)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" size="lg" className="sm:min-w-44" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="animate-spin" /> : <Send />}
              {mutation.isPending ? 'Submitting…' : 'Submit request'}
            </Button>
          </footer>
        </form>

        <aside className="space-y-6 lg:sticky lg:top-6">
          {bookValue === GENERAL ? <GeneralCard /> : selectedBook ? <SelectedBookCard book={selectedBook} /> : <EmptySelection />}
          <TipsCard />
        </aside>
      </div>
    </div>
  )
}
