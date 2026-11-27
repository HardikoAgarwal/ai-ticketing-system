import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Headphones, MailPlus, Search, Shield, UserRound, Users, UserPlus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { ConfirmDialog, type ConfirmOptions } from '@/components/ConfirmDialog'
import { ErrorState, Skeleton } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { HowTile } from '@/features/kb/HowTile'
import { StatTile } from '@/features/inbox/StatTile'
import { Message } from '@/features/inbox/ListStates'
import type { SkeletonColumn } from '@/features/inbox/table-columns'
import { TableSkeleton } from '@/features/inbox/TableSkeleton'
import { PageHeader } from '@/features/shared/PageHeader'
import { errorMessage } from '@/lib/api'
import type { Invite, Member, Role } from '@/lib/types'

import { InviteDialog } from './InviteDialog'
import { InvitesTable } from './InvitesTable'
import { MembersTable } from './MembersTable'
import { RolesDialog } from './RolesDialog'

/** Which group the table shows. Nothing selected means everyone (owners, admins, agents and customers); the tiles above the table are the only filter. */
type Filter = 'all' | 'admin' | 'agent' | 'customers' | 'invites'

const USER_COLUMNS: SkeletonColumn[] = [
  { label: 'Person', kind: 'person' },
  { label: 'Role', kind: 'chip', className: 'w-36' },
  { label: 'Joined', kind: 'short', className: 'w-40' },
  { label: 'Actions', kind: 'short', className: 'w-24' },
]

const GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,0.4fr)]'
const DEMO_NOTE = ' This is a demo preview: nothing is saved, and it resets when you reload.'

/**
 * Manage users: the team, customers and pending invites in one place. The tiles count each group and are the filter for the table beneath; every
 * action (invite, change role, remove, revoke) has a clear confirmation. In a demo workspace the whole flow works as a preview: the changes are kept
 * only on this page (nothing is sent to the server), so you can see every step.
 */
