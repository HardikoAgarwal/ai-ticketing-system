import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Loader2, Plus, Trash2, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { PageHeader } from '@/components/common'
import { ConfirmDialog, type ConfirmOptions } from '@/components/ConfirmDialog'
import { ErrorState, ListSkeleton } from '@/components/states'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { errorMessage } from '@/lib/api'
import { PRIORITIES, PRIORITY_META } from '@/lib/constants'
import { initials } from '@/lib/format'
import type { Category, TicketPriority, Workspace } from '@/lib/types'
import { useSearchParams } from 'react-router-dom'

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card shadow-xs">
      <header className="border-b px-5 py-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

function GeneralTab({ ws }: { ws: Workspace }) {
  const { slug, api, isDemo } = useWorkspace()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ name: ws.name, tagline: ws.tagline, agent_title: ws.agent_title, tone: ws.tone, ai_enabled: ws.ai_enabled })
  const [sla, setSla] = useState<Record<TicketPriority, number>>(ws.sla_hours)
  useEffect(() => {
    setForm({ name: ws.name, tagline: ws.tagline, agent_title: ws.agent_title, tone: ws.tone, ai_enabled: ws.ai_enabled })
    setSla(ws.sla_hours)
  }, [ws])

  const save = useMutation({
    mutationFn: () => api.updateWorkspace({ ...form, sla_hours: sla }),
    onSuccess: () => {
      toast.success('Settings saved')
      queryClient.invalidateQueries({ queryKey: ['workspace', slug] })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  return (
    <div className="space-y-5">
      <Card title="Workspace" description="How your team and replies are presented.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ws-name">Name</Label>
            <Input id="ws-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ws-title">Reply sign-off</Label>
            <Input id="ws-title" value={form.agent_title} onChange={(e) => setForm({ ...form, agent_title: e.target.value })} maxLength={80} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ws-tag">Tagline</Label>
            <Input id="ws-tag" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} maxLength={200} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ws-tone">Tone of voice (guides AI drafts)</Label>
            <Textarea id="ws-tone" rows={4} value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} />
          </div>
        </div>
      </Card>

      <Card title="AI assistance" description="Triage, summaries and grounded drafts. Turn off to use rule-based triage only.">
        <label className="flex items-center justify-between gap-4 text-sm">
          <span>
            <span className="font-medium">AI enabled</span>
            {isDemo && <span className="block text-xs text-muted-foreground">Live calls share a small free daily budget across all demo visitors.</span>}
          </span>
          <Switch checked={form.ai_enabled} onCheckedChange={(v) => setForm({ ...form, ai_enabled: v })} aria-label="AI enabled" />
        </label>
      </Card>

      <Card title="First-response SLA" description="Target hours to first reply, by priority. Changing a target recalculates deadlines on new and re-prioritised tickets.">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {PRIORITIES.map((p) => (
            <div key={p} className="space-y-1.5">
              <Label htmlFor={`sla-${p}`} className="flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${PRIORITY_META[p].dot}`} /> {PRIORITY_META[p].label}
              </Label>
              <div className="flex items-center gap-2">
                <Input id={`sla-${p}`} type="number" min={1} value={sla[p]} onChange={(e) => setSla({ ...sla, [p]: Math.max(1, Number(e.target.value) || 1) })} />
                <span className="text-xs text-muted-foreground">h</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name.trim()}>
          {save.isPending && <Loader2 className="animate-spin" />} Save changes
        </Button>
      </div>
    </div>
  )
}

function CategoriesTab() {
  const { slug, api } = useWorkspace()
  const queryClient = useQueryClient()
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [keywords, setKeywords] = useState('')
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['categories', slug], queryFn: api.categories })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['categories', slug] })

  const create = useMutation({
    mutationFn: () => {
      const kw = Object.fromEntries(keywords.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean).map((k) => [k, 2]))
      const key = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      return api.createCategory({ key, name: name.trim(), description, keywords: kw })
    },
    onSuccess: () => {
      setName('')
      setDescription('')
      setKeywords('')
      invalidate()
      toast.success('Category added')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
  const remove = useMutation({
    mutationFn: (c: Category) => api.deleteCategory(c.id),
    onSuccess: invalidate,
    onError: (err) => toast.error(errorMessage(err)),
  })

  return (
    <div className="space-y-5">
      <Card title="Categories" description="The AI chooses among these when triaging. Keywords power the rule-based fallback if AI is unavailable.">
        {isLoading ? (
          <ListSkeleton rows={4} />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : (
          <ul className="divide-y rounded-xl border">
            {data?.map((c) => (
              <li key={c.id} className="flex items-start gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {c.name} {c.is_default && <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Default</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{c.description || 'No description'}</p>
                  {Object.keys(c.keywords).length > 0 && <p className="mt-1 truncate text-[11px] text-muted-foreground">Keywords: {Object.keys(c.keywords).join(', ')}</p>}
                </div>
                {!c.is_default && (
                  <Button variant="ghost" size="icon-sm" aria-label={`Delete ${c.name}`} onClick={() => setConfirm({ title: 'Delete category?', description: 'Tickets in this category become uncategorised.', confirmLabel: 'Delete', destructive: true, onConfirm: () => remove.mutate(c) })}>
                    <Trash2 />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Add a category">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Name</Label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Shipping & Delivery" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-kw">Fallback keywords (comma separated)</Label>
            <Input id="c-kw" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="shipping, delivery, tracking" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="c-desc">Description (shown to the AI)</Label>
            <Input id="c-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Late, lost or damaged deliveries and tracking questions." />
          </div>
        </div>
        <Button className="mt-4" onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>
          {create.isPending ? <Loader2 className="animate-spin" /> : <Plus />} Add category
        </Button>
      </Card>
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}

function TeamTab() {
  const { slug, api, manager, isDemo } = useWorkspace()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('AGENT')
  const [copied, setCopied] = useState<string | null>(null)
  const members = useQuery({ queryKey: ['members', slug, 'all'], queryFn: () => api.members(false) })
  const invites = useQuery({ queryKey: ['invites', slug], queryFn: api.invites, enabled: manager })
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
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="space-y-5">
      <Card title="Team" description="Staff and customers in this workspace.">
        {members.isLoading ? (
          <ListSkeleton rows={4} />
        ) : (
          <ul className="divide-y rounded-xl border">
            {members.data?.map((m) => (
              <li key={m.id} className="flex items-center gap-3 p-3">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-accent text-[11px] font-semibold text-accent-foreground">{initials(m.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{isDemo ? m.role.toLowerCase() : m.email}</p>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">{m.role === 'REQUESTER' ? 'customer' : m.role.toLowerCase()}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {manager && (
        <Card title="Invite a teammate" description={isDemo ? 'Invites are disabled in demo workspaces. Create your own workspace to try them.' : 'Share the generated link; they set their own password.'}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" aria-label="Email" disabled={isDemo} className="flex-1" />
            <Select value={role} onValueChange={setRole} disabled={isDemo}>
              <SelectTrigger className="sm:w-36" aria-label="Role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AGENT">Agent</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => invite.mutate()} disabled={isDemo || !email.trim() || invite.isPending}>
              {invite.isPending ? <Loader2 className="animate-spin" /> : <UserPlus />} Invite
            </Button>
          </div>
          {invites.data && invites.data.length > 0 && (
            <ul className="mt-4 divide-y rounded-xl border">
              {invites.data.map((i) => (
                <li key={i.id} className="flex items-center gap-3 p-3 text-sm">
                  <span className="min-w-0 flex-1 truncate">{i.email}</span>
                  <span className="text-xs text-muted-foreground capitalize">{i.role.toLowerCase()}</span>
                  <Button variant="outline" size="sm" onClick={() => copy(i.token)}>
                    {copied === i.token ? <Check /> : <Copy />} {copied === i.token ? 'Copied' : 'Copy link'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  )
}

export function SettingsPage() {
  const { slug, api, manager } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const tab = manager ? (params.get('tab') ?? 'general') : 'team'
  const ws = useQuery({ queryKey: ['workspace', slug], queryFn: api.workspace, enabled: manager })

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={manager ? 'Settings' : 'Team'} description={manager ? 'Configure how this workspace triages and answers tickets.' : 'People in this workspace.'} />
      {manager && (
        <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })} className="mb-5">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
      {tab === 'general' && manager ? (
        ws.isLoading ? <ListSkeleton rows={4} /> : ws.isError ? <ErrorState error={ws.error} onRetry={() => ws.refetch()} /> : ws.data && <GeneralTab ws={ws.data} />
      ) : tab === 'categories' ? (
        <CategoriesTab />
      ) : (
        <TeamTab />
      )}
    </div>
  )
}
