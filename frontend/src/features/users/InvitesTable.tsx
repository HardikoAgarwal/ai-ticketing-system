import { Check, Copy, X } from 'lucide-react'
import { useState } from 'react'

import { RelativeTime } from '@/components/common'
import { DataTable, TBODY, Td, Th } from '@/components/ds'
import { Button } from '@/components/ui/button'
import type { Invite } from '@/lib/types'

import { copyInviteLink } from './InviteDialog'
import { RoleChip } from './roles'

const ROW = 'even:bg-[var(--row-alt)]'

export function InvitesTable({ invites, onRevoke }: { invites: Invite[]; onRevoke: (i: Invite) => void }) {
  const [copied, setCopied] = useState<number | null>(null)
  const copy = async (i: Invite) => {
    if (await copyInviteLink(i.token)) {
      setCopied(i.id)
      setTimeout(() => setCopied(null), 1600)
    }
  }
  return (
    <DataTable caption="Pending invites">
      <colgroup>
        <col className="w-[40%]" />
        <col className="w-[16%]" />
        <col className="w-[18%]" />
        <col className="w-[26%]" />
      </colgroup>
      <thead>
        <tr>
          <Th>Email</Th>
          <Th>Role</Th>
          <Th>Sent</Th>
          <Th className="text-right">Actions</Th>
        </tr>
      </thead>
      <tbody className={TBODY}>
        {invites.map((i) => (
          <tr key={i.id} className={ROW}>
            <Td>
              <span className="block truncate text-[15px] font-semibold text-ink">{i.email}</span>
            </Td>
            <Td>
              <RoleChip role={i.role} />
            </Td>
            <Td>
              <span className="text-sm text-ink-2">
                <RelativeTime value={i.created_at} />
              </span>
            </Td>
            <Td className="text-right">
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => copy(i)}>
                  {copied === i.id ? <Check /> : <Copy />} {copied === i.id ? 'Copied' : 'Copy link'}
                </Button>
                <Button variant="outline" size="sm" className="text-rose-ink hover:text-rose-ink" onClick={() => onRevoke(i)}>
                  <X /> Revoke
                </Button>
              </div>
            </Td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  )
}
