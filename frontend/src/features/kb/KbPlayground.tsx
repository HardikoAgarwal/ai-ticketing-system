import { useQuery } from '@tanstack/react-query'
import { FlaskConical, Loader2, Search, SearchX } from 'lucide-react'
import { useState } from 'react'

import { useWorkspace } from '@/auth/workspace'
import { AiSurface, Chip, ProgressBar } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/api'

const EXAMPLES = ['I was charged twice', 'How do I reset my password?', 'Where is my order?']

/** "Test retrieval": shows exactly what the AI would read for a given customer question. */
export function KbPlayground() {
  const { slug, api } = useWorkspace()
  const [q, setQ] = useState('')
  const [submitted, setSubmitted] = useState('')
  const search = useQuery({ queryKey: ['kb-search', slug, submitted], queryFn: () => api.searchArticles(submitted), enabled: submitted.length > 1 })
  const run = (text: string) => {
    setQ(text)
    setSubmitted(text.trim())
  }
  const top = Math.max(0.0001, ...(search.data?.map((h) => h.score) ?? [0]))

  return (
    <AiSurface working={search.isFetching} className="p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-lav text-violet">
          <FlaskConical className="size-[18px]" aria-hidden />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-ink">Test what the AI would read</h2>
          <p className="text-[13px] text-ink-2">This is exactly what it reads when drafting a reply. Ask a real customer question and check your articles cover it.</p>
        </div>
      </div>

      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault()
          run(q)
        }}
      >
        <label htmlFor="kb-q" className="mb-1.5 block text-xs font-medium text-ink-2">
          Ask like a customer would
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
            <Input id="kb-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. I was charged twice this month" className="pl-9" />
          </div>
          <Button type="submit" disabled={q.trim().length < 2 || search.isFetching}>
            {search.isFetching && <Loader2 className="animate-spin" />} Test
          </Button>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
          Try:
          {EXAMPLES.map((e) => (
            <Chip key={e} size="sm" tone="slate" onClick={() => run(e)}>
              {e}
            </Chip>
          ))}
        </div>
      </form>

      <div aria-live="polite" className="mt-4 empty:hidden">
        {submitted &&
          (search.isLoading ? (
            <p className="flex items-center gap-2 text-sm text-ink-2">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Searching your articles…
            </p>
          ) : search.isError ? (
            <p role="alert" className="rounded-control border border-rose-line bg-rose px-3 py-2 text-sm text-rose-ink">
              {errorMessage(search.error)}
            </p>
          ) : search.data?.length ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-ink-3">
                {search.data.length} matching {search.data.length === 1 ? 'passage' : 'passages'}, best first
              </p>
              <ol className="space-y-2">
                {search.data.map((h, i) => {
                  const rel = Math.round((h.score / top) * 100)
                  return (
                    <li key={h.article_id} className="rounded-control border border-line bg-surface-2 p-3.5">
                      <div className="flex items-center gap-3">
                        <Chip tone="violet" size="sm">
                          #{i + 1}
                        </Chip>
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{h.title}</p>
                        <div className="flex w-28 shrink-0 items-center gap-2">
                          <ProgressBar value={Math.max(8, rel)} label={`Relevance of ${h.title}: ${rel} percent`} tone="ai" size="sm" className="flex-1" />
                          <span className="w-8 text-right text-[11px] text-ink-3 tabular-nums">{rel}%</span>
                        </div>
                      </div>
                      <p className="mt-2 line-clamp-3 text-xs leading-relaxed whitespace-pre-line text-ink-2">{h.text}</p>
                    </li>
                  )
                })}
              </ol>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-control border border-dashed border-line-strong bg-surface-2 p-4 text-sm">
              <SearchX className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
              <p className="text-ink-2">
                <span className="font-medium text-ink">Nothing matched.</span> The AI would tell the customer it can't confirm that yet. Add an article that answers this question.
              </p>
            </div>
          ))}
      </div>
    </AiSurface>
  )
}
