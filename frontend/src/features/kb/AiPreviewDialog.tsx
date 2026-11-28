import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, CircleAlert, Loader2, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { useWorkspace } from '@/auth/workspace'
import { Chip, fill, on, type Hue } from '@/components/ds'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { KBSearch } from '@/lib/types'

import { VISIBILITY, type Visibility } from './kb-utils'

const HUES: Hue[] = ['mint', 'lav', 'sky', 'peach', 'rose', 'butter']

const STOP = new Set(
  'a an the and or but of to in on for with is are was were be been it its this that i my me we our you your not no do does did have has had can could would should will just from at by as if so than then there what when where which who why how please about into over out up down very also still new all use one make like within takes take get got need needs standard may might any each'.split(' '),
)

type Check = { ok: boolean; title: string; detail: string }

function checks({ title, body, words, passages, hasCategory, visibility }: { title: string; body: string; words: number; passages: number; hasCategory: boolean; visibility: Visibility }): Check[] {
  const fact = body.match(/\b\d[\d,.]*(?:\s?%|(?:\s[a-z]+){1,2})/i)?.[0]
  return [
    {
      ok: title.trim().split(/\s+/).filter(Boolean).length >= 2 && title.trim().length >= 10,
      title: 'Specific title',
      detail: 'Name the topic the way a customer would, like “Refunds and credits”. The title counts toward the match.',
    },
    {
      ok: words >= 40,
      title: words >= 40 ? 'Enough detail' : 'Very short',
      detail: words >= 40 ? `${words} words is enough for the AI to answer from.` : 'Add the specifics a customer would ask about: amounts, timeframes and steps. Short articles match weakly.',
    },
    {
      ok: Boolean(fact),
      title: fact ? 'Concrete facts to quote' : 'No numbers or dates',
      detail: fact ? `It includes specifics such as “${fact}”, which the AI quotes exactly.` : 'If the answer has a timeframe, price or limit, state it. The AI only quotes what is written here.',
    },
    {
      ok: passages <= 5,
      title: passages <= 5 ? 'Focused' : 'Long article',
      detail: passages <= 5 ? 'Short enough that the best passage can be picked cleanly.' : 'The AI reads only the best-matching passages. Splitting this into focused articles finds the right part more often.',
    },
    {
      ok: hasCategory,
      title: hasCategory ? 'Has a category' : 'No category',
      detail: hasCategory ? 'Tickets in this category rank it a little higher.' : 'Pick a category: tickets in it will rank this article a little higher.',
    },
    {
      ok: visibility !== 'draft',
      title: visibility === 'draft' ? 'Still a draft' : visibility === 'staff' ? 'Staff guidance' : 'Public',
      detail:
        visibility === 'draft'
          ? 'Drafts are not used anywhere. Switch it to Public or Staff only when it is ready.'
          : visibility === 'staff'
            ? 'The AI follows it but never quotes it, and customers never see it.'
            : 'The AI can quote it and cite it, and customers can be shown it.',
    },
  ]
}

