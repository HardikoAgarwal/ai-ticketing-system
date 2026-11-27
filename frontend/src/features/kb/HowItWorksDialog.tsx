import { MessageSquareText, PencilLine, Search, Sparkles, UserCheck } from 'lucide-react'

import { SolidChip } from '@/components/ds'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

import { VISIBILITY, type Visibility } from './kb-utils'

const STEPS = [
  { icon: PencilLine, title: 'You write short articles', body: 'One topic per article, in plain words: refunds, delivery times, how to reset a password. This is the only place the AI is allowed to get answers from.' },
  { icon: Search, title: 'We prepare them for search', body: 'Each article is cut into short passages and indexed by meaning. The "AI ready" label tells you it can be found; it takes a moment after you save.' },
  { icon: MessageSquareText, title: 'A customer asks', body: 'When a ticket arrives, we find the passages closest in meaning to the question, not just the ones that share exact words.' },
  { icon: Sparkles, title: 'The AI drafts from them', body: 'It writes a reply using only those passages and cites each article. If your articles do not cover it, the AI says it cannot confirm.' },
  { icon: UserCheck, title: 'Your team reviews', body: 'Nothing is sent automatically. An agent reads the draft, edits it if needed, and sends it.' },
]

/** A walk through the knowledge base: the five steps from writing an article to a reviewed reply, then what each visibility means. */
export function HowItWorksDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scroll-quiet max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <div className="border-b border-line px-6 py-6 sm:px-8">
          <span className="mb-3 flex size-11 items-center justify-center rounded-panel bg-violet-soft text-violet ring-1 ring-violet/20 ring-inset" aria-hidden>
            <Sparkles className="size-5" />
          </span>
          <DialogTitle className="text-2xl leading-8 font-semibold tracking-tight text-ink">How the knowledge base works</DialogTitle>
          <DialogDescription className="mt-1.5 text-[15px] leading-6 text-ink-2">
            Your articles are what the AI is allowed to quote. If it isn&apos;t written here, the AI won&apos;t claim it. Customers also see matching Public articles as suggestions while they type a new request.
          </DialogDescription>
        </div>

        <ol className="px-6 py-6 sm:px-8">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="relative flex gap-4 pb-6 last:pb-0">
              {i < STEPS.length - 1 && <span className="absolute top-11 bottom-0 left-[19px] w-px bg-line" aria-hidden />}
              <span className="relative flex size-10 shrink-0 items-center justify-center rounded-control bg-ink text-canvas" aria-hidden>
                <Icon className="size-[18px]" />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[15px] font-semibold text-ink">
                  <span className="mr-2 text-ink-3 tabular-nums">{i + 1}.</span>
                  {title}
                </p>
                <p className="mt-1 text-sm leading-6 text-ink-2">{body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="border-t border-line bg-surface-2 px-6 py-6 sm:px-8">
          <h3 className="text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase">Who sees an article</h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {(Object.keys(VISIBILITY) as Visibility[]).map((key) => {
              const v = VISIBILITY[key]
              return (
                <li key={key} className="rounded-control bg-surface p-4 shadow-card">
                  <SolidChip hue={v.hue} icon={v.icon} size="sm">
                    {v.label}
                  </SolidChip>
                  <p className="mt-2.5 text-[13px] leading-5 text-ink-2">{v.hint}</p>
                </li>
              )
            })}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  )
}
