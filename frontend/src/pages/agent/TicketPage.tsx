import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { ConfirmDialog, type ConfirmOptions } from '@/components/ConfirmDialog'
import { Conversation } from '@/components/dashboard/Conversation'
import { TicketHeader } from '@/components/dashboard/TicketHeader'
import { TicketRail } from '@/components/dashboard/TicketRail'
import { surface } from '@/components/dashboard/surface'
import { ActivityTab, AiTab, DetailsTab, SimilarTab } from '@/components/dashboard/TicketSidebar'
import { ErrorState, ListSkeleton } from '@/components/states'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Activity, Copy, MessagesSquare, Sparkles, UserRound, type LucideIcon } from 'lucide-react'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

const TABS = ['conversation', 'details', 'ai', 'similar', 'activity'] as const
type TicketTab = (typeof TABS)[number]
const TAB_META: Record<TicketTab, { label: string; icon: LucideIcon }> = {
  conversation: { label: 'Conversation', icon: MessagesSquare },
  details: { label: 'Details', icon: UserRound },
  ai: { label: 'AI triage', icon: Sparkles },
  similar: { label: 'Similar', icon: Copy },
  activity: { label: 'Activity', icon: Activity },
}

export function TicketPage() {
  const { slug, api } = useWorkspace()
  const { user } = useAuth()
  const { id } = useParams()
  const ticketId = Number(id)
  const queryClient = useQueryClient()
  const refetchInterval = useFallbackInterval()
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: TicketTab = TABS.includes(raw as TicketTab) ? (raw as TicketTab) : 'conversation'
  const setTab = (t: TicketTab) =>
    setParams((p) => {
      const next = new URLSearchParams(p)
      if (t === 'conversation') next.delete('tab')
      else next.set('tab', t)
      return next
    }, { replace: true })

  const { data: ticket, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['ticket', ticketId, slug],
    queryFn: () => api.tickets.getStaff(ticketId),
    refetchInterval,
  })
  const members = useQuery({ queryKey: ['members', slug, 'staff'], queryFn: () => api.members(true), staleTime: 60_000 })
  const categories = useQuery({ queryKey: ['categories', slug], queryFn: api.categories, staleTime: 60_000 })
  const similar = useQuery({
    queryKey: ['similar', ticketId, slug],
    queryFn: () => api.tickets.similar(ticketId),
    staleTime: 60_000,
  })

  const unread = ticket?.has_unread
  useEffect(() => {
    if (!unread) return
    api.tickets.markSeen(ticketId).then(() => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    })
  }, [unread, ticketId, api, queryClient])

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
    queryClient.invalidateQueries({ queryKey: ['tickets'] })
    queryClient.invalidateQueries({ queryKey: ['stats'] })
  }
  const update = useMutation({
    mutationFn: (data: Parameters<typeof api.tickets.update>[1]) => api.tickets.update(ticketId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(['ticket', ticketId, slug], data)
      refresh()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
  const rerun = useMutation({
    mutationFn: () => api.tickets.reclassify(ticketId),
    onSuccess: () => {
      toast.success('Re-running AI triage')
      refresh()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  if (isLoading) return <ListSkeleton rows={6} />
  if (isError || !ticket) return <ErrorState error={error} onRetry={() => refetch()} />

  const mineOrFree = !ticket.assigned_to || ticket.assigned_to.id === user?.id
  const rp = ticket.requester_profile
  const canResolve = ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED'

  const assign = (value: string | null) => {
    const next = value ? Number(value) : null
    const apply = () => update.mutate({ assigned_to: next })
    if (!mineOrFree && next !== ticket.assigned_to?.id) {
      setConfirm({
        title: 'Reassign this ticket?',
        description: `${ticket.assigned_to!.full_name} currently owns it.`,
        confirmLabel: 'Reassign',
        onConfirm: apply,
      })
    } else apply()
  }

  const resolve = () =>
    setConfirm({
      title: 'Mark as resolved?',
      description: `${rp.name.split(' ')[0]} will be asked to confirm that the issue is sorted.`,
      confirmLabel: 'Mark as resolved',
      onConfirm: () => update.mutate({ status: 'RESOLVED' }),
    })

  const counts: Partial<Record<TicketTab, number>> = { similar: similar.data?.length ?? 0, activity: ticket.activities.length, conversation: ticket.messages.length }

  return (
    <div className="mx-auto max-w-[1500px]">
      <TicketHeader
        ticket={ticket}
        backTo={`/w/${slug}/agent`}
        meId={user?.id}
        canResolve={canResolve}
        onResolve={resolve}
        resolving={update.isPending}
        onTake={() => update.mutate({ assigned_to: user!.id })}
        taking={update.isPending}
        onOpenAi={() => setTab('ai')}
      />

      {/* Both columns share one fixed height on desktop, so they always end on the same line. */}
      <div className="grid gap-4 xl:h-[max(40rem,calc(100svh-9rem))] xl:grid-cols-[minmax(0,1fr)_340px] xl:items-stretch">
        <section aria-label="Ticket workspace" className={cn(surface, 'flex h-[max(42rem,calc(100svh-6rem))] min-h-0 flex-col overflow-hidden xl:h-full')}>
          <div role="tablist" aria-label="Ticket sections" className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-muted/40 px-2 pt-2 [&::-webkit-scrollbar]:hidden">
            {TABS.map((t) => {
              const { label, icon: Icon } = TAB_META[t]
              const on = t === tab
              return (
                <button
                  key={t}
                  role="tab"
                  id={`tab-${t}`}
                  aria-selected={on}
                  aria-controls={`panel-${t}`}
                  onClick={() => setTab(t)}
                  className={cn(
                    '-mb-px inline-flex shrink-0 items-center gap-2 rounded-t-lg border border-b-0 px-3.5 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none',
                    on ? 'border-border bg-card text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className={cn('size-4', on && 'text-primary')} /> {label}
                  {counts[t] ? <span className={cn('rounded-md px-1.5 py-px text-xs font-semibold tabular-nums', on ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>{counts[t]}</span> : null}
                </button>
              )
            })}
          </div>

          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="flex min-h-0 flex-1 flex-col">
            {tab === 'conversation' ? (
              <Conversation ticket={ticket} />
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 p-4">
                {tab === 'details' && (
                  <DetailsTab ticket={ticket} categories={categories.data ?? []} members={members.data ?? []} meId={user?.id} saving={update.isPending} onUpdate={(data) => update.mutate(data)} onAssign={assign} />
                )}
                {tab === 'ai' && <AiTab ticket={ticket} onRerun={() => rerun.mutate()} rerunning={rerun.isPending} />}
                {tab === 'similar' && <SimilarTab similar={similar.data ?? []} slug={slug} />}
                {tab === 'activity' && <ActivityTab ticket={ticket} />}
              </div>
            )}
          </div>
        </section>

        <div className="min-h-0 xl:h-full">
          <TicketRail
            ticket={ticket}
            meId={user?.id}
            canResolve={canResolve}
            onTake={() => update.mutate({ assigned_to: user!.id })}
            onResolve={resolve}
            onStart={() => update.mutate({ status: 'IN_PROGRESS' })}
            onRerun={() => rerun.mutate()}
            rerunning={rerun.isPending}
            busy={update.isPending}
            onOpenConversation={() => setTab('conversation')}
            onOpenAi={() => setTab('ai')}
          />
        </div>
      </div>
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
