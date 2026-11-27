import { formatDistanceToNowStrict, parseISO } from 'date-fns'
import { AlertTriangle, BookMarked, Check, ChevronDown, ChevronUp, Copy, CornerDownLeft, RefreshCw } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { AiSpark, Skeleton } from '@/components/ds'
import { Button } from '@/components/ui/button'
import type { DraftResponse } from '@/lib/types'
import { cn } from '@/lib/utils'

const isLimit = (e: string) => /budget|quota|limit|rate/i.test(e)

/**
 * A tab hanging off the top edge of the message box, like the header's "First response" tab. It runs 8px under the box so the box's
 * top edge reads as the seam and the tab looks attached.
 */
function Tab({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn('-mb-2 ml-4 inline-flex h-10 max-w-[calc(100%-2rem)] items-center gap-1.5 rounded-t-xl border border-b-0 bg-surface px-3 pb-2 text-[13px] font-semibold whitespace-nowrap', className)}
    >
      {children}
    </div>
  )
}

/**
 * The AI draft as a tab on top of the message box. A ready draft grows from the tab into a card the width of the box, still attached
 * to it, with the reply, its sources and the actions; nothing goes into the box until "Use draft". Outside click or Esc closes it.
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
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (loading) return <Skeleton className="-mb-2 ml-4 h-10 w-48 rounded-t-xl rounded-b-none" />
  if (!draft || draft.status === 'disabled') return null

  if (draft.status === 'failed') {
    const limited = isLimit(draft.error)
    const text = limited ? "AI drafts are paused: today's budget is used up" : draft.error || 'The AI draft is unavailable right now'
    return (
      <Tab role="status" title={text} className="border-butter-line text-butter-ink">
        <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{text}</span>
        {!limited && (
          <button type="button" onClick={onRegenerate} disabled={regenerating} className="ml-1 inline-flex shrink-0 items-center gap-1 underline-offset-2 hover:underline">
            <RefreshCw className={cn('size-3.5', regenerating && 'animate-spin')} aria-hidden /> Try again
          </button>
        )}
      </Tab>
    )
  }

  if (draft.status === 'generating' || regenerating) {
    return (
      <Tab role="status" className="ai-border border-transparent text-lav-ink">
        <AiSpark working className="size-3.5" />
        <span className="truncate">AI is writing a reply…</span>
      </Tab>
    )
  }

  if (inEditor) {
    return (
      <Tab className="border-lav-line pr-1.5 text-lav-ink">
        <Check className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">AI draft is in your reply</span>
        <button type="button" onClick={onRegenerate} className="ml-1 inline-flex h-6 shrink-0 items-center gap-1 rounded-lg px-1.5 hover:bg-lav">
          <RefreshCw className="size-3.5" aria-hidden /> Regenerate
        </button>
      </Tab>
    )
  }

  const d = draft.draft
  const citations = d?.citations ?? []
  const content = d?.content ?? ''
  const sources = citations.length ? `${citations.length} source${citations.length > 1 ? 's' : ''}` : 'no sources'
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }
  const grow = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 420, damping: 38, mass: 0.9 }

  return (
    <div ref={ref} className="flex w-full items-end">
      <AnimatePresence initial={false} mode="popLayout">
        {open ? (
          <motion.div
            key="card"
            layoutId="ai-draft"
            transition={grow}
            style={{ borderRadius: 16 }}
            className="ai-halo mb-4 w-full dark:after:opacity-30"
          >
            <div className="ai-border ai-surface rounded-[inherit]" role="region" aria-label="AI suggested reply">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: reduce ? 0 : 0.12, duration: 0.18 } }}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
              >
                <div className="flex items-center gap-2 px-4 pt-2.5 pb-1.5">
                  <AiSpark className="size-4" />
                  <span className="text-[13.5px] font-semibold text-lav-ink">Suggested reply</span>
                  {d && <span className="text-xs text-ink-3">· {d.model} · {formatDistanceToNowStrict(parseISO(d.created_at), { addSuffix: true })}</span>}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Hide suggested reply"
                    className="ml-auto inline-flex size-7 items-center justify-center rounded-full text-ink-3 hover:bg-lav hover:text-lav-ink"
                  >
                    <ChevronDown className="size-4" aria-hidden />
                  </button>
                </div>

                <div className="scroll-quiet max-h-[min(9rem,22svh)] overflow-y-auto px-4 pb-2 text-[14px] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap text-ink">{content}</div>

                <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 pt-2 pb-2.5">
                  {citations.length > 0 ? (
                    citations.map((c) => (
                      <span key={c.article_id} title={`${c.title} · ${Math.round(c.score * 100)}% match`} className="inline-flex h-7 max-w-56 items-center gap-1.5 rounded-full bg-lav px-2.5 text-xs font-medium text-lav-ink">
                        <BookMarked className="size-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{c.title}</span>
                        <span className="shrink-0 opacity-70">{Math.round(c.score * 100)}%</span>
                      </span>
                    ))
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-butter-ink">
                      <AlertTriangle className="size-3.5" aria-hidden /> No article matched; check facts carefully
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={copy}>{copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy'}</Button>
                    <Button variant="ghost" size="sm" onClick={onRegenerate}><RefreshCw /> Regenerate</Button>
                    <Button
                      size="sm"
                      disabled={disabled}
                      onClick={() => {
                        setOpen(false)
                        onUse('use')
                      }}
                    >
                      <CornerDownLeft /> Use draft
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="tab" layoutId="ai-draft" transition={grow} style={{ borderRadius: '12px 12px 0 0' }} className="ai-halo -mb-2 ml-4 max-w-[calc(100%-2rem)] dark:after:opacity-30">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={false}
              className="ai-border inline-flex h-10 max-w-full cursor-pointer items-center gap-1.5 rounded-[inherit] bg-surface px-3 pb-2 text-[13px] font-semibold whitespace-nowrap text-lav-ink transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
            >
              <AiSpark className="size-3.5" />
              <motion.span layout="position" className="truncate">AI drafted a reply</motion.span>
              <span className="font-medium text-ink-3 max-sm:hidden">· {sources}</span>
              <ChevronUp className="size-3.5 shrink-0" aria-hidden />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