/** The words the search leans on: title words count three times, so they lead. */
function keyTerms(title: string, body: string): string[] {
  const count = new Map<string, { n: number; form: string }>()
  const add = (text: string, weight: number) => {
    for (const w of text.toLowerCase().match(/[a-z0-9']+/g) ?? []) {
      if (w.length < 3 || STOP.has(w)) continue
      const stem = w.replace(/(ing|ed|es|s)$/, '')
      const cur = count.get(stem)
      count.set(stem, { n: (cur?.n ?? 0) + weight, form: cur && cur.form.length <= w.length ? cur.form : w })
    }
  }
  add(title, 3)
  add(body, 1)
  return [...count.values()].sort((a, b) => b.n - a.n).slice(0, 10).map((c) => c.form)
}

function Row({ icon: Icon, ok, title, children }: { icon?: LucideIcon; ok: boolean; title: string; children: ReactNode }) {
  const I = Icon ?? (ok ? CheckCircle2 : CircleAlert)
  return (
    <li className="flex gap-3 rounded-control bg-surface-2 p-3.5">
      <I className={`mt-0.5 size-5 shrink-0 ${ok ? 'text-mint-ink' : 'text-butter-ink'}`} aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">
          {title}
          <span className="sr-only">{ok ? ' (good)' : ' (could be better)'}</span>
        </p>
        <p className="mt-0.5 text-[13px] leading-5 text-ink-2">{children}</p>
      </div>
    </li>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase">{title}</h3>
      {hint && <p className="mt-1 text-[13px] leading-5 text-ink-2">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

/** Asks the real search how well this saved article is found, for a question phrased as its own title and as its opening line. */
function SelfTest({ id, title, body, onMode }: { id: number; title: string; body: string; onMode: (m: KBSearch['mode']) => void }) {
  const { slug, api } = useWorkspace()
  const opening = body.trim().split(/(?<=[.!?])\s+/)[0]?.slice(0, 180) ?? ''
  const probes = [
    { label: 'Its title', q: title.trim() },
    ...(opening && opening.toLowerCase() !== title.trim().toLowerCase() ? [{ label: 'Its opening line', q: opening }] : []),
  ].filter((p) => p.q.length > 1)
  const results = useQuery({
    queryKey: ['kb-selftest', slug, id, probes.map((p) => p.q)],
    queryFn: async () => {
      const out = await Promise.all(probes.map((p) => api.searchArticles(p.q)))
      if (out[0]) onMode(out[0].mode)
      return out
    },
    staleTime: 60_000,
  })

  if (results.isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-2">
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> Running the search…
      </p>
    )
  }
  if (results.isError || !results.data) return <p className="text-sm text-ink-2">The test could not run right now. Try again in a moment.</p>
  return (
    <ul className="space-y-2.5">
      {probes.map((p, i) => {
        const data = results.data![i]
        const rank = data.hits.findIndex((h) => h.article_id === id) + 1
        const mine = rank ? data.hits[rank - 1] : null
        const rival = data.hits.find((h) => h.article_id !== id)
        const good = rank === 1
        return (
          <Row key={p.label} ok={good} title={good ? `Found first for ${p.label.toLowerCase()}` : rank ? `Found at number ${rank} for ${p.label.toLowerCase()}` : `Not found for ${p.label.toLowerCase()}`}>
            <span className="text-ink-3">“{p.q.length > 90 ? `${p.q.slice(0, 90)}…` : p.q}”</span>
            <br />
            {good
              ? `${mine!.level === 'strong' ? 'Strong' : 'Possible'} match (${mine!.match}%).${rival ? ` Next closest is “${rival.title}”.` : ''}`
              : rank
                ? `“${rival?.title}” ranks above it. If they cover the same ground, merge them or make the titles clearly different.`
                : rival
                  ? `“${rival.title}” matched instead. Check the wording here uses the words a customer would.`
                  : 'No article matched. Add the words a customer would use.'}
          </Row>
        )
      })}
    </ul>
  )
}

/**
 * How the AI will use this article, from what you are typing right now: whether it is switched on, what it will actually be
 * given, whether it is likely to be found (practical checks), and for a saved article a real search to see how it ranks.
 */
export function AiPreviewDialog({
  open,
  onOpenChange,
  passages,
  title,
  body,
  visibility,
  hasCategory,
  saved,
  dirty,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  passages: string[]
  title: string
  body: string
  visibility: Visibility
  hasCategory: boolean
  /** The stored article, or null for one that has not been saved yet. */
  saved: { id: number; indexed: boolean } | null
  dirty: boolean
}) {
  const words = passages.join(' ').trim().split(/\s+/).filter(Boolean).length
  const list = checks({ title, body, words, passages: passages.length, hasCategory, visibility })
  const terms = keyTerms(title, body)
  const vis = VISIBILITY[visibility]
  const [mode, setMode] = useState<KBSearch['mode'] | null>(null)
  const testable = Boolean(saved) && !dirty && visibility !== 'draft' && title.trim().length > 1

  const state: { tone: 'green' | 'amber' | 'slate'; label: string } =
    visibility === 'draft'
      ? { tone: 'slate', label: 'Not used yet' }
      : !saved
        ? { tone: 'amber', label: 'Save to make it searchable' }
        : dirty
          ? { tone: 'amber', label: 'Unsaved edits are not searchable yet' }
          : saved.indexed
            ? { tone: 'green', label: 'Ready for AI search' }
            : mode === 'keyword'
              ? { tone: 'amber', label: 'Matched by words only' }
              : { tone: 'amber', label: 'Indexing' }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scroll-quiet max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <div className="border-b border-line px-6 py-6 pr-14 sm:px-8">
          <DialogTitle className="text-2xl leading-8 font-semibold tracking-tight text-ink">How the AI will use this article</DialogTitle>
          <DialogDescription className="mt-1.5 text-[15px] leading-6 text-ink-2">
            What it is given, whether it is likely to be found, and how it ranks today. This updates as you type.
          </DialogDescription>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Chip tone={visibility === 'public' ? 'green' : visibility === 'staff' ? 'amber' : 'slate'} icon={vis.icon}>
              {vis.label}
            </Chip>
            <Chip tone={state.tone}>{state.label}</Chip>
          </div>
          <p className="mt-2 text-[13px] leading-5 text-ink-2">{vis.hint}</p>
        </div>

        {passages.length === 0 ? (
          <div className="px-6 py-10 sm:px-8">
            <p className="rounded-control border border-dashed border-line-strong p-8 text-center text-sm text-ink-3">Start writing and the preview appears here.</p>
          </div>
        ) : (
          <div className="space-y-8 px-6 py-6 sm:px-8">
            <Section title="Will it be found?" hint="Practical checks on what you have written so far.">
              <ul className="space-y-2.5">
                {list.map((c) => (
                  <Row key={c.title} ok={c.ok} title={c.title}>
                    {c.detail}
                  </Row>
                ))}
              </ul>
            </Section>

            <Section title="How it ranks today" hint="Runs the real search with questions built from this article and checks it comes out on top.">
              {testable && saved ? (
                <SelfTest id={saved.id} title={title} body={body} onMode={setMode} />
              ) : (
                <p className="rounded-control border border-dashed border-line-strong p-4 text-sm text-ink-3">
                  {visibility === 'draft' ? 'Drafts are not searched. Make it Public or Staff only to test it.' : !saved ? 'Save the article first, then this runs the real search.' : 'Save your edits first. The search only knows the saved version.'}
                </p>
              )}
            </Section>

            <Section
              title="What the AI is given"
              hint={
                passages.length === 1
                  ? 'The whole article, under its title, exactly as it goes into a draft when it is one of the best matches for a ticket.'
                  : `The article is cut into ${passages.length} passages. For each ticket the AI is given only the passages that match it best (up to four across all articles), each under the title.`
              }
            >
              {passages.length > 1 && (
                <div className="mb-3 flex h-8 gap-1" role="img" aria-label={`The article is split into ${passages.length} passages`}>
                  {passages.map((p, i) => (
                    <div key={i} className="flex min-w-7 items-center justify-center rounded-md text-xs font-bold" style={{ flexGrow: Math.max(p.length, 1), flexBasis: 0, background: fill(HUES[i % HUES.length]), color: on(HUES[i % HUES.length]) }}>
                      {i + 1}
                    </div>
                  ))}
                </div>
              )}
              <ol className="space-y-3">
                {passages.map((p, i) => (
                  <li key={i} className="rounded-control border border-line bg-surface-2 p-4">
                    {passages.length > 1 && <p className="mb-2 text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase">Passage {i + 1} of {passages.length}</p>}
                    <p className="font-mono text-[13px] leading-6 font-semibold text-ink">
                      [{title.trim() || 'Untitled'}
                      {visibility === 'staff' ? ' (internal)' : ''}]
                    </p>
                    <p className="mt-1 text-sm leading-6 whitespace-pre-line text-ink-2">{p}</p>
                  </li>
                ))}
              </ol>
            </Section>

            {terms.length > 0 && (
              <Section title="Words the search leans on" hint="Your title and most-used words. If a customer would use different words for this topic, add them to the text.">
                <ul className="flex flex-wrap gap-2">
                  {terms.map((t) => (
                    <li key={t} className="rounded-chip bg-surface-2 px-2.5 py-1 text-[13px] font-medium text-ink-2">
                      {t}
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
