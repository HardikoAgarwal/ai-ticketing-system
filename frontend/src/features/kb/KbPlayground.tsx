import { useQuery } from '@tanstack/react-query'
import { ArrowRight, FileSearch, Loader2, MessageSquareText, Search, SearchX, Sparkles, TriangleAlert } from 'lucide-react'
import { useState } from 'react'

import { useWorkspace } from '@/auth/workspace'
import { AiSurface, ProgressBar, Skeleton } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/api'
import type { KBHit } from '@/lib/types'

const EXAMPLES = ['I was charged twice', 'How do I reset my password?', 'Where is my order?']

const STEPS = [
  { icon: MessageSquareText, title: 'You ask', body: 'Type a question the way a customer would.' },
  { icon: FileSearch, title: 'It finds passages', body: 'The closest passages from your articles are picked.' },
  { icon: Sparkles, title: 'The AI reads them', body: 'Only these go into its draft, and it cites the article.' },
]

/** Shown before the first search: what this does, in three steps, so the area never looks empty. */
function Idle() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-8 text-center sm:px-10">
      <span className="flex size-14 items-center justify-center rounded-panel bg-lav text-lav-ink ring-1 ring-lav-line ring-inset" aria-hidden>
        <Search className="size-6" />
      </span>
      <p className="mt-5 text-lg font-semibold tracking-tight text-ink">Your results will show up here</p>
      <p className="mt-1.5 max-w-sm text-sm leading-6 text-ink-2">Ask a customer question above to see which passages of your articles the AI would be given.</p>
      <ol className="mt-8 grid w-full max-w-xl gap-3 text-left sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative rounded-control bg-surface-2 p-4">
            <span className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase">
              <s.icon className="size-4 text-ai" aria-hidden />
              Step {i + 1}
            </span>
            <p className="mt-2 text-sm font-semibold text-ink">{s.title}</p>
            <p className="mt-1 text-[13px] leading-5 text-ink-2">{s.body}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Loading() {
  return (
    <div className="space-y-3 p-6 sm:p-8" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-control bg-surface-2 p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-7 bg-line" />
            <Skeleton className="h-4 w-1/3 bg-line" />
            <Skeleton className="ml-auto h-2 w-28 bg-line" />
          </div>
          <Skeleton className="mt-3 h-3.5 w-full bg-line" />
          <Skeleton className="mt-2 h-3.5 w-2/3 bg-line" />
        </div>
      ))}
    </div>
  )
}

function Results({ hits }: { hits: KBHit[] }) {
  const top = Math.max(0.0001, ...hits.map((h) => h.score))
  return (
    <div className="p-6 sm:p-8">
      <p className="text-sm font-semibold text-ink">
        {hits.length} matching {hits.length === 1 ? 'passage' : 'passages'}
        <span className="ml-2 font-normal text-ink-3">best match first</span>
      </p>
      <ol className="mt-4 space-y-3">
        {hits.map((h, i) => {
          const rel = Math.round((h.score / top) * 100)
          return (
            <li key={`${h.article_id}-${i}`} className="rounded-control bg-surface-2 p-4">
              <div className="flex items-center gap-3">
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-bold ${i === 0 ? 'bg-ink text-canvas' : 'bg-sunken text-ink-2'}`}>{i + 1}</span>
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{h.title}</p>
                <div className="flex w-32 shrink-0 items-center gap-2">
                  <ProgressBar value={Math.max(8, rel)} label={`Relevance of ${h.title}: ${rel} percent`} tone="ai" size="sm" className="flex-1" />
                  <span className="w-9 text-right text-xs font-medium text-ink-2 tabular-nums">{rel}%</span>
                </div>
              </div>
              <p className="mt-3 line-clamp-4 text-sm leading-6 whitespace-pre-line text-ink-2">{h.text}</p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function Message({ icon: Icon, title, children, tone = 'neutral' }: { icon: typeof SearchX; title: string; children: React.ReactNode; tone?: 'neutral' | 'error' }) {
  return (
    <div role={tone === 'error' ? 'alert' : undefined} className="flex h-full flex-col items-center justify-center px-6 py-8 text-center sm:px-10">
      <span className={`flex size-14 items-center justify-center rounded-panel ring-1 ring-inset ${tone === 'error' ? 'bg-rose text-rose-ink ring-rose-line' : 'bg-surface-2 text-ink-3 ring-line'}`} aria-hidden>
        <Icon className="size-6" />
      </span>
      <p className="mt-5 text-lg font-semibold tracking-tight text-ink">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm leading-6 text-ink-2">{children}</p>
    </div>
  )
}

/**
 * "Test AI search": shows exactly what the AI would read for a customer question. It has a fixed height, so the question and the example
 * chips stay put and only the results area changes (placeholder, loading, results, nothing found, error) without resizing the modal.
 */
export function KbPlayground({ animated = false }: { animated?: boolean }) {
  const { slug, api } = useWorkspace()
  const [q, setQ] = useState('')
  const [submitted, setSubmitted] = useState('')
  const search = useQuery({ queryKey: ['kb-search', slug, submitted], queryFn: () => api.searchArticles(submitted), enabled: submitted.length > 1 })
  const run = (text: string) => {
    setQ(text)
    setSubmitted(text.trim())
  }

  return (
    <AiSurface working={search.isFetching} animated={animated} className="flex h-[min(44rem,88vh)] flex-col overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pr-14 sm:px-8 sm:pt-7">
        <h2 className="text-2xl leading-8 font-semibold tracking-tight text-ink">Test AI search</h2>
        <p className="mt-1.5 text-[15px] leading-6 text-ink-2">This is exactly what the AI reads when it drafts a reply. Ask a real customer question and check your articles cover it.</p>
      </div>

      <form
        className="shrink-0 px-6 pt-5 pb-5 sm:px-8"
        onSubmit={(e) => {
          e.preventDefault()
          run(q)
        }}
      >
        <label htmlFor="kb-q" className="sr-only">
          Ask like a customer would
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-ink-3" aria-hidden />
            <input
              id="kb-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. I was charged twice this month"
              autoComplete="off"
              className="h-12 w-full rounded-control border border-input bg-surface pr-4 pl-11 text-base text-ink transition-colors outline-none placeholder:text-ink-3 hover:border-violet/50 focus-visible:border-violet focus-visible:ring-2 focus-visible:ring-violet/25"
            />
          </div>
          <Button type="submit" size="lg" className="h-12 px-5 text-[15px]" disabled={q.trim().length < 2 || search.isFetching}>
            {search.isFetching ? <Loader2 className="animate-spin" /> : <ArrowRight />} Test
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
          Try
          {EXAMPLES.map((e) => (
            <button key={e} type="button" onClick={() => run(e)} className="inline-flex h-8 items-center rounded-chip border border-line-strong bg-surface px-3 font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none">
              {e}
            </button>
          ))}
        </div>
      </form>

      <div aria-live="polite" className="scroll-quiet min-h-0 flex-1 overflow-y-auto border-t border-line bg-canvas/60">
        {!submitted ? (
          <Idle />
        ) : search.isLoading ? (
          <Loading />
        ) : search.isError ? (
          <Message icon={TriangleAlert} title="The search did not work" tone="error">
            {errorMessage(search.error)}
          </Message>
        ) : search.data?.length ? (
          <Results hits={search.data} />
        ) : (
          <Message icon={SearchX} title="Nothing matched">
            The AI would tell the customer it can&apos;t confirm that yet. Add an article that answers this question.
          </Message>
        )}
      </div>
    </AiSurface>
  )
}
