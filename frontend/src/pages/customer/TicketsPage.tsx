import { useQuery } from '@tanstack/react-query'
import { LifeBuoy, Plus, Search, SearchX } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { EmptyState, ErrorState, Panel, SegmentedControl, SkeletonRows } from '@/components/ds'
import { TicketRow } from '@/components/customer/TicketRow'
import { announce } from '@/components/shell/announce'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { firstName } from '@/lib/format'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

type View = 'active' | 'replies' | 'resolved' | 'all'
const VIEWS: View[] = ['active', 'replies', 'resolved', 'all']

export function TicketsPage() {
  const { user } = useAuth()
  const { slug, api, brief } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab') as View
  const view: View = VIEWS.includes(requested) ? requested : 'active'
  const [search, setSearch] = useState('')
  const refetchInterval = useFallbackInterval()
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tickets', slug, 'requester'],
    queryFn: () => api.tickets.listRequester(),
    refetchInterval,
  })

  const all = useMemo(() => data?.results ?? [], [data])
  const active = all.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS')
  const resolved = all.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED')
  const replies = all.filter((t) => t.has_unread)

  // Tell assistive tech when a reply lands while the list is open (the realtime provider refreshes the query).
  const lastUnread = useRef<number | null>(null)
  useEffect(() => {
    if (!data) return
    if (lastUnread.current !== null && replies.length > lastUnread.current) announce('You have a new reply from our team.')
    lastUnread.current = replies.length
  }, [data, replies.length])

  const base = view === 'active' ? active : view === 'replies' ? replies : view === 'resolved' ? resolved : all
  const q = search.trim().toLowerCase()
  const shown = q ? base.filter((t) => `${t.subject} ${t.reference} ${t.description}`.toLowerCase().includes(q)) : base

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-3">{brief?.name ?? 'Help center'}</p>
          <h1 className="mt-1 text-[1.75rem] leading-tight font-semibold tracking-tight text-balance sm:text-[2rem]">Hi {firstName(user?.full_name)}, how can we help?</h1>
          <p className="mt-1.5 max-w-xl text-[15px] text-ink-2">Follow your requests and get answers fast. Our team, with a little AI help, replies right here.</p>
        </div>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link to={`/w/${slug}/help/tickets/new`}>
            <Plus aria-hidden /> New request
          </Link>
        </Button>
      </header>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
          <SegmentedControl<View>
            ariaLabel="Filter requests"
            value={view}
            onChange={(v) => setParams(v === 'active' ? {} : { tab: v }, { replace: true })}
            options={[
              { value: 'active', label: 'Active', count: active.length },
              { value: 'replies', label: 'New replies', count: replies.length },
              { value: 'resolved', label: 'Resolved', count: resolved.length },
              { value: 'all', label: 'All', count: all.length },
            ]}
          />
        </div>
        <div className="relative md:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your requests" aria-label="Search your requests" className="h-10 pl-9" type="search" />
        </div>
      </div>

      {isLoading ? (
        <SkeletonRows rows={4} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : shown.length === 0 ? (
        q ? (
          <EmptyState icon={SearchX} title="No matching requests" description={`Nothing in this view matches “${search.trim()}”.`} action={<Button variant="outline" onClick={() => setSearch('')}>Clear search</Button>} />
        ) : (
          <EmptyState
            icon={LifeBuoy}
            title={view === 'resolved' ? 'Nothing resolved yet' : view === 'replies' ? "You're all caught up" : 'No requests here'}
            description={view === 'replies' ? 'New replies from our team will show up here.' : 'Describe your question and our team will get back to you quickly.'}
            action={
              <Button asChild>
                <Link to={`/w/${slug}/help/tickets/new`}>
                  <Plus aria-hidden /> Get help
                </Link>
              </Button>
            }
          />
        )
      ) : (
        <Panel as="div" className="overflow-hidden">
          <h2 className="sr-only">
            {shown.length} request{shown.length === 1 ? '' : 's'}
          </h2>
          <ul className="divide-y divide-line">
            {shown.map((t) => (
              <TicketRow key={t.id} ticket={t} slug={slug} />
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}
