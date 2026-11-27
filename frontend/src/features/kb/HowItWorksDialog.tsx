import { SolidChip } from '@/components/ds'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

import { VISIBILITY, type Visibility } from './kb-utils'

const STEPS = [
  { title: 'You write short articles', body: 'One topic per article, in plain words: refunds, delivery times, password resets.' },
  { title: 'We prepare them for search', body: 'Each article is cut into short passages and indexed. "AI ready" means it can be found; it takes a moment after you save.' },
  { title: 'A customer asks', body: 'We find the passages closest in meaning to the question, not just the ones with the same words.' },
  { title: 'The AI drafts from them', body: 'It writes a reply from only those passages and cites each article. If nothing covers it, it says it cannot confirm.' },
  { title: 'Your team reviews', body: 'Nothing is sent automatically. An agent reads the draft, edits it and sends it.' },
]

/** The knowledge base in five short steps, then what each visibility means. Same plain header and divided list as the Writing tips modal. */
export function HowItWorksDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scroll-quiet max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <div className="border-b border-line px-6 py-6 pr-14">
          <DialogTitle className="text-2xl leading-8 font-semibold tracking-tight text-ink">How it works</DialogTitle>
          <DialogDescription className="mt-1.5 text-[15px] leading-6 text-ink-2">The AI only quotes what is written in your articles. If it isn&apos;t here, it won&apos;t claim it.</DialogDescription>
        </div>

        <ol className="divide-y divide-line px-6">
          {STEPS.map(({ title, body }, i) => (
            <li key={title} className="flex gap-3 py-5">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-sunken text-xs font-bold text-ink-2 tabular-nums" aria-hidden>
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-ink">{title}</p>
                <p className="mt-1 text-sm leading-6 text-ink-2">{body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="border-t border-line bg-surface-2 px-6 py-6">
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
