import { AlertTriangle, BookMarked, Check, ChevronDown, Copy, CornerDownLeft, PencilLine, RefreshCw } from 'lucide-react'
import { useState } from 'react'

import { AiChip, AiSpark, Chip, Skeleton } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { DraftResponse } from '@/lib/types'
import { cn } from '@/lib/utils'

const isLimit = (e: string) => /budget|quota|limit|rate/i.test(e)

/**
 * One slim row at the top of the composer box. It never grows: the full text, sources and the "why" live in a popover.
 * States: loading, writing, ready, already in your reply, failed, quota reached.
 */
export function DraftBar({ draft, loading, inEditor, regenerating, onRegenerate, onUse, disabled }: {
  draft?: DraftResponse
  loading: boolean
  inEditor: boolean
  regenerating: boolean
  onRegenerate: () => void
  onUse: (mode: 'use' | 'edit') => void
  disabled?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const row = 'flex min-h-10 flex-wrap items-center gap-x-2.5 gap-y-1 px-3 py-1.5 text-[13px]'

  if (loading) return <div className={row}><Skeleton className="h-5 w-64 max-w-full" /></div>
  if (!draft || draft.status === 'disabled') return null

  if (draft.status === 'failed') {
    const limited = isLimit(draft.error)
    return (
      <div role="status" className={cn(row, 'bg-butter text-butter-ink')}>
        <AlertTriangle className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
          {limited ? "AI drafts are paused: today's shared budget is used up. Write the reply yourself." : draft.error || 'The AI draft is unavailable right now.'}
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

  if (generating) {
    return (
      <div className={cn(row, 'ai-shimmer')} role="status">
        <AiSpark working className="size-4" />
        <span className="font-semibold text-lav-ink">AI is writing a reply…</span>
        <span className="text-ink-3">Reading the ticket, the customer's facts and your knowledge base.</span>
      </div>
    )
  }

  if (inEditor) {
    return (
      <div className={cn(row, 'bg-lav text-lav-ink')}>
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
    <div className={cn(row, 'bg-lav/60')}>
      <AiSpark className="size-4" />
      <span className="font-semibold text-ink"><span className="sm:hidden">AI draft ready</span><span className="max-sm:hidden">AI drafted a reply</span></span>
      <AiChip size="sm" icon={BookMarked} className="max-sm:hidden">{citations.length ? `${citations.length} source${citations.length > 1 ? 's' : ''}` : 'No sources'}</AiChip>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="text-lav-ink max-sm:px-2">Preview <ChevronDown /></Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(32rem,92vw)] p-0">
          <div className="max-h-64 overflow-y-auto px-4 py-3 text-[14px] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap text-ink">{content}</div>
          <div className="space-y-2.5 border-t border-line px-4 py-3">
            {citations.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {citations.map((c) => (
                  <Chip key={c.article_id} tone="slate" icon={BookMarked} size="sm" title={c.title}><span className="max-w-48 truncate">{c.title}</span></Chip>
                ))}
              </div>
            ) : (
              <p className="text-xs text-butter-ink">Nothing in the knowledge base matched. Check facts and tone carefully.</p>
            )}
            <p className="text-xs leading-relaxed text-ink-3">
              Why this draft: the AI read this ticket, the customer's account facts and the articles above. Dates and amounts come from your records, not the model. It never sends anything; you decide.
              {draft.draft?.model && <> Written by {draft.draft.model}.</>}
            </p>
          </div>
          <div className="flex items-center gap-2 border-t border-line px-3 py-2">
            <Button variant="ghost" size="sm" onClick={copy}>{copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy'}</Button>
            <Button variant="ghost" size="sm" onClick={onRegenerate}><RefreshCw /> Regenerate</Button>
            <Button variant="outline" size="sm" className="ml-auto" disabled={disabled} onClick={() => { setOpen(false); onUse('edit') }}><PencilLine /> Edit</Button>
            <Button size="sm" disabled={disabled} onClick={() => { setOpen(false); onUse('use') }}><CornerDownLeft /> Use draft</Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button size="sm" className="ml-auto" onClick={() => onUse('use')} disabled={disabled}><CornerDownLeft /> Use draft</Button>
    </div>
  )
}
