import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Clock, Info, Loader2, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { StageProgress } from '@/components/author/BookCard'
import { BookStatusBadge } from '@/components/badges'
import { PageHeader } from '@/components/common'
import { FileDropzone } from '@/components/tickets/FileDropzone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, errorMessage } from '@/lib/api'
import { booksApi, ticketsApi } from '@/lib/endpoints'
import { formatDate, formatINR } from '@/lib/format'
import type { Book } from '@/lib/types'

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

function BookContext({ book }: { book: Book | undefined }) {
  if (!book) {
    return (
      <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">General / Account Level</p>
        <p className="mt-1">Use this for questions about your account, packages, payouts across books, or anything not tied to one book.</p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">{book.title}</p>
        <BookStatusBadge status={book.status} published={book.is_published} />
      </div>
      {book.is_published ? (
        <dl className="mt-3 space-y-1.5 text-sm">
          {[
            ['ISBN', book.isbn],
            ['Copies sold', book.total_copies_sold],
            ['Royalty pending', formatINR(book.royalty_pending)],
            ['Last payout', formatDate(book.last_royalty_payout_date, 'None yet')],
            ['Available on', book.available_on.join(', ') || '—'],
          ].map(([k, v]) => (
            <div key={k as string} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="mt-3">
          <StageProgress book={book} />
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Our team sees these details alongside your request, so you don't need to repeat them.</p>
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

  const live = books?.filter((b) => b.is_published) ?? []
  const production = books?.filter((b) => !b.is_published) ?? []

  return (
    <div className="mx-auto max-w-5xl">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/author/tickets">
          <ArrowLeft /> My Tickets
        </Link>
      </Button>
      <PageHeader title="How can we help?" description="Tell us what's going on. The more specific you are, the faster we can sort it out." />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-5 rounded-xl border bg-card p-5 sm:p-6" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="book">What is this about?</Label>
            <Controller
              control={control}
              name="book"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={booksLoading}>
                  <SelectTrigger id="book" className="w-full" aria-invalid={!!errors.book}>
                    <SelectValue placeholder={booksLoading ? 'Loading your books…' : 'Select a book or General'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={GENERAL}>General / Account Level</SelectItem>
                    {live.length > 0 && (
                      <>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel>Live books</SelectLabel>
                          {live.map((b) => (
                            <SelectItem key={b.id} value={String(b.id)}>
                              {b.title}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </>
                    )}
                    {production.length > 0 && (
                      <>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel>In production</SelectLabel>
                          {production.map((b) => (
                            <SelectItem key={b.id} value={String(b.id)}>
                              {b.title}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </>
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.book && <p className="text-xs text-red-600">{errors.book.message}</p>}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="subject">Subject</Label>
              <span className={`text-xs ${subject.length > 150 ? 'text-red-600' : 'text-muted-foreground'}`}>{subject.length}/150</span>
            </div>
            <Input id="subject" placeholder="e.g. Royalty for Q2 not received" aria-invalid={!!errors.subject} {...register('subject')} />
            {errors.subject && <p className="text-xs text-red-600">{errors.subject.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Details</Label>
            <Textarea
              id="description"
              rows={7}
              placeholder="What happened, and when? Include dates, platform names (Amazon, Flipkart) or order details if relevant."
              aria-invalid={!!errors.description}
              {...register('description')}
            />
            {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>
              Attachments <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <FileDropzone files={files} onChange={setFiles} disabled={mutation.isPending} />
          </div>

          {progress !== null && mutation.isPending && (
            <div className="space-y-1">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">Uploading attachments… {progress}%</p>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5" /> We typically reply within 24 hours.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => navigate(-1)} disabled={mutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="animate-spin" /> : <Send />}
                {mutation.isPending ? 'Submitting…' : 'Submit request'}
              </Button>
            </div>
          </div>
        </form>

        <aside className="space-y-4">
          {bookValue ? (
            <BookContext book={bookValue === GENERAL ? undefined : selectedBook} />
          ) : (
            <div className="rounded-xl border border-dashed bg-card p-4 text-sm text-muted-foreground">
              Select a book to see its details here.
            </div>
          )}
          <div className="rounded-xl border bg-card p-4 text-sm">
            <p className="flex items-center gap-1.5 font-medium">
              <Info className="size-4 text-primary" /> Tips for a faster answer
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>For print issues, attach photos of the affected pages.</li>
              <li>For listing issues, mention the platform and country.</li>
              <li>For royalty questions, mention the period you're asking about.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
