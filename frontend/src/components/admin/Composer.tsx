import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, BookMarked, Eye, Loader2, PenLine, RefreshCw, Send, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog, type ConfirmOptions } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/auth/AuthContext'
import { errorMessage } from '@/lib/api'
import { ticketsApi } from '@/lib/endpoints'
import type { AdminTicketDetail } from '@/lib/types'
import { cn } from '@/lib/utils'

const SKIP_PREVIEW_KEY = 'bookleaf.skip-send-preview'

export function usePersistentText(key: string) {
  const [value, setValue] = useState(() => localStorage.getItem(key) ?? '')
  useEffect(() => {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  }, [key, value])
  return [value, setValue] as const
}

export function Composer({ ticket }: { ticket: AdminTicketDetail }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [reply, setReply] = usePersistentText(`bookleaf.reply.${ticket.id}`)
  const [loadedDraft, setLoadedDraft] = useState<{ id: number; content: string } | null>(null)
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  const [preview, setPreview] = useState<{ resolve: boolean } | null>(null)
  const [skipPreview, setSkipPreview] = useState(() => sessionStorage.getItem(SKIP_PREVIEW_KEY) === '1')
  const replyCount = ticket.messages.filter((m) => !m.is_internal).length
  const lastCount = useRef(replyCount)
  const [newActivity, setNewActivity] = useState(false)
  const [manual, setManual] = useState(false)

  const closed = ticket.status === 'CLOSED'
  const draftQuery = useQuery({
    queryKey: ['draft', ticket.id],
    queryFn: () => ticketsApi.draft(ticket.id),
    refetchInterval: (q) => (q.state.data?.status === 'generating' ? 3000 : false),
    enabled: !closed,
  })
  const draft = draftQuery.data

  // Load a fresh AI draft into the editor only if the admin hasn't started writing.
  useEffect(() => {
    if (draft?.status !== 'ready' || !draft.draft) return
    if (loadedDraft?.id === draft.draft.id) return
    if (!reply.trim() || reply === loadedDraft?.content || reply.trim() === draft.draft.content.trim()) {
      setReply(draft.draft.content)
      setLoadedDraft({ id: draft.draft.id, content: draft.draft.content })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.status, draft?.draft?.id])

  useEffect(() => {
    if (replyCount > lastCount.current && reply.trim()) setNewActivity(true)
    lastCount.current = replyCount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replyCount])

  const editedFromDraft = !!loadedDraft && reply.trim() !== loadedDraft.content.trim()
  const usingDraft = !!loadedDraft && reply.trim().length > 0

  const send = useMutation({
    mutationFn: (vars: { resolve?: boolean }) =>
      ticketsApi.postMessage(ticket.id, {
        body: reply,
        kind: 'REPLY',
        resolve: vars.resolve,
        ai_draft_id: usingDraft ? loadedDraft?.id : null,
      }),
    onSuccess: (_data, vars) => {
      setReply('')
      setLoadedDraft(null)
      setNewActivity(false)
      toast.success(vars.resolve ? 'Reply sent and ticket resolved' : 'Reply sent to author', {
        description: 'The author sees it instantly.',
      })
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const regenerate = useMutation({
    mutationFn: () => ticketsApi.regenerateDraft(ticket.id),
    onSuccess: (data) => {
      queryClient.setQueryData(['draft', ticket.id], data)
      setLoadedDraft(null)
      setReply('')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const askRegenerate = () => {
    if (editedFromDraft || (reply.trim() && !loadedDraft)) {
      setConfirm({
        title: 'Replace your edits?',
        description: 'Regenerating creates a new AI draft and replaces what is currently in the editor.',
        confirmLabel: 'Regenerate',
        onConfirm: () => regenerate.mutate(),
      })
    } else regenerate.mutate()
  }

  const requestSend = (resolve: boolean) => {
    if (!reply.trim()) return
    if (skipPreview) send.mutate({ resolve })
    else setPreview({ resolve })
  }

  const insertDraft = () => {
    if (!draft?.draft) return
    setReply(draft.draft.content)
    setLoadedDraft({ id: draft.draft.id, content: draft.draft.content })
  }

  const assignedElsewhere = ticket.assigned_to && ticket.assigned_to.id !== user?.id
  const firstName = ticket.author.name.split(' ')[0]
  const drafting = draft?.status === 'generating' && !reply && !manual
  const aiMode = drafting || usingDraft

  if (closed) {
    return (
      <div className="shrink-0 border-t bg-muted/40 px-6 py-5 text-sm text-muted-foreground">
        This ticket is closed. Change the status to <span className="font-medium text-foreground">In Progress</span> to reply.
      </div>
    )
  }

  return (
    <div className="shrink-0 border-t bg-card px-6 py-5">
      {newActivity && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs text-muted-foreground">
          {firstName} sent a new message while you were writing. Your text is safe; read it before sending.
          <button className="font-medium text-foreground underline" onClick={() => setNewActivity(false)}>
            Dismiss
          </button>
        </div>
      )}
      {assignedElsewhere && (
        <p className="mb-3 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs text-muted-foreground">
          <AlertTriangle className="size-3.5 text-amber-600" /> Assigned to {ticket.assigned_to!.full_name}. You can still reply; assignment won't change.
        </p>
      )}

      <div
        className={cn(
          'rounded-2xl',
          aiMode
            ? cn('ai-ring', !drafting && editedFromDraft && 'ai-ring-still')
            : 'border shadow-xs transition-shadow focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30',
        )}
      >
        <div className="overflow-hidden rounded-[calc(var(--radius-2xl)-2px)] bg-card">
          <ComposerHeader
            mode={drafting ? 'drafting' : usingDraft ? (editedFromDraft ? 'edited' : 'ready') : 'manual'}
            status={draft?.status}
            loading={draftQuery.isLoading}
            sources={draft?.draft?.kb_sections}
            firstName={firstName}
            regenerating={regenerate.isPending}
            onRegenerate={askRegenerate}
            onInsert={insertDraft}
            onClear={() => {
              setReply('')
              setLoadedDraft(null)
            }}
          />

          {drafting ? (
            <div className="space-y-3 px-5 py-5">
              <div className="ai-shimmer h-3 w-1/4 rounded-full" />
              <div className="ai-shimmer h-3 w-full rounded-full" />
              <div className="ai-shimmer h-3 w-11/12 rounded-full" />
              <div className="ai-shimmer h-3 w-2/3 rounded-full" />
            </div>
          ) : (
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) requestSend(false)
              }}
              placeholder={`Write your reply to ${firstName}…`}
              className="max-h-72 min-h-28 resize-none rounded-none border-0 bg-transparent px-5 py-4 text-sm leading-relaxed shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
          )}

          <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-4 py-2.5">
            {drafting ? (
              <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => setManual(true)}>
                <PenLine /> Write manually instead
              </Button>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Kbd>⌘</Kbd>
                <Kbd>Enter</Kbd>
                <span className="ml-0.5">to send · {firstName} sees it instantly</span>
              </p>
            )}
            <Button onClick={() => requestSend(false)} disabled={!reply.trim() || send.isPending} className="shrink-0">
              {send.isPending ? <Loader2 className="animate-spin" /> : <Send />} {usingDraft && !skipPreview ? 'Review & send' : 'Send'}
            </Button>
          </div>
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
              {preview?.resolve ? 'The ticket will be marked Resolved and the author asked to confirm.' : 'The ticket will move to In Progress.'}
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

type HeaderMode = 'drafting' | 'ready' | 'edited' | 'manual'

const AI_CHIP: Record<Exclude<HeaderMode, 'manual'>, { label: string; className: string }> = {
  drafting: { label: 'Writing…', className: 'bg-violet-50 text-violet-700 ring-violet-600/20' },
  ready: { label: 'Ready to review', className: 'bg-violet-50 text-violet-700 ring-violet-600/20' },
  edited: { label: 'Edited by you', className: 'bg-muted text-muted-foreground ring-border' },
}

function ComposerHeader({
  mode,
  status,
  loading,
  sources,
  firstName,
  regenerating,
  onRegenerate,
  onInsert,
  onClear,
}: {
  mode: HeaderMode
  status?: string
  loading: boolean
  sources?: { key: string; title: string }[]
  firstName: string
  regenerating: boolean
  onRegenerate: () => void
  onInsert: () => void
  onClear: () => void
}) {
  if (mode === 'manual') {
    return (
      <div className="flex min-h-12 items-center gap-3 border-b px-4 py-2">
        <p className="text-sm font-medium">Reply to {firstName}</p>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {!loading && status === 'ready' && (
            <Button variant="outline" size="sm" onClick={onInsert}>
              <Sparkles className="text-violet-600" /> Use AI draft
            </Button>
          )}
          {!loading && status === 'generating' && (
            <span className="flex items-center gap-1.5">
              <Loader2 className="size-3.5 animate-spin text-violet-600" /> AI draft on its way
            </span>
          )}
          {!loading && status === 'failed' && (
            <>
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 text-amber-600" /> AI draft unavailable
              </span>
              <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={regenerating}>
                <RefreshCw className={cn(regenerating && 'animate-spin')} /> Try again
              </Button>
            </>
          )}
          {!loading && status === 'disabled' && <span>AI drafting is off on this server</span>}
        </div>
      </div>
    )
  }

  const chip = AI_CHIP[mode]
  return (
    <div className="flex items-center gap-3 border-b px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 via-fuchsia-500 to-sky-400 text-white shadow-sm">
        <Sparkles className={cn('size-4.5', mode === 'drafting' && 'animate-pulse')} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span className="bg-linear-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">AI draft</span>
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', chip.className)}>
            {mode === 'drafting' && <Loader2 className="size-3 animate-spin" />}
            {chip.label}
          </span>
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {mode === 'drafting' ? (
            'Reading the ticket, book details and knowledge base…'
          ) : sources?.length ? (
            <>
              Based on
              {sources.map((s) => (
                <span key={s.key} className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground/80">
                  <BookMarked className="size-3" /> {s.title}
                </span>
              ))}
            </>
          ) : (
            'Check facts and tone before sending.'
          )}
        </p>
      </div>
      {mode !== 'drafting' && (
        <div className="flex shrink-0 items-center gap-0.5">
          <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={regenerating}>
            <RefreshCw className={cn(regenerating && 'animate-spin')} /> Regenerate
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
            <Trash2 /> Clear
          </Button>
        </div>
      )}
    </div>
  )
}
