import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { toast } from 'sonner'

import { useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { announce } from '@/components/shell/announce'
import { ApiError, errorMessage } from '@/lib/api'
import { STATUS_META } from '@/lib/constants'
import type { DraftResponse, Member, StaffTicketDetail, TicketPriority, TicketStatus } from '@/lib/types'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

export type TicketPatch = Partial<{ status: TicketStatus; priority: TicketPriority; category: string; assigned_to: number | null }>

/** All server state for one ticket: the ticket itself plus the lookups the pane needs, and optimistic mutations. */
export function useTicket(ticketId: number) {
  const { slug, api, staff } = useWorkspace()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const refetchInterval = useFallbackInterval()
  const key = ['ticket', ticketId, slug] as const

  const ticket = useQuery({ queryKey: key, queryFn: () => api.tickets.getStaff(ticketId), refetchInterval, enabled: Number.isFinite(ticketId) })
  const members = useQuery({ queryKey: ['members', slug, 'staff'], queryFn: () => api.members(true), staleTime: 60_000 })
  const categories = useQuery({ queryKey: ['categories', slug], queryFn: api.categories, staleTime: 60_000 })
  const similar = useQuery({ queryKey: ['similar', ticketId, slug], queryFn: () => api.tickets.similar(ticketId), staleTime: 60_000 })
  const closed = ticket.data?.status === 'CLOSED'
  const draft = useQuery({
    queryKey: ['draft', ticketId, slug],
    queryFn: () => api.tickets.draft(ticketId),
    refetchInterval: (q) => (q.state.data?.status === 'generating' ? 3000 : false),
    enabled: !!ticket.data && !closed,
  })

  // Opening an unread ticket marks it seen.
  const unread = ticket.data?.has_unread
  useEffect(() => {
    if (!unread) return
    api.tickets.markSeen(ticketId).then(() => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    })
  }, [unread, ticketId, api, queryClient])

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
    queryClient.invalidateQueries({ queryKey: ['tickets'] })
    queryClient.invalidateQueries({ queryKey: ['stats'] })
  }, [queryClient, ticketId])

  /** Applies a patch to the cache immediately and rolls back if the server refuses it. */
  const update = useMutation({
    mutationFn: (data: TicketPatch) => api.tickets.update(ticketId, data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<StaffTicketDetail>(key)
      if (previous) {
        const next: StaffTicketDetail = { ...previous }
        if (data.status) {
          next.status = data.status
          next.status_label = STATUS_META[data.status].label
        }
        if (data.priority) next.priority = data.priority
        if (data.category) {
          const c = categories.data?.find((x) => x.key === data.category)
          if (c) next.category = { id: c.id, key: c.key, name: c.name }
        }
        if ('assigned_to' in data) {
          const m: Member | undefined = members.data?.find((x) => x.id === data.assigned_to)
          next.assigned_to = data.assigned_to && m ? { id: m.id, full_name: m.full_name, email: m.email } : data.assigned_to === user?.id && user ? { id: user.id, full_name: user.full_name, email: user.email } : null
        }
        queryClient.setQueryData(key, next)
      }
      return { previous }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(key, data)
      refresh()
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous)
      const msg = err instanceof ApiError && err.status === 403 ? "You don't have permission to change this ticket." : errorMessage(err)
      toast.error(msg)
      announce(`Change not saved. ${msg}`)
    },
  })

  const rerun = useMutation({
    mutationFn: () => api.tickets.reclassify(ticketId),
    onSuccess: () => {
      toast.success('Re-running AI triage')
      announce('AI triage is running again')
      queryClient.invalidateQueries({ queryKey: key })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const regenerate = useMutation({
    mutationFn: () => api.tickets.regenerateDraft(ticketId),
    onSuccess: (data: DraftResponse) => {
      queryClient.setQueryData(['draft', ticketId, slug], data)
      announce('Writing a new suggested reply')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const error = ticket.error
  return {
    slug,
    api,
    staff,
    meId: user?.id,
    me: user,
    ticket: ticket.data,
    isLoading: ticket.isLoading,
    isError: ticket.isError,
    isNotFound: error instanceof ApiError && (error.status === 404 || error.status === 403),
    error,
    refetch: ticket.refetch,
    refreshing: ticket.isFetching && !ticket.isLoading,
    members: members.data ?? [],
    categories: categories.data ?? [],
    similar,
    draft,
    update,
    rerun,
    regenerate,
    refresh,
  }
}

export type TicketState = ReturnType<typeof useTicket>
