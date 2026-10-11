import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BookOpen, Camera, Clock, Eye, IndianRupee, LifeBuoy, Loader2, Send, Store, UserRound } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { BookCover } from '@/components/author/BookCard'
import { FileDropzone } from '@/components/tickets/FileDropzone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, errorMessage } from '@/lib/api'
import { PRODUCTION_STAGES } from '@/lib/constants'
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
  { icon: Camera, text: 'Print issues: attach photos of the affected pages.' },
  { icon: Store, text: 'Listing issues: mention the platform and country.' },
  { icon: IndianRupee, text: 'Royalty questions: mention the period.' },
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

function StatusDot({ live }: { live: boolean }) {
  return <span className={cn('size-1.5 shrink-0 rounded-full', live ? 'bg-emerald-500' : 'bg-amber-400')} />
}

function OptionRow({ visual, title, subtitle }: { visual: ReactNode; title: string; subtitle: ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-3 text-left">
      {visual}
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{title}</span>
        <span className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </span>
  )
}

function BookOption({ book }: { book: Book }) {
  return (
    <OptionRow
      visual={<BookCover book={book} compact hideTitle className="w-8 shadow-sm" />}
      title={book.title}
      subtitle={
        <>
          <StatusDot live={book.is_published} />
          {book.is_published ? 'Live on stores' : `In production · ${stageName(book)}`}
        </>
      }
    />
  )
}

function GeneralOption() {
  return (
    <OptionRow
      visual={
        <span className="flex aspect-[3/4] w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <UserRound className="size-4" />
        </span>
      }
      title="General / Account level"
      subtitle="Account, payouts, anything not tied to one book"
    />
  )
}

function BookSelect({ books, loading, value, onChange, invalid }: {
  books: Book[]
  loading: boolean
  value: string
  onChange: (v: string) => void
  invalid: boolean
}) {
  const live = books.filter((b) => b.is_published)
  const production = books.filter((b) => !b.is_published)
  return (
    <Select value={value} onValueChange={onChange} disabled={loading}>
      <SelectTrigger
        id="book"
        aria-invalid={invalid}
        className="w-full rounded-xl px-3.5 py-2.5 data-[size=default]:h-auto data-[size=default]:min-h-14 *:data-[slot=select-value]:line-clamp-none"
      >
        <SelectValue placeholder={loading ? 'Loading your books…' : 'Select a book, or General / Account level'} />
      </SelectTrigger>
      <SelectContent position="popper" className="rounded-xl p-1.5">
        {live.length > 0 && (
          <SelectGroup>
            <SelectLabel className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide uppercase">Live on stores</SelectLabel>
            {live.map((b) => (
              <SelectItem key={b.id} value={String(b.id)} className="rounded-lg py-2 pr-9">
                <BookOption book={b} />
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {production.length > 0 && (
          <>
            {live.length > 0 && <SelectSeparator />}
            <SelectGroup>
              <SelectLabel className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide uppercase">In production</SelectLabel>
              {production.map((b) => (
                <SelectItem key={b.id} value={String(b.id)} className="rounded-lg py-2 pr-9">
                  <BookOption book={b} />
                </SelectItem>
              ))}
            </SelectGroup>
          </>
        )}
        <SelectSeparator />
        <SelectGroup>
          <SelectItem value={GENERAL} className="rounded-lg py-2 pr-9">
            <GeneralOption />
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

function DetailRow({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={cn('text-right text-sm font-medium', className)}>{value}</dd>
    </div>
  )
}

function SelectionCard({ book, general }: { book?: Book; general: boolean }) {
  if (!book && !general) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed bg-card p-5 text-sm text-muted-foreground">
        <BookOpen className="size-5 shrink-0" />
        Select a book to see its key details here.
      </div>
    )
  }
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-xs">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">About this request</p>
      <div className="mt-3 flex items-center gap-3.5">
        {book ? (
          <BookCover book={book} compact hideTitle className="w-11 shadow-sm" />
        ) : (
          <span className="flex aspect-[3/4] w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UserRound className="size-5" />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold">{book ? book.title : 'General / Account level'}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {book ? (
              <>
                <StatusDot live={book.is_published} />
                {book.is_published ? 'Live on stores' : 'In production'}
              </>
            ) : (
              'Not tied to a specific book'
            )}
          </p>
        </div>
      </div>

      {book && (
        <dl className="mt-4 divide-y border-t">
          {book.is_published ? (
            <>
              <DetailRow label="Copies sold" value={formatNumber(book.total_copies_sold)} />
              <DetailRow label="Royalty pending" value={formatINR(book.royalty_pending)} className="text-amber-700" />
              <DetailRow label="Last payout" value={formatDate(book.last_royalty_payout_date, 'None yet')} />
            </>
          ) : (
            <>
              <DetailRow
                label="Current stage"
                value={`${stageName(book)} (${book.stage_index + 1}/${book.stage_count})`}
                className="text-amber-800"
              />
              <DetailRow label="Next" value={PRODUCTION_STAGES[book.stage_index + 1] ?? '—'} className="text-primary" />
            </>
          )}
        </dl>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Eye className="size-3.5 shrink-0" /> Our team sees these details automatically.
      </p>
    </div>
  )
}

function Tips() {
  return (
    <div className="px-1">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Tips for a faster answer</p>
      <ul className="mt-3 space-y-2.5">
        {TIPS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
            {text}
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

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
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
              render={({ field }) => (
                <BookSelect books={books ?? []} loading={booksLoading} value={field.value} onChange={field.onChange} invalid={!!errors.book} />
              )}
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
          <SelectionCard book={bookValue === GENERAL ? undefined : selectedBook} general={bookValue === GENERAL} />
          <Tips />
        </aside>
      </div>
    </div>
  )
}
