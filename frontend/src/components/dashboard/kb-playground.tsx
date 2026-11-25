import { useQuery } from '@tanstack/react-query'
import { FlaskConical, Loader2, Search, SearchX } from 'lucide-react'
import { useState } from 'react'

import { useWorkspace } from '@/auth/workspace'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
    <section className="mb-6 rounded-2xl border bg-card shadow-xs">
      <header className="flex items-start gap-3 border-b px-5 py-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
          <FlaskConical className="size-[18px]" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">Test what the AI would read</h2>
          <p className="text-xs text-muted-foreground">This is exactly what the AI reads when drafting a reply. Try a real customer question to check your articles cover it.</p>
        </div>
      </header>
      <div className="p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            run(q)
          }}
        >
          <label htmlFor="kb-q" className="mb-1.5 block text-xs font-medium">
            Ask like a customer would
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="kb-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. I was charged twice this month" className="h-10 pl-9" />
            </div>
            <Button type="submit" disabled={q.trim().length < 2} className="h-10 px-5">
              Test
            </Button>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            Try:
            {EXAMPLES.map((e) => (
              <button key={e} type="button" onClick={() => run(e)} className="rounded-md border bg-background px-2.5 py-1 transition-colors hover:border-primary/40 hover:text-foreground">
                {e}
              </button>
            ))}
          </div>
        </form>

        {submitted && (
          <div className="mt-5 space-y-2.5" aria-live="polite">
            {search.isLoading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Searching your articles…
              </p>
            ) : search.data?.length ? (
              <>
                <p className="text-xs font-medium text-muted-foreground">
                  {search.data.length} matching {search.data.length === 1 ? 'passage' : 'passages'}, best first
                </p>
                {search.data.map((h, i) => (
                  <div key={h.article_id} className="rounded-xl border bg-muted/30 p-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">{i + 1}</span>
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold">{h.title}</p>
                      <div className="flex w-28 shrink-0 items-center gap-2" title={`Relevance score ${h.score.toFixed(2)}`}>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.max(8, (h.score / top) * 100)}%` }} />
                        </div>
                        <span className="w-8 text-right text-[11px] text-muted-foreground tabular-nums">{Math.round((h.score / top) * 100)}%</span>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed whitespace-pre-line text-muted-foreground">{h.text}</p>
                  </div>
                ))}
              </>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-dashed bg-muted/30 p-4 text-sm">
                <SearchX className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Nothing matched.</span> The AI would tell the customer it can't confirm that yet. Add an article that answers this question.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
