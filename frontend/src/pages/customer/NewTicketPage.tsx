import { useMutation, useQuery } from '@tanstack/react-query'
import { BookOpen, Check, ChevronRight, LifeBuoy, Loader2, Package, Send, UserRound } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { AiChip, AiSurface, Chip, KeyValue, KeyValueList, Panel, PanelHeader, SkeletonText } from '@/components/ds'
import { announce } from '@/components/shell/announce'
import { FileDropzone } from '@/components/tickets/FileDropzone'
import { PageHeader } from '@/features/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
        'flex min-h-14 w-full items-start gap-3 rounded-control border bg-surface p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        selected ? 'border-brand bg-violet-soft' : 'border-line hover:border-line-strong hover:bg-surface-2',
      )}
    >
      <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-chip', selected ? 'bg-brand text-on-brand' : 'bg-sunken text-ink-2')}>
        {selected ? <Check className="size-4" aria-hidden /> : record ? <Package className="size-4" aria-hidden /> : <UserRound className="size-4" aria-hidden />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink">{record ? record.title : 'General question'}</span>
        <span className="block truncate text-xs text-ink-3">
          {record ? `${record.kind}${record.reference ? ` · ${record.reference}` : ''}${record.status ? ` · ${record.status}` : ''}` : 'Not about a specific item'}
        </span>
      </span>
    </button>
  )
}

