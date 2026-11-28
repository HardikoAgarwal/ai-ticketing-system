import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CheckCircle2, CircleAlert, ExternalLink, FileSearch, Loader2, Lock, MessageSquareText, Search, SearchX, Sparkles, TriangleAlert, type LucideIcon } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'

import { useWorkspace } from '@/auth/workspace'
import { AiSurface, Chip, ProgressBar, Skeleton } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/api'
import type { KBHit, KBSearch } from '@/lib/types'

/** Always offered: a question no knowledge base covers, to see what "not covered" looks like. */
const OFF_TOPIC = 'What is the weather today?'

const STEPS = [
  { icon: MessageSquareText, title: 'You ask', body: 'Type a question the way a customer would.' },
  { icon: FileSearch, title: 'It finds passages', body: 'The closest passages are picked. Weak matches are dropped.' },
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

const VERDICT: Record<KBSearch['verdict'], { icon: LucideIcon; title: string; body: string; tone: string }> = {
  covered: { icon: CheckCircle2, title: 'Covered', body: 'The AI has a clear source for this question and will cite it in its draft.', tone: 'border-mint-line bg-mint text-mint-ink' },
  partial: { icon: CircleAlert, title: 'Partly covered', body: 'The AI has related material, but it may not answer fully. It will say what it cannot confirm.', tone: 'border-butter-line bg-butter text-butter-ink' },
  none: { icon: SearchX, title: 'Not covered', body: 'No article is close enough, so the AI is given nothing for this. It will tell the customer the team will check. Add an article that answers it.', tone: 'border-rose-line bg-rose text-rose-ink' },
}

/** The passage with the words the question matched on picked out. */
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const parts = useMemo(() => {
    if (!terms.length) return [text]
    const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((x, y) => y.length - x.length)
    return text.split(new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi'))
  }, [text, terms])
  const set = useMemo(() => new Set(terms.map((t) => t.toLowerCase())), [terms])
  return (
    <>
      {parts.map((part, i) =>
        set.has(part.toLowerCase()) ? (
          <mark key={i} className="rounded-sm bg-butter px-0.5 font-medium text-butter-ink">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  )
}

function HitCard({ hit, rank, href }: { hit: KBHit; rank: number; href: string }) {
  const [open, setOpen] = useState(false)
  const long = hit.text.length > 260
  return (
    <li className="rounded-control bg-surface-2 p-4">
      <div className="flex items-start gap-3">
        <span className={`flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-bold ${rank === 1 ? 'bg-ink text-canvas' : 'bg-sunken text-ink-2'}`}>{rank}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <p className="min-w-0 truncate text-sm font-semibold text-ink">{hit.title}</p>
            <Chip tone={hit.level === 'strong' ? 'green' : 'amber'}>{hit.level === 'strong' ? 'Strong match' : 'Possible match'}</Chip>
            {hit.is_internal && (
              <Chip tone="slate" icon={Lock}>
                Staff only
              </Chip>
            )}
            {hit.used_in_draft && <Chip tone="ai">In the AI&rsquo;s draft</Chip>}
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-ink-3">
            {hit.category_name && <span className="truncate">{hit.category_name}</span>}
            <div className="flex w-36 shrink-0 items-center gap-2">
              <ProgressBar value={hit.match} label={`${hit.title}: ${hit.match} percent match`} tone="ai" size="sm" className="flex-1" />
              <span className="w-9 text-right font-medium text-ink-2 tabular-nums">{hit.match}%</span>
            </div>
          </div>
        </div>
        <a href={href} target="_blank" rel="noreferrer" className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-control px-2 text-xs font-semibold text-ink-2 hover:bg-sunken hover:text-ink focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none">
          Open <ExternalLink className="size-3.5" aria-hidden />
          <span className="sr-only">{hit.title} in a new tab</span>
        </a>
      </div>
      <p className={`mt-3 text-sm leading-6 text-ink-2 ${open ? 'whitespace-pre-line' : 'line-clamp-4'}`}>
        <Highlight text={hit.text} terms={hit.matched_terms} />
      </p>
      {long && (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-1.5 rounded-sm text-xs font-semibold text-ink-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none">
          {open ? 'Show less' : 'Show the full passage'}
        </button>
      )}
    </li>
  )
}

function Results({ data, articlesHref }: { data: KBSearch; articlesHref: (id: number) => string }) {
  const v = VERDICT[data.verdict]
  const semantic = data.mode === 'semantic'
  return (
    <div className="space-y-4 p-6 sm:p-8">
      <div className={`flex items-start gap-3 rounded-control border p-4 ${v.tone}`} role="status">
        <v.icon className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div>
          <p className="text-sm font-semibold">{v.title}</p>
          <p className="mt-0.5 text-[13px] leading-5 opacity-90">{v.body}</p>
        </div>
      </div>

      {data.hits.length > 0 && (
        <>
          <p className="text-sm font-semibold text-ink">
            {data.hits.length} matching {data.hits.length === 1 ? 'article' : 'articles'}
            <span className="ml-2 font-normal text-ink-3">best match first</span>
          </p>
          <ol className="space-y-3">
            {data.hits.map((h, i) => (
              <HitCard key={`${h.article_id}-${i}`} hit={h} rank={i + 1} href={articlesHref(h.article_id)} />
            ))}
          </ol>
        </>
      )}

      <p className="flex items-start gap-2 text-xs leading-5 text-ink-3">
        <Sparkles className={`mt-0.5 size-3.5 shrink-0 ${semantic ? 'text-ai' : ''}`} aria-hidden />
        {semantic
          ? data.pending > 0
            ? `Matched by meaning. ${data.pending} ${data.pending === 1 ? 'article is' : 'articles are'} still being indexed and cannot be matched yet.`
            : 'Matched by meaning, so it finds an article even when the customer uses different words.'
          : 'Matched by words only. Matching by meaning turns on when the server has an AI key, and finds articles even when the customer uses different words.'}
      </p>
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
  const articles = useQuery({ queryKey: ['articles', slug], queryFn: api.articles })
  const examples = [...(articles.data ?? []).filter((a) => a.is_published && !a.is_internal).slice(0, 3).map((a) => a.title), OFF_TOPIC]
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
          {examples.map((e) => (
            <button key={e} type="button" onClick={() => run(e)} className="inline-flex h-8 items-center rounded-chip border border-line-strong bg-surface px-3 font-medium text-ink-2 transition-[transform,background-color,color,box-shadow] duration-150 hover:-translate-y-0.5 hover:bg-surface-2 hover:text-ink hover:shadow-card motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none">
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
        ) : search.data ? (
          <Results data={search.data} articlesHref={(id) => `/w/${slug}/agent/knowledge/${id}`} />
        ) : null}
      </div>
    </AiSurface>
  )
}
