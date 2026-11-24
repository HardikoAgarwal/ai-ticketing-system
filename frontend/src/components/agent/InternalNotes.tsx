import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Lock, Plus, StickyNote } from 'lucide-react'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { usePersistentText } from '@/components/agent/Composer'
import { RelativeTime } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { errorMessage } from '@/lib/api'
import { initials } from '@/lib/format'
import type { StaffTicketDetail } from '@/lib/types'
import { cn } from '@/lib/utils'

export function InternalNotes({ ticket, className }: { ticket: StaffTicketDetail; className?: string }) {
  const queryClient = useQueryClient()
  const { slug, api } = useWorkspace()
  const [note, setNote] = usePersistentText(`helpdesk.note.${slug}.${ticket.id}`)
  const notes = ticket.messages.filter((m) => m.is_internal)

  const add = useMutation({
    mutationFn: () => api.tickets.postMessage(ticket.id, { body: note, kind: 'NOTE' }),
    onSuccess: () => {
      setNote('')
      toast.success('Internal note added')
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const submit = () => note.trim() && !add.isPending && add.mutate()

  return (
    <section className={cn('flex flex-col overflow-hidden rounded-2xl border bg-card shadow-xs', className)}>
      <header className="flex shrink-0 items-center justify-between border-b px-5 py-3.5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <StickyNote className="size-4 text-amber-600" /> Internal notes
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{notes.length}</span>
        </h3>
        <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <Lock className="size-3" /> Team only
        </span>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {notes.length === 0 ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">
            No notes yet. Use notes for context the customer shouldn't see, e.g. "Confirmed duplicate in the billing console".
          </p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="rounded-xl border border-l-4 border-l-amber-400 bg-card p-3">
              <div className="mb-1.5 flex items-center gap-2 text-xs">
                <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">{initials(n.sender_name)}</span>
                <span className="font-semibold">{n.sender_name}</span>
                <RelativeTime value={n.created_at} className="ml-auto text-muted-foreground" />
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{n.body}</p>
            </div>
          ))
        )}
      </div>

      <div className="flex shrink-0 items-end gap-2 border-t p-4">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
          }}
          rows={1}
          placeholder="Add a note for the team…"
          aria-label="Internal note"
          className="max-h-32 min-h-10 py-2.5 text-sm"
        />
        <Button onClick={submit} disabled={!note.trim() || add.isPending} variant="outline" className="shrink-0">
          {add.isPending ? <Loader2 className="animate-spin" /> : <Plus />} Add
        </Button>
      </div>
    </section>
  )
}
