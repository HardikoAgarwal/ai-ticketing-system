import { BookOpenCheck, ChevronDown, MessageSquareText, Search, Sparkles, UserCheck } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'

const KEY = 'helpdesk.kb.intro.open'

const STEPS = [
  { icon: MessageSquareText, title: 'A customer asks', body: 'A new ticket arrives, for example "I was charged twice".' },
  { icon: Search, title: 'We find the right articles', body: 'The ticket is matched against your articles by meaning, not just exact words.' },
  { icon: Sparkles, title: 'AI drafts a reply', body: 'It writes from those articles only, and cites every one it used.' },
  { icon: UserCheck, title: 'Your team reviews', body: 'Nothing is sent automatically. An agent edits and sends.' },
]

function readOpen() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved !== null) return saved === '1'
  } catch {
    /* private mode: fall through */
  }
  // First visit: open on larger screens, folded on phones so the articles are one scroll away.
  return typeof window === 'undefined' || window.innerWidth >= 768
}

/** Collapsible plain-language explainer. Remembers whether the user folded it away. */
export function KbIntro() {
  const [open, setOpen] = useState(readOpen)
  const toggle = () => {
    const next = !open
    setOpen(next)
    try {
      localStorage.setItem(KEY, next ? '1' : '0')
    } catch {
      /* private mode: fine */
    }
  }
  return (
    <section className="mb-6 overflow-hidden rounded-2xl border bg-card shadow-xs">
      <button type="button" onClick={toggle} aria-expanded={open} className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <BookOpenCheck className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">What is the knowledge base?</span>
          <span className="block text-xs text-muted-foreground">The articles your AI is allowed to quote. If it isn't written here, the AI won't claim it.</span>
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-300', open && 'rotate-180')} />
      </button>
      <div className={cn('grid transition-[grid-template-rows] duration-300 ease-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <ol className="grid gap-px border-t bg-border sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="relative bg-card p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">{i + 1}</span>
                  <Icon className="size-4 text-primary" />
                </div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
