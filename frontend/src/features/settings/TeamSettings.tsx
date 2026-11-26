import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Crown, Headphones, Loader2, Shield, UserPlus, UserRound, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { Avatar, Chip, SkeletonRows, type ChipTone } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { errorMessage } from '@/lib/api'
import type { Role } from '@/lib/types'

import { SettingsSection } from './rows'

const ROLES: { role: Role; label: string; icon: typeof Crown; tone: ChipTone; can: string }[] = [
  { role: 'OWNER', label: 'Owner', icon: Crown, tone: 'violet', can: 'Everything an admin can do. Created the workspace.' },
  { role: 'ADMIN', label: 'Admin', icon: Shield, tone: 'blue', can: 'Change settings, response targets and categories, manage the knowledge base, invite teammates and work tickets.' },
  { role: 'AGENT', label: 'Agent', icon: Headphones, tone: 'green', can: 'Work the inbox and reply, add internal notes, read settings and articles.' },
  { role: 'REQUESTER', label: 'Customer', icon: UserRound, tone: 'slate', can: 'Raise and follow their own tickets and see help suggestions. Never sees notes or triage.' },
]
const META = Object.fromEntries(ROLES.map((r) => [r.role, r])) as Record<Role, (typeof ROLES)[number]>

export function RoleChip({ role }: { role: Role }) {
  const m = META[role]
  return (
    <Chip tone={m.tone} icon={m.icon} size="sm">
      {m.label}
    </Chip>
  )
}

export function TeamSettings({ readOnly }: { readOnly: boolean }) {
  const { slug, api, isDemo } = useWorkspace()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('AGENT')
  const [copied, setCopied] = useState<string | null>(null)
  const members = useQuery({ queryKey: ['members', slug, 'all'], queryFn: () => api.members(false) })
  const invites = useQuery({ queryKey: ['invites', slug], queryFn: api.invites, enabled: !readOnly })
  const invite = useMutation({
    mutationFn: () => api.createInvite({ email: email.trim(), role }),
    onSuccess: () => {
      setEmail('')
      queryClient.invalidateQueries({ queryKey: ['invites', slug] })
      toast.success('Invite created. Copy the link to share it.')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`)
      setCopied(token)
      setTimeout(() => setCopied(null), 1600)
    } catch {
      toast.error('Could not copy. Select the link and copy it manually.')
    }
  }
  const staff = members.data?.filter((m) => m.role !== 'REQUESTER') ?? []
  const customers = members.data?.filter((m) => m.role === 'REQUESTER') ?? []

  const person = (m: NonNullable<typeof members.data>[number]) => (
    <li key={m.id} className="flex items-center gap-3 py-2.5">
      <Avatar name={m.full_name} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{m.full_name}</p>
        <p className="truncate text-xs text-ink-3">{isDemo ? (m.company ?? META[m.role].label) : m.email}</p>
      </div>
      <RoleChip role={m.role} />
    </li>
  )

  return (
    <SettingsSection id="team" icon={Users} title="Team & roles" description="Who can do what in this workspace. Roles decide what people can see and change.">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-ink">What each role can do</h3>
        <dl className="divide-y divide-line">
          {ROLES.map((r) => (
            <div key={r.role} className="grid items-start gap-x-6 gap-y-1 py-2.5 sm:grid-cols-[8rem_1fr]">
              <dt>
                <RoleChip role={r.role} />
              </dt>
              <dd className="text-[13px] leading-5 text-ink-2">{r.can}</dd>
            </div>
          ))}
        </dl>
      </div>

      {members.isLoading ? (
        <SkeletonRows rows={3} />
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-ink">
              Support team <span className="ml-1 font-normal text-ink-3">{staff.length}</span>
            </h3>
            <ul className="mt-1 divide-y divide-line">{staff.map(person)}</ul>
          </div>
          {customers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-ink">
                Customers <span className="ml-1 font-normal text-ink-3">{customers.length}</span>
              </h3>
              <ul className="mt-1 divide-y divide-line">{customers.slice(0, 6).map(person)}</ul>
              {customers.length > 6 && <p className="mt-2 text-xs text-ink-3">and {customers.length - 6} more</p>}
            </div>
          )}
        </div>
      )}

      {!readOnly && (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <UserPlus className="size-4 text-violet" aria-hidden /> Invite a teammate
          </h3>
          <p className="mt-0.5 mb-4 text-[13px] text-ink-2">{isDemo ? 'Invites are switched off in demo workspaces. Create your own workspace to try them.' : 'We create a private link. Share it with them and they choose their own password.'}</p>
          <form
            className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault()
              if (!isDemo && email.trim() && !invite.isPending) invite.mutate()
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="inv-email">Email</Label>
              <Input id="inv-email" type="email" value={email} disabled={isDemo} placeholder="teammate@company.com" onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-role">Role</Label>
              <Select value={role} onValueChange={setRole} disabled={isDemo}>
                <SelectTrigger id="inv-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AGENT">Agent</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isDemo || !email.trim() || invite.isPending}>
              {invite.isPending ? <Loader2 className="animate-spin" /> : <UserPlus />} Create invite
            </Button>
          </form>
          {invites.data && invites.data.length > 0 && (
            <div className="mt-5">
              <p className="mb-1 text-xs font-semibold text-ink-3">Pending invites</p>
              <ul className="divide-y divide-line">
                {invites.data.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="min-w-0 flex-1 truncate text-ink">{i.email}</span>
                    <RoleChip role={i.role} />
                    <Button variant="outline" size="sm" onClick={() => copy(i.token)}>
                      {copied === i.token ? <Check /> : <Copy />} {copied === i.token ? 'Copied' : 'Copy link'}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </SettingsSection>
  )
}
