import { Bot } from 'lucide-react'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

/** What the AI will be given from this article: the passages it is cut into, updating as you write. */
export function AiPreviewDialog({ open, onOpenChange, passages, title }: { open: boolean; onOpenChange: (open: boolean) => void; passages: string[]; title: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scroll-quiet max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <div className="border-b border-line px-6 py-6">
          <span className="mb-3 flex size-11 items-center justify-center rounded-panel bg-lav text-ai ring-1 ring-lav-line ring-inset" aria-hidden>
            <Bot className="size-5" />
          </span>
          <DialogTitle className="text-2xl leading-8 font-semibold tracking-tight text-ink">How the AI will read this</DialogTitle>
          <DialogDescription className="mt-1.5 text-[15px] leading-6 text-ink-2">
            Your article is cut into passages. For each ticket the AI is given the most relevant ones and cites the article. Blank lines are where one passage ends and the next begins.
          </DialogDescription>
        </div>
        <div className="px-6 py-6">
          {passages.length === 0 ? (
            <p className="rounded-control border border-dashed border-line-strong p-6 text-center text-sm text-ink-3">Start writing and the passages appear here.</p>
          ) : (
            <ol className="space-y-3">
              {passages.map((p, i) => (
                <li key={i} className="rounded-control bg-surface-2 p-4">
                  <p className="mb-1.5 text-xs font-semibold text-ink-3">
                    {title.trim() || 'Untitled'} · passage {i + 1} of {passages.length}
                  </p>
                  <p className="text-sm leading-6 whitespace-pre-line text-ink-2">{p}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
