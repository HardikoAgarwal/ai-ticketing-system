import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Crown, Headphones, Loader2, Shield, UserRound, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { ListSkeleton } from '@/components/states'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { errorMessage } from '@/lib/api'
import { initials } from '@/lib/format'
import type { Role } from '@/lib/types'
import { cn } from '@/lib/utils'

import { Field, Section } from './settings-shared'

const ROLES: { role: Role; label: string; icon: typeof Crown; pill: string; can: string[] }[] = [
  { role: 'OWNER', label: 'Owner', icon: Crown, pill: 'bg-violet-50 text-violet-700 ring-violet-600/20', can: ['Everything an admin can do', 'Created the workspace'] },
  { role: 'ADMIN', label: 'Admin', icon: Shield, pill: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20', can: ['Change settings, SLA and categories', 'Manage the knowledge base', 'Invite teammates', 'Work tickets'] },
  { role: 'AGENT', label: 'Agent', icon: Headphones, pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', can: ['Work the queue and reply', 'Add internal notes', 'Read settings and articles'] },
  { role: 'REQUESTER', label: 'Customer', icon: UserRound, pill: 'bg-slate-100 text-slate-700 ring-slate-500/20', can: ['Raise and follow own tickets', 'See help article suggestions', 'Never sees notes or triage'] },
]
const META = Object.fromEntries(ROLES.map((r) => [r.role, r])) as Record<Role, (typeof ROLES)[number]>

export function RoleBadge({ role }: { role: Role }) {
  const m = META[role]
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', m.pill)}>
      <m.icon className="size-3" /> {m.label}
    </span>
  )
}

export function TeamSection({ readOnly }: { readOnly: boolean }) {
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
    await navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`)
    setCopied(token)
    setTimeout(() => setCopied(null), 1600)
  }
  const staff = members.data?.filter((m) => m.role !== 'REQUESTER') ?? []
  const customers = members.data?.filter((m) => m.role === 'REQUESTER') ?? []

  const Person = ({ m }: { m: NonNullable<typeof members.data>[number] }) => (
    <li className="flex items-center gap-3 rounded-xl border p-3">
      <Avatar className="size-9">
        <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">{initials(m.full_name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{m.full_name}</p>
        <p className="truncate text-xs text-muted-foreground">{isDemo ? (m.company ?? META[m.role].label) : m.email}</p>
      </div>
      <RoleBadge role={m.role} />
    </li>
  )

  return (
    <Section id="team" icon={Users} title="Team & roles" description="Who can do what in this workspace. Roles decide what people can see and change.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ROLES.map(({ role: r, label, icon: Icon, pill, can }) => (
          <div key={r} className="rounded-xl border p-4">
            <span className={cn('mb-2.5 inline-flex size-8 items-center justify-center rounded-lg ring-1 ring-inset', pill)}>
              <Icon className="size-4" />
            </span>
            <p className="text-sm font-semibold">{label}</p>
            <ul className="mt-1.5 space-y-1">
              {can.map((c) => (
                <li key={c} className="flex gap-1.5 text-xs leading-snug text-muted-foreground">
                  <Check className="mt-0.5 size-3 shrink-0 text-primary" /> {c}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {members.isLoading ? (
        <ListSkeleton rows={4} />
      ) : (
        <div className="space-y-5">
          <div>
            <h3 className="mb-2 text-sm font-semibold">
              Support team <span className="ml-1 font-normal text-muted-foreground">{staff.length}</span>
            </h3>
            <ul className="grid gap-2.5 md:grid-cols-2">{staff.map((m) => <Person key={m.id} m={m} />)}</ul>
          </div>
          {customers.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">
                Customers <span className="ml-1 font-normal text-muted-foreground">{customers.length}</span>
              </h3>
              <ul className="grid gap-2.5 md:grid-cols-2">{customers.slice(0, 8).map((m) => <Person key={m.id} m={m} />)}</ul>
              {customers.length > 8 && <p className="mt-2 text-xs text-muted-foreground">and {customers.length - 8} more</p>}
            </div>
          )}
        </div>
      )}

      {!readOnly && (
        <div className="rounded-xl border bg-muted/20 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <UserPlus className="size-4 text-primary" /> Invite a teammate
          </h3>
          <p className="mt-0.5 mb-4 text-xs text-muted-foreground">
            {isDemo ? 'Invites are switched off in demo workspaces. Create your own workspace to try them.' : 'We create a private link. Share it with them and they choose their own password.'}
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
            <Field label="Email" htmlFor="inv-email">
              <Input id="inv-email" type="email" value={email} disabled={isDemo} placeholder="teammate@company.com" onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Role">
              <Select value={role} onValueChange={setRole} disabled={isDemo}>
                <SelectTrigger aria-label="Role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AGENT">Agent</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Button onClick={() => invite.mutate()} disabled={isDemo || !email.trim() || invite.isPending}>
              {invite.isPending ? <Loader2 className="animate-spin" /> : <UserPlus />} Create invite
            </Button>
          </div>
          {invites.data && invites.data.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Pending invites</p>
              <ul className="space-y-2">
                {invites.data.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm">
                    <span className="min-w-0 flex-1 truncate">{i.email}</span>
                    <RoleBadge role={i.role} />
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
    </Section>
  )
}
