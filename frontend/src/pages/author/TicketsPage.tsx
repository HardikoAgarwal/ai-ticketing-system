import { useQuery } from '@tanstack/react-query'
import { Inbox, LifeBuoy } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import { TicketRow } from '@/components/author/TicketRow'
import { PageHeader } from '@/components/common'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ticketsApi } from '@/lib/endpoints'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

const TABS = {
  active: { label: 'Active', filter: (s: string) => s === 'OPEN' || s === 'IN_PROGRESS' },
  resolved: { label: 'Resolved', filter: (s: string) => s === 'RESOLVED' || s === 'CLOSED' },
  all: { label: 'All', filter: () => true },
} as const
type TabKey = keyof typeof TABS

export function TicketsPage() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as TabKey) in TABS ? (params.get('tab') as TabKey) : 'active'
  const refetchInterval = useFallbackInterval()
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tickets', 'author', 'all'],
    queryFn: () => ticketsApi.listAuthor(),
    refetchInterval,
  })

  const all = data?.results ?? []
  const visible = all.filter((t) => TABS[tab].filter(t.status))
  const counts = Object.fromEntries(Object.entries(TABS).map(([k, v]) => [k, all.filter((t) => v.filter(t.status)).length]))

  return (
    <div>
      <PageHeader
        title="My Tickets"
        description="Every question you've raised with BookLeaf, and our replies."
        actions={
          <Button asChild>
            <Link to="/author/tickets/new">
              <LifeBuoy /> Get help
            </Link>
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={(v) => setParams(v === 'active' ? {} : { tab: v }, { replace: true })} className="mb-4">
        <TabsList>
          {Object.entries(TABS).map(([key, t]) => (
            <TabsTrigger key={key} value={key}>
              {t.label}
              {data && (
                <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">{counts[key]}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : all.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No tickets yet"
          description="Have a question about royalties, ISBNs, printing or distribution? Raise a request and we'll get back to you, usually within a day."
          action={
            <Button asChild>
              <Link to="/author/tickets/new">Raise your first request</Link>
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={tab === 'active' ? 'Nothing open right now' : 'No resolved tickets yet'}
          description={tab === 'active' ? 'All your requests have been resolved.' : undefined}
        />
      ) : (
        <div className="space-y-3">
          {visible.map((t) => (
            <TicketRow key={t.id} ticket={t} />
          ))}
        </div>
      )}
    </div>
  )
}
