import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { ConfirmDialog, type ConfirmOptions } from '@/components/ConfirmDialog'
import { Conversation } from '@/components/dashboard/Conversation'
import { TicketHeader } from '@/components/dashboard/TicketHeader'
import { TicketSidebar, type SidebarTab } from '@/components/dashboard/TicketSidebar'
import { ErrorState, ListSkeleton } from '@/components/states'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

const SIDEBAR_KEY = 'helpdesk.ticket.sidebar'

function useIsXl() {
  const [yes, setYes] = useState(() => window.matchMedia('(min-width: 1280px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    const on = () => setYes(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return yes
}

export function TicketPage() {
  const { slug, api } = useWorkspace()
  const { user } = useAuth()
  const { id } = useParams()
  const ticketId = Number(id)
  const queryClient = useQueryClient()
  const refetchInterval = useFallbackInterval()
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  const isXl = useIsXl()
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem(SIDEBAR_KEY) !== '0')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tab, setTab] = useState<SidebarTab>('workflow')

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

  const toggleSidebar = () => {
    if (isXl) {
      const next = !sidebarOpen
      setSidebarOpen(next)
      localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0')
    } else setDrawerOpen(true)
  }
  const openAi = () => {
    setTab('ai')
    if (isXl) {
      setSidebarOpen(true)
      localStorage.setItem(SIDEBAR_KEY, '1')
    } else setDrawerOpen(true)
  }

  const sidebar = (
    <TicketSidebar
      ticket={ticket}
      tab={tab}
      onTab={setTab}
      categories={categories.data ?? []}
      members={members.data ?? []}
      similar={similar.data ?? []}
      slug={slug}
      meId={user?.id}
      saving={update.isPending}
      onUpdate={(data) => update.mutate(data)}
      onAssign={assign}
      onRerun={() => rerun.mutate()}
      rerunning={rerun.isPending}
    />
  )

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
        sidebarOpen={isXl ? sidebarOpen : drawerOpen}
        onToggleSidebar={toggleSidebar}
        onOpenAi={openAi}
      />

      <div className={cn('grid h-[max(38rem,calc(100svh-6rem))] items-stretch gap-4 xl:gap-5', isXl && sidebarOpen ? 'xl:grid-cols-[minmax(0,1fr)_380px]' : 'grid-cols-1')}>
        <Conversation ticket={ticket} />
        {isXl && sidebarOpen && <aside aria-label="Ticket details" className="min-h-0 min-w-0 overflow-y-auto rounded-2xl bg-muted/40 p-2 ring-1 ring-border">{sidebar}</aside>}
      </div>

      {!isXl && (
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-md">
            <SheetHeader className="border-b">
              <SheetTitle>{ticket.reference} details</SheetTitle>
              <SheetDescription>Workflow, AI triage, duplicates and history.</SheetDescription>
            </SheetHeader>
            <div className="p-4">{sidebar}</div>
          </SheetContent>
        </Sheet>
      )}
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
