import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Headphones, MailPlus, Search, Shield, Users, UserPlus, X } from 'lucide-react'
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
import type { Invite, Member } from '@/lib/types'
import { cn } from '@/lib/utils'

import { DemoLock } from './DemoLock'
import { InviteDialog } from './InviteDialog'
import { InvitesTable } from './InvitesTable'
import { MembersTable } from './MembersTable'
import { RolesDialog } from './RolesDialog'

type View = 'team' | 'invites' | 'customers'
type RoleFilter = 'all' | 'admin' | 'agent'

const USER_COLUMNS: SkeletonColumn[] = [
  { label: 'Person', kind: 'person' },
  { label: 'Role', kind: 'chip', className: 'w-36' },
  { label: 'Joined', kind: 'short', className: 'w-40' },
  { label: 'Actions', kind: 'short', className: 'w-24' },
]

function ViewTab({ active, count, onClick, children }: { active: boolean; count: number; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-11 items-center gap-2.5 rounded-control border px-5 text-[15px] font-semibold whitespace-nowrap transition-[transform,background-color,color] duration-150 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        active ? 'border-line-strong bg-ink text-canvas' : 'border-line bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink',
      )}
    >
      {children}
      <span className={cn('rounded-md px-1.5 text-xs tabular-nums', active ? 'bg-canvas/20 text-canvas' : 'bg-sunken text-ink-2')}>{count}</span>
    </button>
  )
}

/**
 * Manage users: the team, pending invites and customers in one place. Tiles count each group (and filter the team by role), tabs above the
 * table switch the list, and every action (invite, change role, remove, revoke) has a clear confirmation.
 */
