import { MessageSquareText, Search, Sparkles, UserCheck } from 'lucide-react'

const STEPS = [
  { icon: MessageSquareText, title: 'A customer asks', body: 'A new ticket arrives, for example "I was charged twice".' },
  { icon: Search, title: 'We find the right articles', body: 'Matched by meaning, not just exact words.' },
  { icon: Sparkles, title: 'AI drafts a reply', body: 'It writes from those articles only and cites each one.' },
  { icon: UserCheck, title: 'Your team reviews', body: 'Nothing is sent automatically. An agent edits and sends.' },
]

/** The four steps from a customer question to an AI draft, as a collapsible note under the article list. */
export function HowItWorks({ open = false }: { open?: boolean }) {
  return (
    <details open={open} className="group rounded-panel bg-surface shadow-card">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-panel px-5 py-4 select-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <span className="flex size-9 items-center justify-center rounded-control bg-violet-soft text-violet ring-1 ring-violet/20 ring-inset" aria-hidden>
          <Sparkles className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-ink">How the knowledge base powers AI drafts</span>
          <span className="block text-[13px] text-ink-2">If it isn&apos;t written here, the AI won&apos;t claim it.</span>
        </span>
        <span className="text-sm font-semibold text-violet group-open:hidden">Show</span>
        <span className="hidden text-sm font-semibold text-violet group-open:inline">Hide</span>
      </summary>
      <ol className="grid gap-3 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className="rounded-control bg-surface-2 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink-3">
              <span className="flex size-5 items-center justify-center rounded-chip bg-ink text-[11px] text-canvas">{i + 1}</span>
              <Icon className="size-4 text-violet" aria-hidden />
            </div>
            <p className="text-sm font-semibold text-ink">{title}</p>
            <p className="mt-0.5 text-[13px] leading-5 text-ink-2">{body}</p>
          </li>
        ))}
      </ol>
    </details>
  )
}
