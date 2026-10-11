import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, BookMarked, CheckCircle2, Eye, Loader2, PenLine, RefreshCw, Send, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog, type ConfirmOptions } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
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
    if (!reply.trim() || reply === loadedDraft?.content) {
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

  const assignedElsewhere = ticket.assigned_to && ticket.assigned_to.id !== user?.id
  const firstName = ticket.author.name.split(' ')[0]

  if (closed) {
    return (
      <div className="shrink-0 border-t bg-muted/40 px-6 py-5 text-sm text-muted-foreground">
        This ticket is closed. Change the status to <span className="font-medium text-foreground">In Progress</span> to reply.
      </div>
    )
  }

  return (
    <div className="shrink-0 border-t bg-card px-6 py-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <PenLine className="size-4 text-primary" /> Reply to {firstName}
        </p>
        <p className="text-xs text-muted-foreground">{reply.trim() ? `${reply.trim().split(/\s+/).length} words` : ''}</p>
      </div>

      {newActivity && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800 ring-1 ring-sky-600/15 ring-inset">
          {firstName} sent a new message while you were writing. Your text is safe; read it before sending.
          <button className="font-medium underline" onClick={() => setNewActivity(false)}>
            Dismiss
          </button>
        </div>
      )}
      {assignedElsewhere && (
        <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-600/15 ring-inset">
          <AlertTriangle className="size-3.5" /> Assigned to {ticket.assigned_to!.full_name}. You can still reply; assignment won't change.
        </p>
      )}

      <DraftBanner
        status={draft?.status}
        loading={draftQuery.isLoading}
        sources={draft?.draft?.kb_sections}
        usingDraft={usingDraft}
        edited={editedFromDraft}
        onRegenerate={askRegenerate}
        regenerating={regenerate.isPending}
        onDiscard={() => {
          setReply('')
          setLoadedDraft(null)
        }}
      />

      {draft?.status === 'generating' && !reply && !manual ? (
        <div className="space-y-2.5 rounded-xl border border-violet-200 bg-violet-50/40 p-4">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-2/3" />
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-violet-800">Drafting a reply from the knowledge base…</p>
            <Button variant="ghost" size="sm" onClick={() => setManual(true)}>
              Write manually instead
            </Button>
          </div>
        </div>
      ) : (
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={4}
          placeholder={`Write your reply to ${firstName}…`}
          className={cn('max-h-64 min-h-28 text-sm', usingDraft && !editedFromDraft && 'border-violet-200 bg-violet-50/20')}
        />
      )}

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={() => requestSend(true)} disabled={!reply.trim() || send.isPending}>
          <CheckCircle2 className="text-emerald-600" /> Send & resolve
        </Button>
        <Button onClick={() => requestSend(false)} disabled={!reply.trim() || send.isPending}>
          {send.isPending ? <Loader2 className="animate-spin" /> : <Send />} Send reply
        </Button>
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

function DraftBanner({
  status,
  loading,
  sources,
  usingDraft,
  edited,
  onRegenerate,
  regenerating,
  onDiscard,
}: {
  status?: string
  loading: boolean
  sources?: { key: string; title: string }[]
  usingDraft: boolean
  edited: boolean
  onRegenerate: () => void
  regenerating: boolean
  onDiscard: () => void
}) {
  if (loading) return null
  if (status === 'disabled') {
    return (
      <p className="mb-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        AI drafting isn't configured on this server. Write your reply manually.
      </p>
    )
  }
  if (status === 'failed') {
    return (
      <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-600/15 ring-inset">
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="size-3.5" /> AI draft unavailable right now. Write your reply manually.
        </span>
        <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={regenerating}>
          <RefreshCw className={cn(regenerating && 'animate-spin')} /> Try again
        </Button>
      </div>
    )
  }
  if (status === 'generating') {
    return (
      <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-2 text-xs font-medium text-violet-800 ring-1 ring-violet-600/15 ring-inset">
        <Loader2 className="size-3.5 animate-spin" /> AI is drafting a reply…
      </p>
    )
  }
  if (status !== 'ready') return null
  return (
    <div className="mb-3 rounded-lg bg-gradient-to-r from-violet-50 to-fuchsia-50 px-3 py-2 ring-1 ring-violet-600/15 ring-inset">
      <div className="flex flex-wrap items-center gap-2 text-xs text-violet-900">
        <span className="flex items-center gap-1.5 font-semibold">
          <Sparkles className="size-3.5" />
          {usingDraft ? (edited ? 'AI draft, edited by you' : 'AI draft ready, review before sending') : 'AI draft available'}
        </span>
        <span className="ml-auto flex gap-1">
          <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={regenerating} className="text-violet-800 hover:bg-violet-100">
            <RefreshCw className={cn(regenerating && 'animate-spin')} /> Regenerate
          </Button>
          {usingDraft && (
            <Button variant="ghost" size="sm" onClick={onDiscard} className="text-violet-800 hover:bg-violet-100">
              <Trash2 /> Clear
            </Button>
          )}
        </span>
      </div>
      {!!sources?.length && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-violet-700">
          Based on:
          {sources.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 font-medium ring-1 ring-violet-600/15 ring-inset">
              <BookMarked className="size-3" /> {s.title}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
