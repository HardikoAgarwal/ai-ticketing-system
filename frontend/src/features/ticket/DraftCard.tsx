import { AlertTriangle, BookMarked, Check, ChevronDown, ChevronUp, Copy, CornerDownLeft, Info, PencilLine, RefreshCw } from 'lucide-react'
import { useState } from 'react'

import { AiChip, AiSpark, AiSurface, Chip, Skeleton } from '@/components/ds'
import { Button } from '@/components/ui/button'
import type { DraftResponse } from '@/lib/types'
import { cn } from '@/lib/utils'

const isLimit = (e: string) => /budget|quota|limit|rate/i.test(e)

/** The AI's suggested reply. Every state of the draft pipeline has its own treatment: loading, writing, ready, in the editor, failed, limited. */
export function DraftCard({ draft, loading, inEditor, regenerating, expanded, onToggle, onRegenerate, onUse, disabled }: {
  draft?: DraftResponse
  loading: boolean
  inEditor: boolean
  regenerating: boolean
  expanded: boolean
  onToggle: () => void
  onRegenerate: () => void
  onUse: (mode: 'use' | 'edit') => void
  disabled?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const [why, setWhy] = useState(false)

  if (loading) return <Skeleton className="mb-3 h-11 w-full rounded-panel" />
  if (!draft || draft.status === 'disabled') return null

  if (draft.status === 'failed') {
    const limited = isLimit(draft.error)
    return (
      <div role="status" className="mb-3 flex flex-wrap items-center gap-2 rounded-panel border border-butter-line bg-butter px-3.5 py-2.5 text-[13px] text-butter-ink">
        <AlertTriangle className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
          {limited ? "AI drafts are paused: today's shared budget is used up. You can still write the reply yourself." : draft.error || 'The AI draft is unavailable right now.'}
        </span>
        {!limited && (
          <Button variant="outline" size="sm" onClick={onRegenerate} disabled={regenerating}>
            <RefreshCw className={cn(regenerating && 'animate-spin')} /> Try again
          </Button>
        )}
      </div>
    )
  }

  const generating = draft.status === 'generating' || regenerating
  const citations = draft.draft?.citations ?? []
  const content = draft.draft?.content ?? ''

  if (inEditor && !generating) {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-panel border border-lav-line bg-lav px-3.5 py-2 text-[13px] text-lav-ink">
        <Check className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 font-medium">The AI draft is in your reply. Check the facts, then send.</span>
        <Button variant="ghost" size="sm" onClick={onRegenerate} className="text-lav-ink"><RefreshCw /> Regenerate</Button>
      </div>
    )
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <AiSurface working={generating} aria-label="AI suggested reply" className="mb-3">
      <div className="flex items-center gap-3 px-4 py-3">
        <AiSpark working={generating} className="size-5" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-ink">
            <span className="whitespace-nowrap">Suggested reply</span>
            {generating ? (
              <AiChip size="sm" working>Writing…</AiChip>
            ) : (
              <AiChip size="sm" icon={citations.length ? BookMarked : Info}>{citations.length ? `${citations.length} source${citations.length > 1 ? 's' : ''}` : 'No sources'}</AiChip>
            )}
          </p>
          <p className="mt-0.5 text-xs text-ink-3">
            {generating ? 'Reading the ticket, the customer facts and the knowledge base…' : citations.length ? 'Grounded in your knowledge base. Check the facts before sending.' : 'Nothing in the knowledge base matched. Check facts and tone carefully.'}
          </p>
        </div>
        {!expanded && !generating && (
          <Button size="sm" onClick={() => onUse('use')} disabled={disabled}>
            <CornerDownLeft /> Use draft
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onToggle} aria-expanded={expanded} aria-label={expanded ? 'Collapse suggested reply' : 'Expand suggested reply'}>
          {expanded ? <ChevronDown /> : <ChevronUp />}
        </Button>
      </div>

      {expanded && (
        <>
          <div className="border-t border-line px-4 py-3">
            {generating ? (
              <div className="space-y-2.5" aria-hidden>
                <div className="ai-shimmer h-3 w-1/4 rounded-chip" />
                <div className="ai-shimmer h-3 w-full rounded-chip" />
                <div className="ai-shimmer h-3 w-11/12 rounded-chip" />
                <div className="ai-shimmer h-3 w-2/3 rounded-chip" />
              </div>
            ) : (
              <>
                <p className="max-h-32 overflow-y-auto text-[14px] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap text-ink-2">{content}</p>
                {citations.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {citations.map((c) => (
                      <Chip key={c.article_id} tone="slate" icon={BookMarked} size="sm" title={c.title}>
                        <span className="max-w-48 truncate">{c.title}</span>
                      </Chip>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => setWhy((v) => !v)} aria-expanded={why} className="mt-3 text-xs font-medium text-lav-ink underline-offset-2 hover:underline">
                  Why this draft?
                </button>
                {why && (
                  <p className="mt-1.5 rounded-control bg-surface-2 px-3 py-2 text-xs leading-relaxed text-ink-3">
                    The AI read this ticket, the customer's account facts and the knowledge base articles listed above. Facts such as dates and amounts come from your records, not from the model. It never sends anything: you review and decide.
                    {draft.draft?.model && <> Written by {draft.draft.model}.</>}
                  </p>
                )}
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2.5">
            <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={generating}>
              <RefreshCw className={cn(generating && 'animate-spin')} /> Regenerate
            </Button>
            <Button variant="ghost" size="sm" onClick={copy} disabled={generating}>
              {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy'}
            </Button>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onUse('edit')} disabled={generating || disabled}>
                <PencilLine /> Edit
              </Button>
              <Button size="sm" onClick={() => onUse('use')} disabled={generating || disabled}>
                <CornerDownLeft /> Use draft
              </Button>
            </div>
          </div>
        </>
      )}
    </AiSurface>
  )
}
