import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuth } from '@/auth/AuthContext'
import { ensureFreshAccessToken, tokenStore, WS_URL } from '@/lib/api'
import type { RealtimeEvent } from '@/lib/types'

export type ConnectionState = 'connecting' | 'live' | 'offline'

const RealtimeContext = createContext<ConnectionState>('offline')

const MAX_BACKOFF_MS = 30_000
const PING_INTERVAL_MS = 25_000

/**
 * One WebSocket per signed-in user. Events are lightweight notifications:
 * we invalidate the relevant React Query caches and let REST refetch the data,
 * so permissions are enforced by the API in one place.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [state, setState] = useState<ConnectionState>('offline')
  const pathRef = useRef(location.pathname)
  pathRef.current = location.pathname

  useEffect(() => {
    if (!user) return
    let socket: WebSocket | null = null
    let attempts = 0
    let closedByUs = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let pingTimer: ReturnType<typeof setInterval> | undefined

    const handleEvent = (msg: RealtimeEvent) => {
      if (msg.event === 'connected' || msg.event === 'pong' || !msg.ticket) return
      const ticketId = msg.ticket.id
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      if (msg.event === 'ticket.updated') queryClient.invalidateQueries({ queryKey: ['draft', ticketId] })

      const fromSomeoneElse = msg.actor_id !== user.id
      const viewingTicket = pathRef.current.endsWith(`/tickets/${ticketId}`)
      if (!fromSomeoneElse) return

      if (user.role === 'AUTHOR' && msg.event === 'message.created' && !viewingTicket) {
        toast.info(`BookLeaf replied to ${msg.ticket.reference}`, {
          description: msg.ticket.subject,
          action: { label: 'View', onClick: () => navigate(`/author/tickets/${ticketId}`) },
        })
      }
      if (user.role === 'ADMIN' && msg.event === 'ticket.created') {
        const urgent = msg.ticket.priority === 'CRITICAL' || msg.ticket.priority === 'HIGH'
        const notify = urgent ? toast.warning : toast.info
        notify(`New ${urgent ? msg.ticket.priority!.toLowerCase() + ' ' : ''}ticket from ${msg.ticket.author_name}`, {
          description: msg.ticket.subject,
          action: { label: 'Open', onClick: () => navigate(`/admin/tickets/${ticketId}`) },
        })
      }
      if (user.role === 'ADMIN' && msg.event === 'message.created' && !viewingTicket && msg.ticket.assigned_to === user.id) {
        toast.info(`${msg.ticket.author_name} replied on ${msg.ticket.reference}`, {
          action: { label: 'Open', onClick: () => navigate(`/admin/tickets/${ticketId}`) },
        })
      }
    }

    const connect = async () => {
      setState('connecting')
      const token = attempts > 0 ? await ensureFreshAccessToken() : tokenStore.access
      if (closedByUs) return
      if (!token) {
        setState('offline')
        return
      }
      socket = new WebSocket(`${WS_URL}/ws/events/?token=${encodeURIComponent(token)}`)
      socket.onopen = () => {
        const wasReconnect = attempts > 0
        attempts = 0
        setState('live')
        // Catch up on anything missed while disconnected.
        if (wasReconnect) queryClient.invalidateQueries()
        pingTimer = setInterval(() => socket?.readyState === WebSocket.OPEN && socket.send('{"type":"ping"}'), PING_INTERVAL_MS)
      }
      socket.onmessage = (e) => {
        try {
          handleEvent(JSON.parse(e.data) as RealtimeEvent)
        } catch {
          /* ignore malformed frames */
        }
      }
      socket.onclose = () => {
        clearInterval(pingTimer)
        if (closedByUs) return
        setState('offline')
        attempts += 1
        const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** Math.min(attempts, 5))
        retryTimer = setTimeout(connect, delay)
      }
    }

    connect()
    return () => {
      closedByUs = true
      clearTimeout(retryTimer)
      clearInterval(pingTimer)
      socket?.close()
      setState('offline')
    }
  }, [user, queryClient, navigate])

  return <RealtimeContext.Provider value={state}>{children}</RealtimeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConnectionState() {
  return useContext(RealtimeContext)
}

/** Polling interval to use as a fallback while the socket is down. */
// eslint-disable-next-line react-refresh/only-export-components
export function useFallbackInterval(ms = 15_000): number | false {
  return useConnectionState() === 'live' ? false : ms
}
