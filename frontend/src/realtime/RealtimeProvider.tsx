import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useMatch, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuth } from '@/auth/AuthContext'
import { ensureFreshAccessToken, sessionStore, WS_URL } from '@/lib/api'
import { isStaff, type RealtimeEvent } from '@/lib/types'

import { showDesktopAlert } from './desktopAlerts'

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
  const { user, activeView } = useAuth()
  const slug = useMatch('/w/:slug/*')?.params.slug
  const role = user?.memberships.find((m) => m.workspace.slug === slug)?.role
  const staff = isStaff(role)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [state, setState] = useState<ConnectionState>('offline')
  const pathRef = useRef(location.pathname)
  pathRef.current = location.pathname

  useEffect(() => {
    if (!user || !slug || !role) return
    let socket: WebSocket | null = null
    let attempts = 0
    let closedByUs = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let pingTimer: ReturnType<typeof setInterval> | undefined

    const resolvedAlerted = new Set<number>()

    const handleEvent = (msg: RealtimeEvent) => {
      if (msg.event === 'connected' || msg.event === 'pong' || !msg.ticket) return
      const ticket = msg.ticket
      const ticketId = ticket.id
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      if (msg.event === 'ticket.updated') queryClient.invalidateQueries({ queryKey: ['draft', ticketId] })
      if (ticket.status !== 'RESOLVED') resolvedAlerted.delete(ticketId)

      if (msg.actor_id === user.id) return
      const viewingTicket = pathRef.current.endsWith(`/tickets/${ticketId}`)
      const url = `/w/${slug}/${staff ? 'agent' : 'help'}/tickets/${ticketId}`
      const notify = (title: string, description: string, opts: { urgent?: boolean; label?: string } = {}) => {
        showDesktopAlert(title, description, `${msg.event}:${ticketId}`, () => navigate(url))
        if (viewingTicket) return
        ;(opts.urgent ? toast.warning : toast.info)(title, {
          description,
          action: { label: opts.label ?? 'Open', onClick: () => navigate(url) },
        })
      }

      if (!staff) {
        if (msg.event === 'message.created') notify(`New reply on ${ticket.reference}`, ticket.subject, { label: 'View' })
        if (msg.event === 'ticket.updated' && ticket.status === 'RESOLVED' && !resolvedAlerted.has(ticketId)) {
          resolvedAlerted.add(ticketId)
          notify(`${ticket.reference} was marked as resolved`, 'Please confirm whether your issue is sorted.', { label: 'Confirm' })
        }
        return
      }

      const relevant = ticket.assigned_to === user.id || ticket.assigned_to == null
      if (msg.event === 'ticket.created') {
        const urgent = ticket.priority === 'CRITICAL' || ticket.priority === 'HIGH'
        notify(`New ${urgent ? ticket.priority!.toLowerCase() + ' ' : ''}ticket from ${ticket.requester_name}`, ticket.subject, { urgent })
      }
      if (msg.event === 'message.created' && msg.by_requester && relevant) {
        notify(`${ticket.requester_name} replied on ${ticket.reference}`, ticket.subject)
      }
    }

    const connect = async () => {
      setState('connecting')
      const token = attempts > 0 ? await ensureFreshAccessToken() : sessionStore.access
      if (closedByUs) return
      if (!token) {
        setState('offline')
        return
      }
      socket = new WebSocket(`${WS_URL}/ws/events/?token=${encodeURIComponent(token)}&workspace=${encodeURIComponent(slug)}`)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, slug, role, activeView, queryClient, navigate])

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
