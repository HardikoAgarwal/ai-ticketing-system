import { CircleCheck } from 'lucide-react'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

const TIPS = [
  { title: 'One topic per article', body: 'Short, focused articles are found more accurately than long ones that cover everything.', example: 'Refunds and credits' },
  { title: 'Use exact numbers and timelines', body: 'The AI repeats what you write, so be specific.', example: '"Refunds take 5 to 10 business days."' },
  { title: 'Say what happens next', body: 'End with the next step so replies finish with something the customer can do.', example: '"Reply with your order number and we will start the refund."' },
  { title: 'Separate ideas with a blank line', body: 'Each block becomes a passage the AI can find and cite on its own.', example: 'One paragraph for the rule, one for the exception.' },
]

/** Four writing tips for articles the AI can use well, each with a short example. */
export function TipsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scroll-quiet max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <div className="border-b border-line px-6 py-6 pr-14">
          <DialogTitle className="text-2xl leading-8 font-semibold tracking-tight text-ink">Writing tips</DialogTitle>
          <DialogDescription className="mt-1.5 text-[15px] leading-6 text-ink-2">Articles the AI can use well are short, specific and end with a next step.</DialogDescription>
        </div>
        <ul className="divide-y divide-line px-6">
          {TIPS.map((t) => (
            <li key={t.title} className="flex gap-3 py-5">
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-violet" aria-hidden />
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-ink">{t.title}</p>
                <p className="mt-1 text-sm leading-6 text-ink-2">{t.body}</p>
                <p className="mt-2 rounded-control bg-surface-2 px-3 py-2 text-[13px] text-ink-2">
                  <span className="font-semibold text-ink">For example: </span>
                  {t.example}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
