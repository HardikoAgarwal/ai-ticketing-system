import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Lock, StickyNote } from 'lucide-react'
import { toast } from 'sonner'

import { usePersistentText } from '@/components/admin/Composer'
import { RelativeTime } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { errorMessage } from '@/lib/api'
import { ticketsApi } from '@/lib/endpoints'
import { initials } from '@/lib/format'
import type { AdminTicketDetail } from '@/lib/types'

export function InternalNotes({ ticket }: { ticket: AdminTicketDetail }) {
  const queryClient = useQueryClient()
  const [note, setNote] = usePersistentText(`bookleaf.note.${ticket.id}`)
  const notes = ticket.messages.filter((m) => m.is_internal)

  const add = useMutation({
    mutationFn: () => ticketsApi.postMessage(ticket.id, { body: note, kind: 'NOTE' }),
    onSuccess: () => {
      setNote('')
      toast.success('Internal note added')
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  return (
    <section className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/40 shadow-xs">
      <header className="flex items-center justify-between border-b border-amber-200 bg-amber-100/60 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
          <StickyNote className="size-4" /> Internal notes
          <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[11px] font-medium">{notes.length}</span>
        </h3>
        <span className="flex items-center gap-1 text-[11px] font-medium text-amber-800">
          <Lock className="size-3" /> Team only
        </span>
      </header>

      <div className="max-h-72 space-y-2.5 overflow-y-auto p-3">
        {notes.length === 0 ? (
          <p className="px-1 py-2 text-xs text-amber-900/70">
            No notes yet. Use notes for context the author shouldn't see, e.g. "Checked with finance, payout batch delayed".
          </p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="rounded-xl border border-amber-200 bg-white p-3">
              <div className="mb-1.5 flex items-center gap-2 text-xs">
                <span className="flex size-6 items-center justify-center rounded-full bg-amber-100 text-[10px] font-semibold text-amber-800">
                  {initials(n.sender_name)}
                </span>
                <span className="font-semibold">{n.sender_name}</span>
                <RelativeTime value={n.created_at} className="ml-auto text-muted-foreground" />
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-amber-950">{n.body}</p>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-amber-200 p-3">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Add a note for the team…"
          className="min-h-20 border-amber-200 bg-white text-sm focus-visible:border-amber-400 focus-visible:ring-amber-200"
        />
        <div className="mt-2 flex justify-end">
          <Button
            size="sm"
            onClick={() => add.mutate()}
            disabled={!note.trim() || add.isPending}
            className="bg-amber-600 text-white shadow-amber-600/20 hover:bg-amber-700"
          >
            {add.isPending ? <Loader2 className="animate-spin" /> : <Lock />} Add note
          </Button>
        </div>
      </div>
    </section>
  )
}