export function UsersPage() {
  const { slug, api, manager, role: viewerRole, isDemo } = useWorkspace()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [view, setView] = useState<View>('team')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [q, setQ] = useState('')
  const [inviting, setInviting] = useState(false)
  const [roles, setRoles] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)

  const members = useQuery({ queryKey: ['members', slug, 'all'], queryFn: () => api.members(false), enabled: manager })
  const invites = useQuery({ queryKey: ['invites', slug], queryFn: api.invites, enabled: manager })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['members', slug] })
    queryClient.invalidateQueries({ queryKey: ['invites', slug] })
  }
  const changeRole = useMutation({
    mutationFn: ({ m, role }: { m: Member; role: 'ADMIN' | 'AGENT' }) => api.updateMemberRole(m.id, role),
    onSuccess: (_d, { m, role }) => {
      refresh()
      toast.success(`${m.full_name} is now ${role === 'ADMIN' ? 'an admin' : 'an agent'}.`)
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
  const remove = useMutation({
    mutationFn: (m: Member) => api.removeMember(m.id),
    onSuccess: (_d, m) => {
      refresh()
      toast.success(`${m.full_name} was removed.`)
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
  const revoke = useMutation({
    mutationFn: (i: Invite) => api.revokeInvite(i.id),
    onSuccess: () => {
      refresh()
      toast.success('Invite revoked.')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const all = useMemo(() => members.data ?? [], [members.data])
  const staff = useMemo(() => all.filter((m) => m.role !== 'REQUESTER'), [all])
  const customers = useMemo(() => all.filter((m) => m.role === 'REQUESTER'), [all])
  const pending = useMemo(() => invites.data ?? [], [invites.data])
  const admins = staff.filter((m) => m.role === 'OWNER' || m.role === 'ADMIN').length
  const agents = staff.filter((m) => m.role === 'AGENT').length

  const needle = q.trim().toLowerCase()
  const match = (text: string) => !needle || text.toLowerCase().includes(needle)
  const shownTeam = staff.filter((m) => (roleFilter === 'all' || (roleFilter === 'admin' ? m.role !== 'AGENT' : m.role === 'AGENT')) && match(`${m.full_name} ${m.email}`))
  const shownCustomers = customers.filter((m) => match(`${m.full_name} ${m.email} ${m.company ?? ''}`))
  const shownInvites = pending.filter((i) => match(i.email))

  if (!manager) return <Navigate to={`/w/${slug}/agent`} replace />

  const askRemove = (m: Member) =>
    setConfirm({ title: `Remove ${m.full_name}?`, description: `${m.full_name} loses access to this workspace right away. Their open tickets go back to the queue as unassigned; past replies and history stay.`, confirmLabel: 'Remove', destructive: true, onConfirm: () => remove.mutate(m) })
  const askRevoke = (i: Invite) =>
    setConfirm({ title: 'Revoke this invite?', description: `The link sent to ${i.email} stops working. You can invite them again later.`, confirmLabel: 'Revoke invite', destructive: true, onConfirm: () => revoke.mutate(i) })
  const askRole = (m: Member, role: 'ADMIN' | 'AGENT') =>
    setConfirm({ title: `Make ${m.full_name} ${role === 'ADMIN' ? 'an admin' : 'an agent'}?`, description: role === 'ADMIN' ? 'Admins can change settings, manage the knowledge base, invite teammates and remove agents.' : 'Agents work the inbox and reply. They lose access to changing settings and managing the team.', confirmLabel: 'Change role', onConfirm: () => changeRole.mutate({ m, role }) })

  const pickRole = (r: RoleFilter) => {
    setView('team')
    setRoleFilter((cur) => (cur === r ? 'all' : r))
  }
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
              <DemoLock locked={isDemo}>
                <Button className="h-10" disabled={isDemo} onClick={() => setInviting(true)}>
                  <UserPlus /> Invite user
                </Button>
              </DemoLock>
            </>
          }
        />
      </div>

      {loading ? (
        <div className="space-y-8">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,0.4fr)]">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className={i === 4 ? 'h-16 rounded-panel max-sm:col-span-3 sm:h-[158px]' : 'h-24 rounded-panel sm:h-[158px]'} />
            ))}
          </div>
          <TableSkeleton columns={USER_COLUMNS} caption="Loading users" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refresh} />
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,0.4fr)]" role="group" aria-label="People by group. Select one to filter the list">
            <StatTile icon={Shield} hue="lav" label="Owners & admins" value={admins} foot="Manage settings and people" active={view === 'team' && roleFilter === 'admin'} onPick={() => pickRole('admin')} />
            <StatTile icon={Headphones} hue="sky" label="Agents" value={agents} foot="Work the inbox" active={view === 'team' && roleFilter === 'agent'} onPick={() => pickRole('agent')} />
            <StatTile icon={MailPlus} hue="butter" label="Pending invites" value={pending.length} foot="Waiting to be accepted" active={view === 'invites'} onPick={() => setView(view === 'invites' ? 'team' : 'invites')} />
            <HowTile label="Roles" onClick={() => setRoles(true)} />
          </div>

          <div>
            <div role="tablist" aria-label="People" className="mb-5 flex flex-wrap items-center gap-2">
              <ViewTab active={view === 'team'} count={staff.length} onClick={() => setView('team')}>
                Team
              </ViewTab>
              <ViewTab active={view === 'invites'} count={pending.length} onClick={() => setView('invites')}>
                Pending invites
              </ViewTab>
              <ViewTab active={view === 'customers'} count={customers.length} onClick={() => setView('customers')}>
                Customers
              </ViewTab>
            </div>

            {view === 'team' &&
              (shownTeam.length ? (
                <MembersTable members={shownTeam} kind="team" meId={user?.id} viewer={viewerRole ?? 'AGENT'} demo={isDemo} showEmail={!isDemo} onRole={askRole} onRemove={askRemove} />
              ) : (
                <Message icon={Users} hue="lav" title={needle || roleFilter !== 'all' ? 'No one matches' : 'No team yet'}>
                  {needle || roleFilter !== 'all' ? 'Try a different name or clear the filter by selecting the tile again.' : 'Invite your first teammate to get started.'}
                </Message>
              ))}
            {view === 'invites' &&
              (shownInvites.length ? (
                <InvitesTable invites={shownInvites} onRevoke={askRevoke} />
              ) : (
                <Message
                  icon={MailPlus}
                  hue="butter"
                  title={needle ? 'No invites match' : 'No pending invites'}
                  actions={
                    !needle && !isDemo ? (
                      <Button onClick={() => setInviting(true)}>
                        <UserPlus /> Invite user
                      </Button>
                    ) : undefined
                  }
                >
                  {needle ? 'Try a different email.' : 'Invites you create wait here until the person accepts. You can copy or revoke the link any time.'}
                </Message>
              ))}
            {view === 'customers' &&
              (shownCustomers.length ? (
                <MembersTable members={shownCustomers} kind="customers" viewer={viewerRole ?? 'AGENT'} demo={isDemo} showEmail={!isDemo} onRole={askRole} onRemove={askRemove} />
              ) : (
                <Message icon={Users} hue="sky" title={needle ? 'No customers match' : 'No customers yet'}>
                  {needle ? 'Try a different name or email.' : 'Customers appear here once they raise a ticket or sign up to the portal.'}
                </Message>
              ))}
          </div>
        </div>
      )}

      <InviteDialog open={inviting} onOpenChange={setInviting} />
      <RolesDialog open={roles} onOpenChange={setRoles} />
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
