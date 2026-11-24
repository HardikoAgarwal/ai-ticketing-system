import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Inbox, LifeBuoy, MessageCircleReply, Plus } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { PageHeader, Stat } from '@/components/common'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import { TicketRow } from '@/components/customer/TicketRow'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { firstName } from '@/lib/format'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

const TABS = { active: 'Active', resolved: 'Resolved', all: 'All' } as const
type Tab = keyof typeof TABS

export function TicketsPage() {
  const { user } = useAuth()
  const { slug, api, brief } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const tab: Tab = (params.get('tab') as Tab) in TABS ? (params.get('tab') as Tab) : 'active'
  const refetchInterval = useFallbackInterval()
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tickets', slug, 'requester'],
    queryFn: () => api.tickets.listRequester(),
    refetchInterval,
  })
  const all = data?.results ?? []
  const active = all.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS')
  const resolved = all.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED')
  const unread = all.filter((t) => t.has_unread)
  const shown = tab === 'active' ? active : tab === 'resolved' ? resolved : all

  return (
    <div>
      <PageHeader
        title={`Hi ${firstName(user?.full_name)}, how can we help?`}
        description={`Track your requests to ${brief?.name ?? 'our team'} and get answers fast.`}
        actions={
          <Button asChild>
            <Link to={`/w/${slug}/help/tickets/new`}>
              <Plus /> New request
            </Link>
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
        <Stat label="Open requests" value={active.length} icon={<Inbox className="size-4" />} accent="blue" hint="We're working on these" />
        <Stat label="New replies" value={unread.length} icon={<MessageCircleReply className="size-4" />} accent="violet" hint={unread.length ? 'Waiting for you to read' : 'You are all caught up'} />
        <Stat label="Resolved" value={resolved.length} icon={<CheckCircle2 className="size-4" />} accent="green" hint="Closed out so far" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setParams(v === 'active' ? {} : { tab: v }, { replace: true })} className="mb-4">
        <TabsList>
          {(Object.keys(TABS) as Tab[]).map((k) => (
            <TabsTrigger key={k} value={k}>
              {TABS[k]}
              <span className="ml-1.5 text-xs text-muted-foreground">{k === 'active' ? active.length : k === 'resolved' ? resolved.length : all.length}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title={tab === 'resolved' ? 'Nothing resolved yet' : 'No requests here'}
          description="Describe your question and our team (with a little AI help) will get back to you quickly."
          action={
            <Button asChild>
              <Link to={`/w/${slug}/help/tickets/new`}>
                <Plus /> Get help
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {shown.map((t) => (
            <TicketRow key={t.id} ticket={t} slug={slug} />
          ))}
        </div>
      )}
    </div>
  )
}
