import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, BookMarked, CheckCircle2, Eye, Loader2, Lock, RefreshCw, Send, Sparkles, Trash2 } from 'lucide-react'
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

type Mode = 'REPLY' | 'NOTE'
const SKIP_PREVIEW_KEY = 'bookleaf.skip-send-preview'

function usePersistentText(key: string) {
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
  const [mode, setMode] = useState<Mode>('REPLY')
  const [reply, setReply] = usePersistentText(`bookleaf.reply.${ticket.id}`)
  const [note, setNote] = usePersistentText(`bookleaf.note.${ticket.id}`)
  const [loadedDraft, setLoadedDraft] = useState<{ id: number; content: string } | null>(null)
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  const [preview, setPreview] = useState<{ resolve: boolean } | null>(null)
  const [skipPreview, setSkipPreview] = useState(() => sessionStorage.getItem(SKIP_PREVIEW_KEY) === '1')
  const messageCount = useRef(ticket.messages.length)
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
    if (ticket.messages.length > messageCount.current && (reply.trim() || note.trim())) setNewActivity(true)
    messageCount.current = ticket.messages.length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.messages.length])

  const editedFromDraft = !!loadedDraft && reply.trim() !== loadedDraft.content.trim()
  const usingDraft = !!loadedDraft && reply.trim().length > 0

  const send = useMutation({
    mutationFn: (vars: { kind: Mode; resolve?: boolean }) =>
      ticketsApi.postMessage(ticket.id, {
        body: vars.kind === 'NOTE' ? note : reply,
        kind: vars.kind,
        resolve: vars.resolve,
        ai_draft_id: vars.kind === 'REPLY' && usingDraft ? loadedDraft?.id : null,
      }),
    onSuccess: (_data, vars) => {
      if (vars.kind === 'NOTE') {
        setNote('')
        toast.success('Internal note added')
      } else {
        setReply('')
        setLoadedDraft(null)
        toast.success(vars.resolve ? 'Reply sent and ticket resolved' : 'Reply sent to author', {
          description: 'The author sees it instantly.',
        })
      }
      setNewActivity(false)
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
    if (skipPreview) send.mutate({ kind: 'REPLY', resolve })
    else setPreview({ resolve })
  }

  const assignedElsewhere = ticket.assigned_to && ticket.assigned_to.id !== user?.id

  return (
    <div className={cn('rounded-xl border bg-card', mode === 'NOTE' && 'border-amber-300')}>
      <div className="flex items-center gap-1 border-b px-2 pt-2">
        {(['REPLY', 'NOTE'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              '-mb-px flex items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2 text-sm',
              mode === m
                ? m === 'NOTE'
                  ? 'border-amber-500 font-medium text-amber-800'
                  : 'border-primary font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {m === 'REPLY' ? <Send className="size-3.5" /> : <Lock className="size-3.5" />}
            {m === 'REPLY' ? 'Reply to author' : 'Internal note'}
          </button>
        ))}
      </div>

      {newActivity && (
        <div className="flex items-center justify-between gap-2 border-b bg-sky-50 px-4 py-2 text-xs text-sky-800">
          New activity on this ticket while you were writing. Your text is safe; review the thread before sending.
          <button className="font-medium underline" onClick={() => setNewActivity(false)}>
            Dismiss
          </button>
        </div>
      )}

      {mode === 'REPLY' ? (
        closed ? (
          <div className="p-4 text-sm text-muted-foreground">This ticket is closed. Change the status to In Progress to reply.</div>
        ) : (
          <div className="p-3">
            {assignedElsewhere && (
              <p className="mb-2 flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                <AlertTriangle className="size-3.5" /> Assigned to {ticket.assigned_to!.full_name}. You can still reply; assignment won't change.
              </p>
            )}
            <DraftBanner
              status={draft?.status}
              error={draft?.error}
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
              <div className="space-y-2 rounded-md border p-3">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-2/3" />
                <p className="pt-1 text-xs text-muted-foreground">
                  Drafting a response using the knowledge base… You can also start typing; we won't overwrite you.
                </p>
                <Button variant="ghost" size="xs" onClick={() => setManual(true)}>
                  Write manually instead
                </Button>
              </div>
            ) : (
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={12}
                placeholder="Write your reply to the author…"
                className="min-h-56 text-sm leading-relaxed"
              />
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">{reply.trim() ? `${reply.trim().split(/\s+/).length} words` : ''}</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => requestSend(true)} disabled={!reply.trim() || send.isPending}>
                  <CheckCircle2 /> Send & resolve
                </Button>
                <Button onClick={() => requestSend(false)} disabled={!reply.trim() || send.isPending}>
                  {send.isPending ? <Loader2 className="animate-spin" /> : <Send />} Send reply
                </Button>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="bg-amber-50/50 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber-800">
            <Lock className="size-3.5" /> Only visible to the BookLeaf team. The author never sees internal notes.
          </p>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="e.g. Checked with production: ISBN fix submitted to Amazon, waiting for confirmation."
            className="border-amber-200 bg-white"
          />
          <div className="mt-3 flex justify-end">
            <Button
              onClick={() => send.mutate({ kind: 'NOTE' })}
              disabled={!note.trim() || send.isPending}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {send.isPending ? <Loader2 className="animate-spin" /> : <Lock />} Add internal note
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <Eye className="size-4" /> Preview: what {ticket.author.name.split(' ')[0]} will see
              </span>
            </DialogTitle>
            <DialogDescription>
              {preview?.resolve ? 'The ticket will be marked Resolved and the author asked to confirm.' : 'The ticket will move to In Progress.'}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto rounded-lg border bg-accent/30 p-4 text-sm leading-relaxed whitespace-pre-wrap">{reply}</div>
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
                send.mutate({ kind: 'REPLY', resolve: preview?.resolve })
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
  error,
  loading,
  sources,
  usingDraft,
  edited,
  onRegenerate,
  regenerating,
  onDiscard,
}: {
  status?: string
  error?: string
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
    return <p className="mb-2 rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground">AI drafting isn't configured on this server. Write your reply manually.</p>
  }
  if (status === 'failed') {
    return (
      <div className="mb-2 flex items-center justify-between gap-2 rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="size-3.5" /> AI draft unavailable right now. Write your reply manually{error ? '' : '.'}
        </span>
        <Button variant="ghost" size="xs" onClick={onRegenerate} disabled={regenerating}>
          <RefreshCw className={cn(regenerating && 'animate-spin')} /> Try again
        </Button>
      </div>
    )
  }
  if (status === 'generating') {
    return (
      <p className="mb-2 flex items-center gap-1.5 rounded-md bg-violet-50 px-3 py-1.5 text-xs text-violet-800">
        <Loader2 className="size-3.5 animate-spin" /> AI is drafting a reply…
      </p>
    )
  }
  if (status !== 'ready') return null
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md bg-violet-50 px-3 py-1.5 text-xs text-violet-900">
      <span className="flex items-center gap-1.5 font-medium">
        <Sparkles className="size-3.5" />
        {usingDraft ? (edited ? 'AI draft, edited by you' : 'AI draft, review before sending') : 'AI draft available'}
      </span>
      {sources?.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1 rounded border border-violet-200 bg-white px-1.5 py-0.5 text-[11px] text-violet-700">
          <BookMarked className="size-3" /> {s.title}
        </span>
      ))}
      <span className="ml-auto flex gap-1">
        <Button variant="ghost" size="xs" onClick={onRegenerate} disabled={regenerating}>
          <RefreshCw className={cn(regenerating && 'animate-spin')} /> Regenerate
        </Button>
        {usingDraft && (
          <Button variant="ghost" size="xs" onClick={onDiscard}>
            <Trash2 /> Clear
          </Button>
        )}
      </span>
    </div>
  )
}
