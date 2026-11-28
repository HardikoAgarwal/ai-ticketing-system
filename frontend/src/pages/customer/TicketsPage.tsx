import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Layers, LifeBuoy, MessageCircleReply, Plus, Search, SearchX, Ticket, Timer } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { EmptyState, ErrorState } from '@/components/ds'
import { TicketCard, TicketCardSkeleton } from '@/components/customer/TicketCard'
import { announce } from '@/components/shell/announce'
import { StatTile } from '@/features/inbox/StatTile'
import { inView, PORTAL_VIEWS, type PortalView } from '@/features/portal/model'
import { PageHeader } from '@/features/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { firstName } from '@/lib/format'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

const EMPTY: Record<PortalView, { title: string; description: string }> = {
  active: { title: 'Nothing open right now', description: 'When you send a request, it shows up here until it is resolved.' },
  replies: { title: "You're all caught up", description: 'New replies from our team will show up here.' },
  confirm: { title: 'Nothing to confirm', description: 'When our team resolves a request, you confirm it here.' },
  all: { title: 'No requests yet', description: 'Describe your question and our team will get back to you quickly.' },
}

/** The customer's home: their requests as ticket cards, filtered by four solid tiles that also give the counts. */
export function TicketsPage() {
  const { user } = useAuth()
  const { slug, api } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab') as PortalView
  const view: PortalView = PORTAL_VIEWS.includes(requested) ? requested : 'active'
  const [search, setSearch] = useState('')
  const refetchInterval = useFallbackInterval()
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tickets', slug, 'requester'],
    queryFn: () => api.tickets.listRequester(),
    refetchInterval,
  })

  const all = useMemo(() => data?.results ?? [], [data])
  const count = (v: PortalView) => all.filter((t) => inView(t, v)).length
  const replies = count('replies')

  // Tell assistive tech when a reply lands while the list is open (the realtime provider refreshes the query).
  const lastUnread = useRef<number | null>(null)
  useEffect(() => {
    if (!data) return
    if (lastUnread.current !== null && replies > lastUnread.current) announce('You have a new reply from our team.')
    lastUnread.current = replies
  }, [data, replies])

  const pick = (v: PortalView) => setParams(v === 'active' ? {} : { tab: v }, { replace: true })
  const q = search.trim().toLowerCase()
  const shown = all
    .filter((t) => inView(t, view))
    .filter((t) => !q || `${t.subject} ${t.reference} ${t.description}`.toLowerCase().includes(q))
    // what needs them first: new replies, then resolutions to confirm, then most recently updated
    .sort((a, b) => Number(b.has_unread) - Number(a.has_unread) || Number(b.status === 'RESOLVED') - Number(a.status === 'RESOLVED') || Date.parse(b.updated_at) - Date.parse(a.updated_at))

  const newRequest = (
    <Button asChild className="bg-brand text-on-brand hover:bg-brand/90">
      <Link to={`/w/${slug}/help/tickets/new`}>
        <Plus aria-hidden /> New request
      </Link>
    </Button>
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Ticket}
        title={`Hi ${firstName(user?.full_name)}`}
        description="Your requests in one place. Our team replies here, with a little AI help."
        actions={
          <div className="flex w-full items-center gap-2 lg:w-auto">
            <div className="relative min-w-0 flex-1 lg:w-72 lg:flex-none">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requests" aria-label="Search your requests" className="h-10 bg-surface pl-9" type="search" />
            </div>
            {newRequest}
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="sk h-[150px] rounded-panel bg-sunken" />
          ))}
        </div>
      ) : (
        !isError && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="group" aria-label="Your requests. Select one to filter the list">
            <StatTile icon={Timer} hue="sky" label="Active" value={count('active')} foot="Our team is on these" active={view === 'active'} onPick={() => pick('active')} />
            <StatTile icon={MessageCircleReply} hue="mint" label="New replies" value={replies} foot={replies ? 'Waiting for you to read' : 'All read'} active={view === 'replies'} onPick={() => pick('replies')} />
            <StatTile icon={CheckCircle2} hue="butter" label="To confirm" value={count('confirm')} foot="Did it solve your issue?" active={view === 'confirm'} onPick={() => pick('confirm')} />
            <StatTile icon={Layers} hue="slate" label="All requests" value={all.length} foot="Including closed ones" active={view === 'all'} onPick={() => pick('all')} />
          </div>
        )
      )}

      <p className="sr-only" aria-live="polite">
        {isLoading ? 'Loading your requests' : `${shown.length} ${shown.length === 1 ? 'request' : 'requests'} shown`}
      </p>

      {isLoading ? (
        <div className="flex flex-col gap-5" role="status" aria-label="Loading">
          <TicketCardSkeleton />
          <TicketCardSkeleton />
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : shown.length === 0 ? (
        q ? (
          <EmptyState icon={SearchX} title="No matching requests" description={`Nothing in this view matches “${search.trim()}”.`} action={<Button variant="outline" onClick={() => setSearch('')}>Clear search</Button>} />
        ) : (
          <EmptyState icon={LifeBuoy} title={EMPTY[view].title} description={EMPTY[view].description} action={view === 'all' || view === 'active' ? newRequest : undefined} />
        )
      ) : (
        <ul className="flex flex-col gap-5 pb-2">
          {shown.map((t) => (
            <TicketCard key={t.id} ticket={t} slug={slug} />
          ))}
        </ul>
      )}
    </div>
  )
}
