import { MoreHorizontal, Shield, Headphones, UserMinus } from 'lucide-react'

import { Avatar, Chip, DataTable, IconButton, TBODY, Td, Th } from '@/components/ds'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatDate } from '@/lib/format'
import type { Member, Role } from '@/lib/types'

import { RoleChip, ROLE_META } from './roles'

const ROW = 'even:bg-[var(--row-alt)]'
const ITEM = 'items-center gap-3.5 rounded-lg px-3 py-3'
const TILE = 'flex size-10 shrink-0 items-center justify-center rounded-control bg-sunken text-ink'

/** Who may change a member: only the owner changes roles; owners remove anyone but the owner, admins remove agents. Mirrors the server. */
export function permissions(viewer: Role, target: Member, isSelf: boolean) {
  const locked = isSelf || target.role === 'OWNER' || target.role === 'REQUESTER'
  return {
    changeRole: !locked && viewer === 'OWNER',
    remove: !locked && (viewer === 'OWNER' || (viewer === 'ADMIN' && target.role === 'AGENT')),
  }
}

export function MembersTable({ members, kind, meId, viewer, demo, showEmail, onRole, onRemove }: { members: Member[]; kind: 'team' | 'customers'; meId?: number; viewer: Role; demo: boolean; showEmail: boolean; onRole: (m: Member, role: 'ADMIN' | 'AGENT') => void; onRemove: (m: Member) => void }) {
  const team = kind === 'team'
  return (
    <DataTable caption={team ? 'Team members' : 'Customers'}>
      <colgroup>
        <col className="w-[44%]" />
        <col className="w-[18%]" />
        <col className="w-[22%]" />
        <col className="w-[16%]" />
      </colgroup>
      <thead>
        <tr>
          <Th>{team ? 'Person' : 'Customer'}</Th>
          <Th>{team ? 'Role' : 'Company'}</Th>
          <Th>Joined</Th>
          <Th className="text-right">{team ? 'Actions' : ''}</Th>
        </tr>
      </thead>
      <tbody className={TBODY}>
        {members.map((m) => {
          const isSelf = m.id === meId
          const can = permissions(viewer, m, isSelf)
          const manageable = team && (can.changeRole || can.remove)
          const hasMenu = manageable && !demo
          return (
            <tr key={m.id} className={ROW}>
              <Td>
                <div className="flex items-center gap-3">
                  <Avatar name={m.full_name} size="md" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-[15px] font-semibold text-ink">
                      <span className="truncate">{m.full_name}</span>
                      {isSelf && (
                        <Chip size="sm" tone="slate">
                          You
                        </Chip>
                      )}
                    </p>
                    <p className="truncate text-[13px] text-ink-2">{showEmail ? m.email : (m.company ?? '')}</p>
                  </div>
                </div>
              </Td>
              <Td>{team ? <RoleChip role={m.role} /> : <span className="block truncate text-sm text-ink-2">{m.company || '—'}</span>}</Td>
              <Td>
                <span className="text-sm text-ink-2">{formatDate(m.joined_at)}</span>
              </Td>
              <Td className="text-right">
                {hasMenu && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <IconButton label={`Actions for ${m.full_name}`} icon={MoreHorizontal} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={8} className="w-80 p-2">
                      <div className="px-3 pt-2.5 pb-3">
                        <p className="truncate text-[15px] font-semibold text-ink">{m.full_name}</p>
                        <p className="mt-0.5 text-xs text-ink-3">{ROLE_META[m.role].label}</p>
                      </div>
                      <DropdownMenuSeparator className="my-1" />
                      {can.changeRole && (
                        <>
                          <DropdownMenuLabel className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase">Change role</DropdownMenuLabel>
                          {m.role !== 'ADMIN' && (
                            <DropdownMenuItem className={ITEM} onClick={() => onRole(m, 'ADMIN')}>
                              <span className={TILE}>
                                <Shield className="size-[18px]" />
                              </span>
                              <span className="min-w-0">
                                <span className="block text-[15px] font-semibold text-ink">Make admin</span>
                                <span className="mt-0.5 block text-[13px] leading-5 font-normal text-ink-2">Can change settings and manage the team.</span>
                              </span>
                            </DropdownMenuItem>
                          )}
                          {m.role !== 'AGENT' && (
                            <DropdownMenuItem className={ITEM} onClick={() => onRole(m, 'AGENT')}>
                              <span className={TILE}>
                                <Headphones className="size-[18px]" />
                              </span>
                              <span className="min-w-0">
                                <span className="block text-[15px] font-semibold text-ink">Make agent</span>
                                <span className="mt-0.5 block text-[13px] leading-5 font-normal text-ink-2">Works the inbox and replies to customers.</span>
                              </span>
                            </DropdownMenuItem>
                          )}
                          {can.remove && <DropdownMenuSeparator className="my-1.5" />}
                        </>
                      )}
                      {can.remove && (
                        <DropdownMenuItem variant="destructive" className={ITEM} onClick={() => onRemove(m)}>
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-rose text-rose-ink">
                            <UserMinus className="size-[18px]" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[15px] font-semibold">Remove from workspace</span>
                            <span className="mt-0.5 block text-[13px] leading-5 font-normal opacity-80">Loses access now; open tickets go back to the queue.</span>
                          </span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </Td>
            </tr>
          )
        })}
      </tbody>
    </DataTable>
  )
}
