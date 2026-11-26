import { BookOpen, MessageSquareText, Plus, Search, Sparkles, UserCheck } from 'lucide-react'

import { EmptyState } from '@/components/ds'
import { Button } from '@/components/ui/button'

import { KbPlayground } from './KbPlayground'

const STEPS = [
  { icon: MessageSquareText, title: 'A customer asks', body: 'A new ticket arrives, for example "I was charged twice".' },
  { icon: Search, title: 'We find the right articles', body: 'Matched by meaning, not just exact words.' },
  { icon: Sparkles, title: 'AI drafts a reply', body: 'It writes from those articles only and cites each one.' },
  { icon: UserCheck, title: 'Your team reviews', body: 'Nothing is sent automatically. An agent edits and sends.' },
]

/** Right pane when no article is open: how the KB powers the AI, plus the retrieval tester. */
export function KbOverview({ empty, canEdit, onNew }: { empty: boolean; canEdit: boolean; onNew: () => void }) {
  if (empty) {
    return (
      <EmptyState
        icon={BookOpen}
        tone="ai"
        title="Teach the AI your answers"
        description="Start with the questions customers ask most: refunds, delivery times, how to reset a password. One short article per topic."
        action={canEdit ? <Button onClick={onNew}><Plus /> Write your first article</Button> : undefined}
        className="h-full"
      />
    )
  }
  return (
    <div className="space-y-5">
      <section aria-labelledby="kb-how">
        <h2 id="kb-how" className="text-[15px] font-semibold tracking-tight text-ink">
          How the knowledge base powers AI drafts
        </h2>
        <p className="mt-0.5 text-[13px] text-ink-2">The articles your AI is allowed to quote. If it isn't written here, the AI won't claim it.</p>
        <ol className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="rounded-control border border-line bg-surface-2 p-3.5">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink-3">
                <span className="flex size-5 items-center justify-center rounded-chip bg-ink text-[11px] text-canvas">{i + 1}</span>
                <Icon className="size-4 text-violet" aria-hidden />
              </div>
              <p className="text-sm font-semibold text-ink">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-2">{body}</p>
            </li>
          ))}
        </ol>
      </section>
      <KbPlayground />
    </div>
  )
}