function Step({ n, title, children, last }: { n: number; title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <section aria-labelledby={`step-${n}`} className={cn('px-5 py-5 sm:px-6', !last && 'border-b border-line')}>
      <h2 id={`step-${n}`} className="mb-4 flex items-center gap-2.5 text-[15px] font-semibold text-ink">
        <span className="flex size-6 items-center justify-center rounded-chip bg-violet-soft text-xs font-bold text-violet ring-1 ring-violet/20 ring-inset" aria-hidden>
          {n}
        </span>
        <span>
          <span className="sr-only">Step {n}: </span>
          {title}
        </span>
      </h2>
      {children}
    </section>
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
  const [dismissedFor, setDismissedFor] = useState<string | null>(null)

  const records = useQuery({ queryKey: ['records', slug], queryFn: api.records })
  const selected = records.data?.find((r) => r.id === recordId) ?? null

  const query = useDebounced(`${subject} ${description}`.trim(), 600)
  const suggestions = useQuery({
    queryKey: ['suggestions', slug, query],
    queryFn: () => api.suggestions(query),
    enabled: query.length >= 8,
    staleTime: 60_000,
  })
  const hits = dismissedFor !== query ? (suggestions.data ?? []) : []
  const searching = query.length >= 8 && suggestions.isFetching && !suggestions.data

  const hitCount = hits.length
  useEffect(() => {
    if (hitCount > 0) announce(`${hitCount} help article${hitCount === 1 ? '' : 's'} might answer your question.`)
  }, [hitCount])

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
    if (Object.keys(next).length) {
      document.getElementById(next.subject ? 'subject' : 'description')?.focus()
      return
    }
    setProgress(0)
    create.mutate()
  }

  return (
    <div className="flex flex-col gap-5 pb-2">
      <nav aria-label="Breadcrumb">
        <ol className="flex min-w-0 items-center gap-2 text-[15px]">
          <li>
            <Link to={`/w/${slug}/help`} className="rounded-sm font-medium whitespace-nowrap text-ink-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none">
              My requests
            </Link>
          </li>
          <li aria-hidden className="text-ink-3">
            <ChevronRight className="size-4" />
          </li>
          <li className="min-w-0 truncate font-semibold text-ink" aria-current="page">
            New request
          </li>
        </ol>
      </nav>

      <PageHeader icon={LifeBuoy} title="Describe what you need" description="Tell us what is going on. A few details up front means fewer back-and-forths." />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form onSubmit={submit} noValidate aria-label="New request">
        <Panel as="div" className="overflow-hidden">
          <Step n={1} title="What is this about?">
            {records.isLoading ? (
              <SkeletonText lines={2} />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <RecordCard record={null} selected={recordId === null} onSelect={() => setRecordId(null)} />
                {records.data?.map((r) => (
                  <RecordCard key={r.id} record={r} selected={recordId === r.id} onSelect={() => setRecordId(r.id)} />
                ))}
              </div>
            )}
          </Step>

          <Step n={2} title="Describe the issue">
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="subject">Title</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={150}
                  placeholder="e.g. I was charged twice this month"
                  aria-invalid={!!errors.subject}
                  aria-describedby={errors.subject ? 'subject-err' : undefined}
                  className="h-11"
                />
                {errors.subject && (
                  <p id="subject-err" role="alert" className="text-xs font-medium text-rose-ink">
                    {errors.subject}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Details</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={5000}
                  rows={7}
                  placeholder="What happened, when did it start, and what have you tried?"
                  aria-invalid={!!errors.description}
                  aria-describedby={errors.description ? 'description-err' : undefined}
                />
                <div className="flex justify-between gap-3 text-xs">
                  <span id="description-err" role={errors.description ? 'alert' : undefined} className="font-medium text-rose-ink">
                    {errors.description}
                  </span>
                  <span className="text-ink-3 tabular-nums">{description.length}/5000</span>
                </div>
              </div>

              {(searching || hits.length > 0) && (
                <AiSurface working={searching} tone="bold" as="div" className="p-4" role="region" aria-label="Suggested articles">
                  <div className="flex flex-wrap items-center gap-2">
                    <AiChip working={searching}>{searching ? 'Searching our help articles…' : 'These might answer your question'}</AiChip>
                  </div>
                  {searching ? (
                    <SkeletonText lines={2} className="mt-3" />
                  ) : (
                    <>
                      <ul className="mt-3 space-y-2">
                        {hits.map((h) => (
                          <li key={h.article_id} className="rounded-control border border-line bg-surface p-3 text-sm">
                            <p className="flex items-center gap-1.5 font-semibold text-ink">
                              <BookOpen className="size-3.5 text-ink-3" aria-hidden /> {h.title}
                            </p>
                            <p className="mt-1 text-[13px] leading-relaxed whitespace-pre-line text-ink-2">{h.excerpt}</p>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium text-ink">Does this answer your question?</span>
                        <Button type="button" size="sm" variant="outline" onClick={() => navigate(`/w/${slug}/help`)}>
                          Yes, that solved it
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setDismissedFor(query)}>
                          No, continue
                        </Button>
                      </div>
                    </>
                  )}
                </AiSurface>
              )}

              <div className="space-y-1.5">
                <Label>
                  Attachments <span className="font-normal text-ink-3">(optional)</span>
                </Label>
                <FileDropzone files={files} onChange={setFiles} disabled={create.isPending} uploading={create.isPending} progress={progress} error={errors.attachments} />
              </div>
            </div>
          </Step>

          <div className="flex flex-col-reverse gap-2 border-t border-line bg-surface-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
            <Button type="button" variant="ghost" onClick={() => navigate(`/w/${slug}/help`)} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Send aria-hidden />} {create.isPending ? 'Sending…' : 'Send request'}
            </Button>
          </div>
        </Panel>
        </form>

        <aside aria-label="Helpful details" className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Panel>
            <PanelHeader title={selected ? selected.title : 'Selected item'} description={selected ? undefined : 'Nothing attached yet'} icon={Package} />
            <div className="p-5">
              {selected ? (
                <KeyValueList columns={1}>
                  <KeyValue label="Status">{selected.status ? <Chip tone="slate" size="sm">{selected.status}</Chip> : '—'}</KeyValue>
                  {Object.entries(selected.data)
                    .slice(0, 6)
                    .map(([k, v]) => (
                      <KeyValue key={k} label={labelize(k)}>
                        {formatValue(v)}
                      </KeyValue>
                    ))}
                </KeyValueList>
              ) : (
                <p className="text-sm text-ink-2">Pick an item to attach its details so we don&rsquo;t have to ask for them.</p>
              )}
            </div>
          </Panel>
          <Panel tone="sunken">
            <PanelHeader title="Tips for a quick answer" />
            <ul className="list-disc space-y-1.5 px-5 pt-1 pb-5 pl-9 text-sm text-ink-2">
              <li>Say what you expected and what happened instead.</li>
              <li>Include dates, amounts or error messages.</li>
              <li>Add a screenshot if it helps.</li>
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  )
}
