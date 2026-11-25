import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, BookOpen, Check, Lightbulb, Loader2, Package, Send, UserRound } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { PageHeader } from '@/components/common'
import { FileDropzone } from '@/components/tickets/FileDropzone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, errorMessage } from '@/lib/api'
import { formatValue, labelize } from '@/lib/format'
import type { WorkspaceRecord } from '@/lib/types'
import { cn } from '@/lib/utils'

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

function RecordCard({ record, selected, onSelect }: { record: WorkspaceRecord | null; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3.5 text-left shadow-xs transition-all hover:border-primary/50 hover:shadow-sm',
        selected && 'border-primary bg-primary/[0.04] ring-2 ring-primary/20',
      )}
    >
      <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
        {selected ? <Check className="size-4" /> : record ? <Package className="size-4" /> : <UserRound className="size-4" />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{record ? record.title : 'General question'}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {record ? `${record.kind}${record.reference ? ` · ${record.reference}` : ''}${record.status ? ` · ${record.status}` : ''}` : 'Not about a specific item'}
        </span>
      </span>
    </button>
  )
}

export function NewTicketPage() {
  const { slug, api } = useWorkspace()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [recordId, setRecordId] = useState<number | null>(params.get('record') ? Number(params.get('record')) : null)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [dismissed, setDismissed] = useState(false)

  const records = useQuery({ queryKey: ['records', slug], queryFn: api.records })
  const selected = records.data?.find((r) => r.id === recordId) ?? null

  const query = useDebounced(`${subject} ${description}`.trim(), 600)
  const suggestions = useQuery({
    queryKey: ['suggestions', slug, query],
    queryFn: () => api.suggestions(query),
    enabled: query.length >= 8,
    staleTime: 60_000,
  })
  useEffect(() => {
    setDismissed(false)
  }, [query])
  const hits = !dismissed ? (suggestions.data ?? []) : []

  const dirty = !!(subject || description || files.length)
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const create = useMutation({
    mutationFn: () => {
      const form = new FormData()
      if (recordId) form.append('record_id', String(recordId))
      form.append('subject', subject.trim())
      form.append('description', description.trim())
      files.forEach((f) => form.append('attachments', f))
      return api.tickets.create(form, setProgress)
    },
    onSuccess: (ticket) => {
      toast.success(`Request ${ticket.reference} sent`, { description: "We'll reply here as soon as we can." })
      navigate(`/w/${slug}/help/tickets/${ticket.id}`, { replace: true })
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 400) setErrors(err.fieldErrors)
      toast.error(errorMessage(err))
    },
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (subject.trim().length < 5) next.subject = 'Give your request a short title (at least 5 characters).'
    if (description.trim().length < 20) next.description = 'Add a few more details (at least 20 characters) so we can help faster.'
    setErrors(next)
    if (Object.keys(next).length) return
    setProgress(0)
    create.mutate()
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link to={`/w/${slug}/help`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> My tickets
      </Link>
      <PageHeader title="How can we help?" description="Tell us what's going on. A few details up front means fewer back-and-forths." />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <form onSubmit={submit} className="space-y-7 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-7" noValidate>
          <section aria-labelledby="step1" className="border-b border-border pb-7">
            <h2 id="step1" className="mb-4 flex items-center gap-2.5 text-[15px] font-semibold">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span> What is this about?
            </h2>
            {records.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading your items…</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <RecordCard record={null} selected={recordId === null} onSelect={() => setRecordId(null)} />
                {records.data?.map((r) => (
                  <RecordCard key={r.id} record={r} selected={recordId === r.id} onSelect={() => setRecordId(r.id)} />
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="step2" className="space-y-4">
            <h2 id="step2" className="flex items-center gap-2.5 text-[15px] font-semibold">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span> Describe the issue
            </h2>
            <div className="space-y-1.5">
              <Label htmlFor="subject">Title</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} placeholder="e.g. I was charged twice this month" aria-invalid={!!errors.subject} />
              {errors.subject && <p className="text-xs text-red-600">{errors.subject}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Details</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} rows={7} placeholder="What happened, when did it start, and what have you tried?" aria-invalid={!!errors.description} />
              <div className="flex justify-between text-xs">
                <span className="text-red-600">{errors.description}</span>
                <span className="text-muted-foreground">{description.length}/5000</span>
              </div>
            </div>

            {hits.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4" role="region" aria-label="Suggested articles">
                <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                  <Lightbulb className="size-4" /> These might answer your question
                </p>
                <ul className="mt-2 space-y-2">
                  {hits.map((h) => (
                    <li key={h.article_id} className="rounded-lg bg-card p-3 text-sm shadow-xs">
                      <p className="flex items-center gap-1.5 font-medium">
                        <BookOpen className="size-3.5 text-muted-foreground" /> {h.title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed whitespace-pre-line text-muted-foreground">{h.excerpt}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-amber-900">Does this answer your question?</span>
                  <Button type="button" size="sm" variant="outline" onClick={() => navigate(`/w/${slug}/help`)}>
                    Yes, that solved it
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setDismissed(true)}>
                    No, continue
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Attachments (optional)</Label>
              <FileDropzone files={files} onChange={setFiles} disabled={create.isPending} />
              {errors.attachments && <p className="text-xs text-red-600">{errors.attachments}</p>}
            </div>
          </section>

          {create.isPending && files.length > 0 && <Progress value={progress} aria-label="Upload progress" />}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => navigate(`/w/${slug}/help`)} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="animate-spin" /> : <Send />} Send request
            </Button>
          </div>
        </form>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="text-sm font-semibold">{selected ? selected.title : 'Selected item'}</h3>
            {selected ? (
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-medium">{selected.status || '—'}</dd>
                </div>
                {Object.entries(selected.data).slice(0, 6).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{labelize(k)}</dt>
                    <dd className="text-right font-medium">{formatValue(v)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Pick an item to attach its details so we don't have to ask for them.</p>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-muted/50 p-5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Tips for a quick answer</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Say what you expected and what happened instead.</li>
              <li>Include dates, amounts or error messages.</li>
              <li>Add a screenshot if it helps.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
