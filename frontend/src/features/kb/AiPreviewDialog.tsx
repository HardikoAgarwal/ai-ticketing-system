import { fill, on, type Hue } from '@/components/ds'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

const HUES: Hue[] = ['mint', 'lav', 'sky', 'peach', 'rose', 'butter']

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-control bg-surface-2 px-4 py-3">
      <dd className="text-2xl leading-7 font-semibold tracking-tight text-ink tabular-nums">{value}</dd>
      <dt className="text-xs font-medium text-ink-2">{label}</dt>
    </div>
  )
}

/**
 * What the AI will be given from this article. A bar shows how the text is cut into passages (each colour is one passage, sized by
 * length), then each passage is listed with the same colour, so you can see exactly where one ends and the next begins.
 */
export function AiPreviewDialog({ open, onOpenChange, passages, title }: { open: boolean; onOpenChange: (open: boolean) => void; passages: string[]; title: string }) {
  const total = passages.reduce((n, p) => n + p.length, 0)
  const words = passages.join(' ').trim().split(/\s+/).filter(Boolean).length
  const longest = Math.max(0, ...passages.map((p) => p.length))
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scroll-quiet max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <div className="border-b border-line px-6 py-6 pr-14 sm:px-8">
          <DialogTitle className="text-2xl leading-8 font-semibold tracking-tight text-ink">How the AI will read this</DialogTitle>
          <DialogDescription className="mt-1.5 text-[15px] leading-6 text-ink-2">
            Your article is cut into passages. For each ticket the AI is given the most relevant ones and cites the article. A blank line is where one passage can end and the next begin.
          </DialogDescription>
        </div>

        {passages.length === 0 ? (
          <div className="px-6 py-10 sm:px-8">
            <p className="rounded-control border border-dashed border-line-strong p-8 text-center text-sm text-ink-3">Start writing and the passages appear here.</p>
          </div>
        ) : (
          <div className="space-y-6 px-6 py-6 sm:px-8">
            <dl className="grid grid-cols-3 gap-3">
              <Stat label={passages.length === 1 ? 'Passage' : 'Passages'} value={passages.length} />
              <Stat label="Words" value={words} />
              <Stat label="Longest passage (characters)" value={longest} />
            </dl>

            <div>
              <p className="mb-2 text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase">How your article is split</p>
              <div className="flex h-9 gap-1" role="img" aria-label={`The article is split into ${passages.length} passages`}>
                {passages.map((p, i) => (
                  <div key={i} className="flex min-w-7 items-center justify-center rounded-md text-xs font-bold" style={{ flexGrow: Math.max(p.length, 1), flexBasis: 0, background: fill(HUES[i % HUES.length]), color: on(HUES[i % HUES.length]) }}>
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>

            <ol className="space-y-3">
              {passages.map((p, i) => {
                const hue = HUES[i % HUES.length]
                return (
                  <li key={i} className="rounded-control bg-surface-2 p-4">
                    <div className="mb-2 flex items-center gap-3">
                      <span className="flex size-7 items-center justify-center rounded-md text-xs font-bold" style={{ background: fill(hue), color: on(hue) }}>
                        {i + 1}
                      </span>
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{title.trim() || 'Untitled'}</p>
                      <span className="text-xs text-ink-2 tabular-nums">
                        {p.length} characters · {total ? Math.round((p.length / total) * 100) : 0}%
                      </span>
                    </div>
                    <p className="text-sm leading-6 whitespace-pre-line text-ink-2">{p}</p>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