export function UsersPage() {
  const { slug, api, manager, role: viewerRole, isDemo } = useWorkspace()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [inviting, setInviting] = useState(false)
  const [roles, setRoles] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  // demo preview only: what the person has "done" on this page
  const [demoRoles, setDemoRoles] = useState<Record<number, Role>>({})
  const [demoRemoved, setDemoRemoved] = useState<number[]>([])
  const [demoInvites, setDemoInvites] = useState<Invite[]>([])

  const members = useQuery({ queryKey: ['members', slug, 'all'], queryFn: () => api.members(false), enabled: manager })
  const invites = useQuery({ queryKey: ['invites', slug], queryFn: api.invites, enabled: manager })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['members', slug] })
    queryClient.invalidateQueries({ queryKey: ['invites', slug] })
  }
  const changeRole = useMutation({
    mutationFn: async ({ m, role }: { m: Member; role: 'ADMIN' | 'AGENT' }) => {
      if (isDemo) setDemoRoles((r) => ({ ...r, [m.id]: role }))
      else await api.updateMemberRole(m.id, role)
    },
    onSuccess: (_d, { m, role }) => {
      refresh()
      toast.success(`${m.full_name} is now ${role === 'ADMIN' ? 'an admin' : 'an agent'}.${isDemo ? ' (Demo preview, not saved.)' : ''}`)
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
  const remove = useMutation({
    mutationFn: async (m: Member) => {
      if (isDemo) setDemoRemoved((r) => [...r, m.id])
      else await api.removeMember(m.id)
    },
    onSuccess: (_d, m) => {
      refresh()
      toast.success(`${m.full_name} was removed.${isDemo ? ' (Demo preview, not saved.)' : ''}`)
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
  const revoke = useMutation({
    mutationFn: async (i: Invite) => {
      if (isDemo) setDemoInvites((list) => list.filter((x) => x.id !== i.id))
      else await api.revokeInvite(i.id)
    },
    onSuccess: () => {
      refresh()
      toast.success(`Invite revoked.${isDemo ? ' (Demo preview, not saved.)' : ''}`)
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const all = useMemo(
    () => (members.data ?? []).filter((m) => !demoRemoved.includes(m.id)).map((m) => (demoRoles[m.id] ? { ...m, role: demoRoles[m.id] } : m)),
    [members.data, demoRemoved, demoRoles],
  )
  const staff = useMemo(() => all.filter((m) => m.role !== 'REQUESTER'), [all])
  const customers = useMemo(() => all.filter((m) => m.role === 'REQUESTER'), [all])
  const pending = useMemo(() => [...demoInvites, ...(invites.data ?? [])], [invites.data, demoInvites])
  const admins = staff.filter((m) => m.role === 'OWNER' || m.role === 'ADMIN').length
  const agents = staff.filter((m) => m.role === 'AGENT').length

  const needle = q.trim().toLowerCase()
  const match = (text: string) => !needle || text.toLowerCase().includes(needle)
  const everyone = [...staff, ...customers]
  const shownTeam = (filter === 'all' ? everyone : staff).filter((m) => (filter === 'admin' ? m.role !== 'AGENT' : filter === 'agent' ? m.role === 'AGENT' : true) && match(`${m.full_name} ${m.email} ${m.company ?? ''}`))
  const shownCustomers = customers.filter((m) => match(`${m.full_name} ${m.email} ${m.company ?? ''}`))
  const shownInvites = pending.filter((i) => match(i.email))

  if (!manager) return <Navigate to={`/w/${slug}/agent`} replace />

  const note = isDemo ? DEMO_NOTE : ''
  const askRemove = (m: Member) =>
    setConfirm({ title: `Remove ${m.full_name}?`, description: `${m.full_name} loses access to this workspace right away. Their open tickets go back to the queue as unassigned; past replies and history stay.${note}`, confirmLabel: 'Remove', destructive: true, onConfirm: () => remove.mutate(m) })
  const askRevoke = (i: Invite) =>
    setConfirm({ title: 'Revoke this invite?', description: `The link sent to ${i.email} stops working. You can invite them again later.${note}`, confirmLabel: 'Revoke invite', destructive: true, onConfirm: () => revoke.mutate(i) })
  const askRole = (m: Member, role: 'ADMIN' | 'AGENT') =>
    setConfirm({ title: `Make ${m.full_name} ${role === 'ADMIN' ? 'an admin' : 'an agent'}?`, description: `${role === 'ADMIN' ? 'Admins can change settings, manage the knowledge base, invite teammates and remove agents.' : 'Agents work the inbox and reply. They lose access to changing settings and managing the team.'}${note}`, confirmLabel: 'Change role', onConfirm: () => changeRole.mutate({ m, role }) })

  const pick = (f: Filter) => setFilter((cur) => (cur === f ? 'all' : f))
  const loading = members.isLoading || invites.isLoading
  const error = members.error ?? invites.error

  return (
    <div className="mx-auto w-full max-w-[1400px] pb-8">
      <div className="space-y-8 pb-8">
        <PageHeader
          icon={Users}
          title="Manage users"
          description="Invite teammates, change what they can do, and remove people who have left."
          actions={
            <>
              <div className="relative min-w-0 basis-full sm:basis-auto sm:w-72">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name or email"
                  aria-label="Search people"
                  className="h-10 w-full rounded-control border border-line-strong bg-surface pr-9 pl-10 text-sm text-ink shadow-card outline-none placeholder:text-ink-3 focus:border-violet focus:ring-2 focus:ring-violet/30 [&::-webkit-search-cancel-button]:hidden"
                />
                {q && (
                  <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-3 hover:bg-sunken hover:text-ink focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none">
                    <X className="size-3.5" aria-hidden />
                  </button>
                )}
              </div>
              <Button className="h-10" onClick={() => setInviting(true)}>
                <UserPlus /> Invite user
              </Button>
            </>
          }
        />
      </div>

      {loading ? (
        <div className="space-y-8">
          <div className={GRID}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className={i === 5 ? 'h-16 rounded-panel max-sm:col-span-2 sm:h-[158px]' : 'h-24 rounded-panel sm:h-[158px]'} />
            ))}
          </div>
          <TableSkeleton columns={USER_COLUMNS} caption="Loading users" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refresh} />
      ) : (
        <div className="space-y-8">
          <div className={GRID} role="group" aria-label="People by group. Select one to filter the list">
            <StatTile icon={Shield} hue="lav" label="Owners & admins" value={admins} foot="Manage settings and people" active={filter === 'admin'} onPick={() => pick('admin')} />
            <StatTile icon={Headphones} hue="sky" label="Agents" value={agents} foot="Work the inbox" active={filter === 'agent'} onPick={() => pick('agent')} />
            <StatTile icon={UserRound} hue="peach" label="Customers" value={customers.length} foot="Raise and follow tickets" active={filter === 'customers'} onPick={() => pick('customers')} />
            <StatTile icon={MailPlus} hue="butter" label="Pending invites" value={pending.length} foot="Waiting to be accepted" active={filter === 'invites'} onPick={() => pick('invites')} />
            <HowTile label="Roles" onClick={() => setRoles(true)} />
          </div>

          <div>
            {filter === 'invites' ? (
              shownInvites.length ? (
                <InvitesTable invites={shownInvites} onRevoke={askRevoke} />
              ) : (
                <Message
                  icon={MailPlus}
                  hue="butter"
                  title={needle ? 'No invites match' : 'No pending invites'}
                  actions={
                    !needle ? (
                      <Button onClick={() => setInviting(true)}>
                        <UserPlus /> Invite user
                      </Button>
                    ) : undefined
                  }
                >
                  {needle ? 'Try a different email.' : 'Invites you create wait here until the person accepts. You can copy or revoke the link any time.'}
                </Message>
              )
            ) : filter === 'customers' ? (
              shownCustomers.length ? (
                <MembersTable members={shownCustomers} kind="customers" viewer={viewerRole ?? 'AGENT'} demo={false} showEmail={!isDemo} onRole={askRole} onRemove={askRemove} />
              ) : (
                <Message icon={UserRound} hue="peach" title={needle ? 'No customers match' : 'No customers yet'}>
                  {needle ? 'Try a different name or email.' : 'Customers appear here once they raise a ticket or sign up to the portal.'}
                </Message>
              )
            ) : shownTeam.length ? (
              <MembersTable members={shownTeam} kind="team" meId={user?.id} viewer={viewerRole ?? 'AGENT'} demo={false} showEmail={!isDemo} onRole={askRole} onRemove={askRemove} />
            ) : (
              <Message icon={Users} hue="lav" title={needle ? 'No one matches' : 'No one here yet'}>
                {needle ? 'Try a different name or clear the filter by selecting the tile again.' : 'Invite your first teammate to get started.'}
              </Message>
            )}
          </div>
        </div>
      )}

      <InviteDialog open={inviting} onOpenChange={setInviting} demo={isDemo} onDemoInvite={(i) => setDemoInvites((list) => [i, ...list])} />
      <RolesDialog open={roles} onOpenChange={setRoles} />
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
