import { Crown, Headphones, Shield, UserRound } from 'lucide-react'

import { Chip, type ChipTone } from '@/components/ds'
import type { Role } from '@/lib/types'

export const ROLES: { role: Role; label: string; icon: typeof Crown; tone: ChipTone; can: string }[] = [
  { role: 'OWNER', label: 'Owner', icon: Crown, tone: 'violet', can: 'Everything an admin can do, plus changing roles and removing admins. Created the workspace.' },
  { role: 'ADMIN', label: 'Admin', icon: Shield, tone: 'blue', can: 'Change settings, response targets and categories, manage the knowledge base, invite teammates, remove agents and work tickets.' },
  { role: 'AGENT', label: 'Agent', icon: Headphones, tone: 'green', can: 'Work the inbox and reply, add internal notes, read settings and articles.' },
  { role: 'REQUESTER', label: 'Customer', icon: UserRound, tone: 'slate', can: 'Raise and follow their own tickets and see help suggestions. Never sees notes or triage.' },
]
export const ROLE_META = Object.fromEntries(ROLES.map((r) => [r.role, r])) as Record<Role, (typeof ROLES)[number]>

export function RoleChip({ role }: { role: Role }) {
  const m = ROLE_META[role]
  return (
    <Chip tone={m.tone} icon={m.icon} size="sm">
      {m.label}
    </Chip>
  )
}
