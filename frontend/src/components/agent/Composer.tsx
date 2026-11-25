import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  BookMarked,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  CornerDownLeft,
  Eye,
  Loader2,
  Lock,
  MessageSquareText,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { ConfirmDialog, type ConfirmOptions } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { errorMessage } from '@/lib/api'
import type { DraftResponse, Macro, StaffTicketDetail } from '@/lib/types'
import { cn } from '@/lib/utils'

const SKIP_PREVIEW_KEY = 'helpdesk.skip-send-preview'

export function usePersistentText(key: string) {
  const [value, setValue] = useState(() => localStorage.getItem(key) ?? '')
  useEffect(() => {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  }, [key, value])
  return [value, setValue] as const
}

export function Composer({ ticket }: { ticket: StaffTicketDetail }) {
  const { user } = useAuth()
  const { slug, api } = useWorkspace()
  const queryClient = useQueryClient()
  const [reply, setReply] = usePersistentText(`helpdesk.reply.${slug}.${ticket.id}`)
  const [loadedDraft, setLoadedDraft] = useState<{ id: number; content: string } | null>(null)
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  const [preview, setPreview] = useState<{ resolve: boolean } | null>(null)
  const [skipPreview, setSkipPreview] = useState(() => sessionStorage.getItem(SKIP_PREVIEW_KEY) === '1')
  const [expanded, setExpanded] = useState(false)
  const [mode, setMode] = useState<'reply' | 'note'>('reply')
  const [note, setNote] = usePersistentText(`helpdesk.note.${slug}.${ticket.id}`)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const replyCount = ticket.messages.filter((m) => !m.is_internal).length
  const lastCount = useRef(replyCount)
  const [newActivity, setNewActivity] = useState(false)

  const closed = ticket.status === 'CLOSED'
  const draftQuery = useQuery({
    queryKey: ['draft', ticket.id, slug],
    queryFn: () => api.tickets.draft(ticket.id),
    refetchInterval: (q) => (q.state.data?.status === 'generating' ? 3000 : false),
    enabled: !closed,
  })
  const macros = useQuery({ queryKey: ['macros', slug], queryFn: api.macros, staleTime: 60_000 })
  const draft = draftQuery.data

  // A reply restored from localStorage that matches the draft still counts as AI-assisted.
  useEffect(() => {
    if (draft?.status !== 'ready' || !draft.draft || loadedDraft) return
    if (reply.trim() && reply.trim() === draft.draft.content.trim()) {
      setLoadedDraft({ id: draft.draft.id, content: draft.draft.content })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.status, draft?.draft?.id])

  useEffect(() => {
    if (replyCount > lastCount.current && reply.trim()) setNewActivity(true)
    lastCount.current = replyCount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replyCount])

  const usingDraft = !!loadedDraft && reply.trim().length > 0
  const editedFromDraft = usingDraft && reply.trim() !== loadedDraft!.content.trim()

  const send = useMutation({
    mutationFn: (vars: { resolve?: boolean }) =>
      api.tickets.postMessage(ticket.id, {
        body: reply,
        kind: 'REPLY',
        resolve: vars.resolve,
        ai_draft_id: usingDraft ? loadedDraft?.id : null,
      }),
    onSuccess: (_data, vars) => {
      setReply('')
      setLoadedDraft(null)
      setNewActivity(false)
      toast.success(vars.resolve ? 'Reply sent and ticket resolved' : 'Reply sent', {
        description: 'The customer sees it instantly.',
      })
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const addNote = useMutation({
    mutationFn: () => api.tickets.postMessage(ticket.id, { body: note, kind: 'NOTE' }),
    onSuccess: () => {
      setNote('')
      toast.success('Internal note added', { description: 'Only your team can see it.' })
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const regenerate = useMutation({
    mutationFn: () => api.tickets.regenerateDraft(ticket.id),
    onSuccess: (data) => queryClient.setQueryData(['draft', ticket.id, slug], data),
    onError: (err) => toast.error(errorMessage(err)),
  })

  const firstName = ticket.requester.name.split(' ')[0]

  const insertDraft = () => {
    if (!draft?.draft) return
    const { id, content } = draft.draft
    const apply = () => {
      setReply(content)
      setLoadedDraft({ id, content })
      setExpanded(false)
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
    const ownText = reply.trim() && (!usingDraft || editedFromDraft || loadedDraft?.id !== id)
    if (ownText) {
      setConfirm({
        title: 'Replace your reply?',
        description: 'The AI draft will replace what you have written so far.',
        confirmLabel: 'Replace',
        onConfirm: apply,
      })
    } else apply()
  }

  const insertMacro = (m: Macro) => {
    const body = m.body.replaceAll('{{name}}', firstName)
    setReply((cur) => (cur.trim() ? `${cur.trimEnd()}\n\n${body}` : body))
    setLoadedDraft(null)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const requestSend = (resolve: boolean) => {
    if (!reply.trim()) return
    if (skipPreview) send.mutate({ resolve })
    else setPreview({ resolve })
  }

  const assignedElsewhere = ticket.assigned_to && ticket.assigned_to.id !== user?.id

  const noteMode = mode === 'note'
  const submitNote = () => note.trim() && !addNote.isPending && addNote.mutate()

  return (
    <div className="shrink-0 border-t border-slate-200/80 bg-slate-50/80 px-3 py-3 sm:px-5 sm:py-4">
      {!noteMode && !closed && !draftQuery.isLoading && (
        <DraftDock
          draft={draft}
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
          inEditor={usingDraft && loadedDraft?.id === draft?.draft?.id && !editedFromDraft}
          regenerating={regenerate.isPending}
          onRegenerate={() => regenerate.mutate()}
          onUse={insertDraft}
        />
      )}

      {!noteMode && newActivity && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">
          {firstName} sent a new message while you were writing. Your text is safe; read it before sending.
          <button className="font-medium text-foreground underline" onClick={() => setNewActivity(false)}>
            Dismiss
          </button>
        </div>
      )}
      {!noteMode && assignedElsewhere && !closed && (
        <p className="mb-3 flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">
          <AlertTriangle className="size-3.5 text-amber-600" /> Assigned to {ticket.assigned_to!.full_name}. You can still reply; assignment won't change.
        </p>
      )}

      <div
        className={cn(
          'overflow-hidden rounded-2xl border border-slate-200 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.06),0_6px_18px_-10px_rgba(15,23,42,0.18)] transition-colors focus-within:ring-3',
          noteMode ? 'border-amber-300 bg-amber-50/40 focus-within:ring-amber-400/20' : usingDraft ? 'border-violet-300 focus-within:ring-violet-500/15' : 'focus-within:border-ring focus-within:ring-ring/30',
        )}
      >
        <div role="tablist" aria-label="Message type" className="flex items-center gap-1 border-b px-2.5 pt-2">
          {(
            [
              ['reply', `Reply to ${firstName}`, <Send key="i" className="size-3.5" />],
              ['note', 'Internal note', <Lock key="i" className="size-3.5" />],
            ] as const
          ).map(([key, label, icon]) => (
            <button
              key={key}
              role="tab"
              aria-selected={mode === key}
              onClick={() => setMode(key)}
              className={cn(
                '-mb-px flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none',
                mode === key ? (key === 'note' ? 'border-amber-500 text-amber-800' : 'border-primary text-primary') : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {icon} {label}
            </button>
          ))}
          <span className="ml-auto hidden items-center gap-1 pr-2 text-[11px] text-muted-foreground sm:flex">
            {noteMode ? (
              <>
                <Lock className="size-3" /> Team only. {firstName} never sees notes.
              </>
            ) : (
              <>Visible to {firstName} instantly</>
            )}
          </span>
        </div>

        {noteMode ? (
          <Textarea
            key="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitNote()
            }}
            placeholder="Add context for the team, e.g. “Confirmed duplicate in the billing console”…"
            aria-label="Internal note"
            className="max-h-72 min-h-28 resize-none rounded-none border-0 bg-transparent px-5 py-4 text-[15px] leading-relaxed shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
        ) : closed ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            This ticket is closed. Change the status to <span className="font-medium text-foreground">In Progress</span> to reply, or add an internal note.
          </div>
        ) : (
          <Textarea
            key="reply"
            ref={textareaRef}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) requestSend(false)
            }}
            placeholder={`Write your reply to ${firstName}…`}
            aria-label={`Reply to ${firstName}`}
            className="max-h-72 min-h-28 resize-none rounded-none border-0 bg-transparent px-5 py-4 text-[15px] leading-relaxed shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            {!noteMode && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={!macros.data?.length || closed}>
                    <MessageSquareText /> Macros
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Insert a canned reply</DropdownMenuLabel>
                  {macros.data?.map((m) => (
                    <DropdownMenuItem key={m.id} onClick={() => insertMacro(m)}>
                      {m.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {!noteMode && usingDraft ? (
              <p className="hidden items-center gap-1.5 text-xs font-medium text-violet-700 sm:flex">
                <Sparkles className="size-3.5" />
                {editedFromDraft ? 'From AI draft, edited by you' : 'From AI draft, review before sending'}
              </p>
            ) : (
              <p className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
                <Kbd>⌘</Kbd>
                <Kbd>Enter</Kbd>
                <span className="ml-0.5">to {noteMode ? 'add' : 'send'}</span>
              </p>
            )}
          </div>
          {noteMode ? (
            <Button onClick={submitNote} disabled={!note.trim() || addNote.isPending} variant="outline" className="shrink-0 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100">
              {addNote.isPending ? <Loader2 className="animate-spin" /> : <Lock />} Add note
            </Button>
          ) : (
            <Button onClick={() => requestSend(false)} disabled={!reply.trim() || send.isPending || closed} className="shrink-0">
              {send.isPending ? <Loader2 className="animate-spin" /> : <Send />} {usingDraft && !skipPreview ? 'Review & send' : 'Send'}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <Eye className="size-4" /> Preview: what {firstName} will see
              </span>
            </DialogTitle>
            <DialogDescription>
              {preview?.resolve ? 'The ticket will be marked Resolved and the customer asked to confirm.' : 'The ticket will move to In Progress.'}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto rounded-xl border border-primary/15 bg-primary/[0.05] p-4 text-sm leading-relaxed whitespace-pre-wrap">
            {reply}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={skipPreview}
              onCheckedChange={(v) => {
                setSkipPreview(!!v)
                sessionStorage.setItem(SKIP_PREVIEW_KEY, v ? '1' : '0')
              }}
            />
            Don't show this preview again this session
          </label>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPreview(null)}>
              Keep editing
            </Button>
            <Button
              onClick={() => {
                send.mutate({ resolve: preview?.resolve })
                setPreview(null)
              }}
            >
              <Send /> {preview?.resolve ? 'Send & resolve' : 'Send reply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-card px-1 font-sans text-[10px] font-medium text-foreground/70 shadow-xs">
      {children}
    </kbd>
  )
}

function AiMark({ className }: { className?: string }) {
  return (
    <span className={cn('flex shrink-0 items-center justify-center bg-linear-to-br from-violet-500 via-fuchsia-500 to-sky-400 text-white', className)}>
      <Sparkles className="size-[55%]" />
    </span>
  )
}

/** Floating AI draft above the reply box: a chip when collapsed, a review card (with citations) when expanded. */
function DraftDock({
  draft,
  expanded,
  onToggle,
  inEditor,
  regenerating,
  onRegenerate,
  onUse,
}: {
  draft?: DraftResponse
  expanded: boolean
  onToggle: () => void
  inEditor: boolean
  regenerating: boolean
  onRegenerate: () => void
  onUse: () => void
}) {
  const [copied, setCopied] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!expanded) return
    cardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onToggle()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded, onToggle])

  if (!draft || draft.status === 'disabled') return null

  if (draft.status === 'failed') {
    return (
      <div className="mb-3 flex">
        <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 py-1 pr-1 pl-3 text-xs text-amber-900 shadow-md">
          <AlertTriangle className="size-3.5 text-amber-600" />
          <span className="max-w-[60vw] truncate">{draft.error || 'AI draft unavailable'}</span>
          <Button variant="ghost" size="xs" onClick={onRegenerate} disabled={regenerating} className="h-6 rounded-full px-2 text-amber-900 hover:bg-amber-100">
            <RefreshCw className={cn(regenerating && 'animate-spin')} /> Try again
          </Button>
        </div>
      </div>
    )
  }

  const generating = draft.status === 'generating'
  const citations = draft.draft?.citations ?? []
  const summary = generating ? 'Writing a reply…' : inEditor ? 'In your reply' : citations.length ? `Ready · ${citations.length} source${citations.length > 1 ? 's' : ''}` : 'Ready to review'

  const copy = async () => {
    if (!draft.draft) return
    await navigator.clipboard.writeText(draft.draft.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mb-3 flex flex-col items-start">
      {expanded ? (
        <div ref={cardRef} className="ai-ring w-full animate-in rounded-2xl shadow-md duration-200 fade-in slide-in-from-bottom-2">
          <div className="overflow-hidden rounded-[calc(var(--radius-2xl)-2px)] bg-card">
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <AiMark className={cn('size-8 rounded-lg', generating && 'animate-pulse')} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <span className="bg-linear-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">AI draft</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-600/20 ring-inset">
                    {generating && <Loader2 className="size-3 animate-spin" />}
                    {generating ? 'Writing…' : inEditor ? 'In your reply' : 'Ready to review'}
                  </span>
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  {generating ? (
                    'Reading the ticket, customer facts and knowledge base…'
                  ) : citations.length ? (
                    <>
                      Grounded in
                      {citations.map((c) => (
                        <span key={c.article_id} className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground/80" title={`Relevance ${(c.score * 100).toFixed(0)}%`}>
                          <BookMarked className="size-3" /> {c.title}
                        </span>
                      ))}
                    </>
                  ) : (
                    'No matching articles found. Check facts and tone before sending.'
                  )}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onToggle} aria-label="Collapse AI draft">
                <ChevronDown />
              </Button>
            </div>

            {generating ? (
              <div className="space-y-3 px-5 py-5">
                <div className="ai-shimmer h-3 w-1/4 rounded-full" />
                <div className="ai-shimmer h-3 w-full rounded-full" />
                <div className="ai-shimmer h-3 w-11/12 rounded-full" />
                <div className="ai-shimmer h-3 w-2/3 rounded-full" />
              </div>
            ) : (
              <div className="max-h-[min(150px,20vh)] overflow-y-auto px-5 py-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                {draft.draft?.content}
              </div>
            )}

            <div className="flex items-center gap-2 border-t bg-muted/30 px-4 py-2.5">
              <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={regenerating || generating} className="-ml-2">
                <RefreshCw className={cn((regenerating || generating) && 'animate-spin')} /> Regenerate
              </Button>
              <Button variant="ghost" size="sm" onClick={copy} disabled={generating}>
                {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button size="sm" className="ml-auto" onClick={onUse} disabled={generating || inEditor}>
                {inEditor ? <Check /> : <CornerDownLeft />} {inEditor ? 'In your reply' : 'Use this draft'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          className="ai-ring rounded-full shadow-md transition-transform hover:-translate-y-0.5"
          aria-label="Show AI draft"
        >
          <span className="flex items-center gap-2 rounded-full bg-card py-1.5 pr-3 pl-1.5 text-xs">
            <AiMark className={cn('size-6 rounded-full', generating && 'animate-pulse')} />
            <span className="bg-linear-to-r from-violet-600 to-fuchsia-600 bg-clip-text font-semibold text-transparent">AI draft</span>
            <span className="text-muted-foreground">{summary}</span>
            {generating ? <Loader2 className="size-3.5 animate-spin text-violet-600" /> : <ChevronUp className="size-3.5 text-muted-foreground" />}
          </span>
        </button>
      )}
    </div>
  )
}
