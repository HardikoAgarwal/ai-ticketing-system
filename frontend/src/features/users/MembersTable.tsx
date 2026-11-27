import { MoreHorizontal, Shield, Headphones, UserMinus } from 'lucide-react'

import { Avatar, Chip, DataTable, IconButton, TBODY, Td, Th } from '@/components/ds'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatDate } from '@/lib/format'
import type { Member, Role } from '@/lib/types'

import { DemoLock } from './DemoLock'
import { RoleChip } from './roles'

const ROW = 'even:bg-[var(--row-alt)]'

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
                {manageable && demo && (
                  <DemoLock locked>
                    <IconButton label={`Actions for ${m.full_name}`} icon={MoreHorizontal} disabled />
                  </DemoLock>
                )}
                {hasMenu && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <IconButton label={`Actions for ${m.full_name}`} icon={MoreHorizontal} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {can.changeRole && (
                        <>
                          <DropdownMenuLabel className="text-xs text-ink-3">Change role</DropdownMenuLabel>
                          {m.role !== 'ADMIN' && (
                            <DropdownMenuItem onClick={() => onRole(m, 'ADMIN')}>
                              <Shield /> Make admin
                            </DropdownMenuItem>
                          )}
                          {m.role !== 'AGENT' && (
                            <DropdownMenuItem onClick={() => onRole(m, 'AGENT')}>
                              <Headphones /> Make agent
                            </DropdownMenuItem>
                          )}
                          {can.remove && <DropdownMenuSeparator />}
                        </>
                      )}
                      {can.remove && (
                        <DropdownMenuItem variant="destructive" onClick={() => onRemove(m)}>
                          <UserMinus /> Remove from workspace
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
