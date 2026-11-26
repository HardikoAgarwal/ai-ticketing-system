import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ChevronDown, Eye, Loader2, Lock, MessageSquareText, RotateCcw, Send, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { ConfirmDialog, type ConfirmOptions } from '@/components/ConfirmDialog'
import { Kbd, SegmentedControl } from '@/components/ds'
import { announce } from '@/components/shell/announce'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { errorMessage } from '@/lib/api'
import { usePersistentText } from '@/lib/use-persistent-text'
import type { DraftResponse, Macro, StaffTicketDetail } from '@/lib/types'
import { cn } from '@/lib/utils'

import { DraftBar } from './DraftBar'
import { draftBarVisible, waitingOnUs } from './ticket-ui'
import type { TicketState } from './use-ticket'

const SKIP_PREVIEW_KEY = 'helpdesk.skip-send-preview'
export type ComposerMode = 'reply' | 'note'

interface FailedSend {
  body: string
  resolve: boolean
  draftId: number | null
}

/** One docked block at the bottom of the conversation: mode switch, the AI draft bar, the text, the toolbar. Nothing floats; the thread above it scrolls. */
export function Composer({ ticket, t, mode, onModeChange, focusTick, readOnly, onReopen }: {
  ticket: StaffTicketDetail
  t: TicketState
  mode: ComposerMode
  onModeChange: (m: ComposerMode) => void
  focusTick: number
  readOnly: boolean
  onReopen: () => void
}) {
  const { user } = useAuth()
  const { slug, api } = useWorkspace()
  const queryClient = useQueryClient()
  const ticketKey = ['ticket', ticket.id, slug] as const
  const [reply, setReply] = usePersistentText(`helpdesk.reply.${slug}.${ticket.id}`)
  const [note, setNote] = usePersistentText(`helpdesk.note.${slug}.${ticket.id}`)
  const [loadedDraft, setLoadedDraft] = useState<{ id: number; content: string } | null>(null)
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  const [preview, setPreview] = useState<{ resolve: boolean } | null>(null)
  const [skipPreview, setSkipPreview] = useState(() => {
    try {
      return sessionStorage.getItem(SKIP_PREVIEW_KEY) === '1'
    } catch {
      return false
    }
  })
  const [failed, setFailed] = useState<FailedSend | null>(null)
  const [newActivity, setNewActivity] = useState(false)
  const replyRef = useRef<HTMLTextAreaElement>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)

  const closed = ticket.status === 'CLOSED'
  const resolved = ticket.status === 'RESOLVED'
  const noteMode = mode === 'note'
  const firstName = ticket.requester.name.split(' ')[0]
  const draft: DraftResponse | undefined = t.draft.data
  const macros = useQuery({ queryKey: ['macros', slug], queryFn: api.macros, staleTime: 60_000 })
  const replyCount = ticket.messages.filter((m) => !m.is_internal && m.id > 0).length
  const lastCount = useRef(replyCount)

  // Focus the active field when asked (R / N shortcuts, palette commands).
  useEffect(() => {
    if (!focusTick) return
    const el = noteMode ? noteRef.current : replyRef.current
    el?.focus()
    el?.setSelectionRange(el.value.length, el.value.length)
  }, [focusTick, noteMode])

  // A reply restored from storage that matches the draft still counts as AI-assisted.
  useEffect(() => {
    if (draft?.status !== 'ready' || !draft.draft || loadedDraft) return
    if (reply.trim() && reply.trim() === draft.draft.content.trim()) setLoadedDraft({ id: draft.draft.id, content: draft.draft.content })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.status, draft?.draft?.id])

  useEffect(() => {
    if (replyCount > lastCount.current && reply.trim()) setNewActivity(true)
    lastCount.current = replyCount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replyCount])

  // Surface a freshly written draft once per ticket so it can't be missed.
  const autoOpened = useRef(false)
  useEffect(() => {
    if (draft?.status === 'ready' && draft.draft && !autoOpened.current && !reply.trim()) {
      autoOpened.current = true
      announce('An AI suggested reply is ready')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.status, draft?.draft?.id])

  const usingDraft = !!loadedDraft && reply.trim().length > 0
  const editedFromDraft = usingDraft && reply.trim() !== loadedDraft!.content.trim()
  const inEditor = usingDraft && loadedDraft?.id === draft?.draft?.id && !editedFromDraft

  const send = useMutation({
    mutationFn: (v: FailedSend) => api.tickets.postMessage(ticket.id, { body: v.body, kind: 'REPLY', resolve: v.resolve, ai_draft_id: v.draftId }),
    onMutate: async (v) => {
      await queryClient.cancelQueries({ queryKey: ticketKey })
      const previous = queryClient.getQueryData<StaffTicketDetail>(ticketKey)
      if (previous && user) {
        queryClient.setQueryData<StaffTicketDetail>(ticketKey, {
          ...previous,
          messages: [...previous.messages, { id: -Date.now(), kind: 'REPLY', is_internal: false, body: v.body, sender_name: user.full_name, sender_is_requester: false, created_at: new Date().toISOString(), ai_draft_id: v.draftId }],
        })
      }
      setFailed(null)
      setReply('')
      setLoadedDraft(null)
      setNewActivity(false)
      return { previous }
    },
    onSuccess: (_d, v) => {
      toast.success(v.resolve ? 'Reply sent and ticket resolved' : 'Reply sent', { description: `${firstName} sees it instantly.` })
      announce(v.resolve ? 'Reply sent and ticket resolved' : 'Reply sent')
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      requestAnimationFrame(() => (v.resolve ? document.querySelector<HTMLElement>('[data-primary-action]') : replyRef.current)?.focus())
    },
    onError: (err, v, ctx) => {
      // Roll back the optimistic message and put the text back so nothing is lost.
      if (ctx?.previous) queryClient.setQueryData(ticketKey, ctx.previous)
      setReply(v.body)
      setFailed(v)
      announce(`Reply not sent. ${errorMessage(err)}`)
      toast.error(errorMessage(err))
    },
  })

  const addNote = useMutation({
    mutationFn: (body: string) => api.tickets.postMessage(ticket.id, { body, kind: 'NOTE' }),
    onSuccess: () => {
      setNote('')
      toast.success('Internal note added', { description: 'Only your team can see it.' })
      announce('Internal note added')
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] })
      requestAnimationFrame(() => noteRef.current?.focus())
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const insertDraft = (how: 'use' | 'edit') => {
    if (!draft?.draft) return
    const { id, content } = draft.draft
    const apply = () => {
      setReply(content)
      setLoadedDraft({ id, content })
      onModeChange('reply')
      requestAnimationFrame(() => {
        const el = replyRef.current
        el?.focus()
        if (el && how === 'edit') el.setSelectionRange(0, 0)
        else el?.setSelectionRange(content.length, content.length)
      })
    }
    const ownText = reply.trim() && (!usingDraft || editedFromDraft || loadedDraft?.id !== id)
    if (ownText) setConfirm({ title: 'Replace your reply?', description: 'The AI draft will replace what you have written so far.', confirmLabel: 'Replace', onConfirm: apply })
    else apply()
  }

  const insertMacro = (m: Macro) => {
    const body = m.body.replaceAll('{{name}}', firstName)
    setReply((cur) => (cur.trim() ? `${cur.trimEnd()}\n\n${body}` : body))
    setLoadedDraft(null)
    requestAnimationFrame(() => replyRef.current?.focus())
  }

  const doSend = (resolve: boolean) => send.mutate({ body: reply, resolve, draftId: usingDraft ? loadedDraft?.id ?? null : null })
  const requestSend = (resolve: boolean) => {
    if (!reply.trim() || send.isPending || readOnly) return
    if (skipPreview || (!usingDraft && !resolve)) doSend(resolve)
    else setPreview({ resolve })
  }
  const submitNote = () => note.trim() && !addNote.isPending && !readOnly && addNote.mutate(note)
  const assignedElsewhere = ticket.assigned_to && ticket.assigned_to.id !== user?.id

  const field = 'field-sizing-content max-h-[min(9.5rem,20svh)] min-h-[3.5rem] [@media(max-height:800px)]:min-h-[2.75rem] resize-none rounded-none border-0 bg-transparent px-4 py-2.5 text-[15px] leading-relaxed shadow-none focus-visible:ring-0 dark:bg-transparent'
  const showDraft = !noteMode && !closed && !readOnly && waitingOnUs(ticket) && draftBarVisible(draft, t.draft.isLoading)
  const aiActive = showDraft && (draft?.status === 'ready' || draft?.status === 'generating' || t.regenerate.isPending)
  // One quiet notice at most, above the box, so the composer never stacks up warnings.
  const notice = failed && !noteMode
    ? 'failed'
    : newActivity && !noteMode
      ? 'new'
      : resolved && !noteMode
        ? 'resolved'
        : assignedElsewhere && !noteMode && !closed
          ? 'elsewhere'
          : null

  return (
    <div className="shrink-0 border-t border-line bg-surface px-3 py-2.5 sm:px-5">
      <div className="mx-auto max-w-3xl">
        {notice === 'failed' && failed && (
          <div role="alert" className="mb-2 flex flex-wrap items-center gap-2 rounded-control border border-rose-line bg-rose px-3 py-2 text-[13px] text-rose-ink">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">Your reply wasn't sent. The text is back in the box, nothing is lost.</span>
            <Button variant="outline" size="sm" onClick={() => send.mutate(failed)} disabled={send.isPending}><RotateCcw /> Retry</Button>
            <button type="button" onClick={() => setFailed(null)} aria-label="Dismiss" className="rounded-chip p-1 hover:bg-rose-line/40"><X className="size-4" aria-hidden /></button>
          </div>
        )}
        {notice === 'new' && (
          <div role="status" className="mb-2 flex items-center justify-between gap-2 rounded-control border border-sky-line bg-sky px-3 py-2 text-[13px] text-sky-ink">
            <span>{firstName} sent a new message while you were writing. Your text is safe; read it before sending.</span>
            <button type="button" className="font-semibold underline" onClick={() => setNewActivity(false)}>Dismiss</button>
          </div>
        )}
        {notice === 'elsewhere' && (
          <p className="mb-2 flex items-center gap-1.5 text-xs text-ink-2">
            <AlertTriangle className="size-3.5 shrink-0 text-butter-ink" aria-hidden /> Assigned to {ticket.assigned_to!.full_name}. You can still reply; the assignment won't change.
          </p>
        )}
        {notice === 'resolved' && (
          <p className="mb-2 flex flex-wrap items-center gap-2 text-xs text-mint-ink">
            <span className="font-medium">This ticket is resolved.</span> A reply moves it back to In Progress.
            <button type="button" onClick={onReopen} className="font-semibold underline">Reopen without replying</button>
          </p>
        )}

        <div
          data-working={aiActive && (draft?.status === 'generating' || t.regenerate.isPending) ? 'true' : undefined}
          className={cn(
            'relative overflow-hidden rounded-panel border bg-surface shadow-panel transition-colors focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-violet',
            aiActive ? 'ai-border ai-surface border-transparent' : noteMode ? 'border-butter-line bg-butter/40' : 'border-line-strong',
          )}
        >
          {showDraft && (
            <div className="border-b border-line">
              <DraftBar
                draft={draft}
                loading={t.draft.isLoading}
                inEditor={inEditor}
                regenerating={t.regenerate.isPending}
                onRegenerate={() => t.regenerate.mutate()}
                onUse={insertDraft}
                disabled={readOnly}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 px-3 pt-2">
            <SegmentedControl<ComposerMode>
              ariaLabel="Message type"
              size="sm"
              value={mode}
              onChange={(m) => {
                onModeChange(m)
                requestAnimationFrame(() => (m === 'note' ? noteRef.current : replyRef.current)?.focus())
              }}
              options={[
                { value: 'reply', label: <><span className="sm:hidden">Reply</span><span className="max-sm:hidden">Reply to {firstName}</span></>, icon: Send },
                { value: 'note', label: <><span className="sm:hidden">Note</span><span className="max-sm:hidden">Internal note</span></>, icon: Lock },
              ]}
            />
            <span className="ml-auto hidden items-center gap-1 text-xs text-ink-3 sm:flex">
              {noteMode ? <><Lock className="size-3" aria-hidden /> Team only. {firstName} never sees notes.</> : <>Sent to {ticket.requester.email}</>}
            </span>
          </div>

          {noteMode ? (
            <Textarea
              ref={noteRef}
              key="note"
              value={note}
              disabled={readOnly}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && submitNote()}
              placeholder="Add context for the team, for example “Confirmed duplicate in the billing console”…"
              aria-label="Internal note"
              className={field}
            />
          ) : closed ? (
            <div className="flex flex-col items-center gap-3 px-5 py-6 text-center text-sm text-ink-3">
              <p>This ticket is closed. Reopen it to reply, or switch to an internal note.</p>
              <Button variant="outline" onClick={onReopen} disabled={readOnly}><RotateCcw /> Reopen ticket</Button>
            </div>
          ) : (
            <Textarea
              ref={replyRef}
              key="reply"
              value={reply}
              disabled={readOnly}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && requestSend(false)}
              placeholder={readOnly ? 'You have read-only access to this workspace.' : `Write your reply to ${firstName}…`}
              aria-label={`Reply to ${firstName}`}
              className={field}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-surface-2 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              {!noteMode && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={!macros.data?.length || closed || readOnly}>
                      <MessageSquareText /> <span className="max-sm:sr-only">Macros</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    <DropdownMenuLabel className="text-xs text-ink-3">Insert a canned reply</DropdownMenuLabel>
                    {macros.data?.map((m) => (
                      <DropdownMenuItem key={m.id} onClick={() => insertMacro(m)}>{m.title}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {!noteMode && usingDraft ? (
                <p className="hidden items-center gap-1.5 text-xs font-medium text-lav-ink sm:flex">
                  <Sparkles className="size-3.5 text-ai" aria-hidden />
                  {editedFromDraft ? 'From AI draft, edited by you' : 'From AI draft'}
                </p>
              ) : (
                <p className="hidden items-center gap-1 text-xs text-ink-3 md:flex">
                  <Kbd keys="mod+enter" /> <span>to {noteMode ? 'add' : 'send'}</span>
                </p>
              )}
            </div>

            {noteMode ? (
              <Button onClick={submitNote} disabled={!note.trim() || addNote.isPending || readOnly} variant="outline" className="shrink-0 border-butter-line bg-butter text-butter-ink hover:bg-butter/80">
                {addNote.isPending ? <Loader2 className="animate-spin" /> : <Lock />} Add note
              </Button>
            ) : (
              <div className="flex shrink-0 items-center">
                <Button onClick={() => requestSend(false)} disabled={!reply.trim() || send.isPending || closed || readOnly} className="rounded-r-none">
                  {send.isPending ? <Loader2 className="animate-spin" /> : <Send />} {usingDraft && !skipPreview ? 'Review & send' : 'Send'}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button aria-label="More send options" disabled={!reply.trim() || send.isPending || closed || readOnly} className="rounded-l-none border-l border-canvas/25 px-2">
                      <ChevronDown />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => requestSend(true)}>Send and resolve</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2"><Eye className="size-4" aria-hidden /> Preview: what {firstName} will see</span>
            </DialogTitle>
            <DialogDescription>{preview?.resolve ? 'The ticket will be marked Resolved and the customer asked to confirm.' : 'The ticket will move to In Progress.'}</DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto rounded-panel border border-line bg-violet-soft p-4 text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap">{reply}</div>
          <label className="flex items-center gap-2 text-xs text-ink-3">
            <Checkbox
              checked={skipPreview}
              onCheckedChange={(v) => {
                setSkipPreview(!!v)
                try {
                  sessionStorage.setItem(SKIP_PREVIEW_KEY, v ? '1' : '0')
                } catch {
                  /* ignore */
                }
              }}
            />
            Don't show this preview again this session
          </label>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPreview(null)}>Keep editing</Button>
            <Button
              onClick={() => {
                doSend(!!preview?.resolve)
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
