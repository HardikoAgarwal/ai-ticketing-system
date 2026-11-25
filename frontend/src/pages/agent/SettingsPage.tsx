import { useQuery } from '@tanstack/react-query'
import { Bot, Clock, Palette, Tags, Users } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { useWorkspace } from '@/auth/workspace'
import { PageHeader } from '@/components/common'
import { CategoriesSection } from '@/components/dashboard/settings-categories'
import { ReadOnlyBanner, SaveBar } from '@/components/dashboard/settings-shared'
import { TeamSection } from '@/components/dashboard/settings-team'
import { useWorkspaceForm } from '@/components/dashboard/settings-form'
import { AiSection, GeneralSection, SlaSection } from '@/components/dashboard/settings-workspace'
import { ErrorState, ListSkeleton } from '@/components/states'
import type { Workspace } from '@/lib/types'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'general', label: 'General', hint: 'Name, sign-off, tone', icon: Palette },
  { key: 'ai', label: 'AI assistant', hint: 'What it does, budget', icon: Bot },
  { key: 'sla', label: 'Response targets', hint: 'SLA by priority', icon: Clock },
  { key: 'categories', label: 'Categories', hint: 'How tickets are sorted', icon: Tags },
  { key: 'team', label: 'Team & roles', hint: 'People and permissions', icon: Users },
] as const
type TabKey = (typeof TABS)[number]['key']

function SettingsBody({ ws, tab, readOnly }: { ws: Workspace; tab: TabKey; readOnly: boolean }) {
  const f = useWorkspaceForm(ws)
  return (
    <>
      {tab === 'general' && <GeneralSection f={f} readOnly={readOnly} />}
      {tab === 'ai' && <AiSection f={f} readOnly={readOnly} />}
      {tab === 'sla' && <SlaSection f={f} readOnly={readOnly} />}
      {tab === 'categories' && <CategoriesSection readOnly={readOnly} />}
      {tab === 'team' && <TeamSection readOnly={readOnly} />}
      <SaveBar visible={!readOnly && f.dirty} saving={f.save.isPending} disabled={!f.valid} onSave={() => f.save.mutate()} onDiscard={f.discard} />
    </>
  )
}

export function SettingsPage() {
  const { slug, api, manager } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab') as TabKey | null
  const tab: TabKey = TABS.some((t) => t.key === requested) ? (requested as TabKey) : 'general'
  const ws = useQuery({ queryKey: ['workspace', slug], queryFn: api.workspace })
  const readOnly = !manager
  const go = (key: TabKey) => setParams({ tab: key }, { replace: true })

  return (
    <div className="mx-auto max-w-6xl pb-24">
      <PageHeader title="Settings" description="Tune how this workspace triages, answers and reports on tickets. Every option explains itself." />
      {readOnly && <ReadOnlyBanner />}
      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
        <nav aria-label="Settings sections" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:sticky lg:top-6 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
          {TABS.map(({ key, label, hint, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => go(key)}
              aria-current={tab === key ? 'page' : undefined}
              className={cn('group flex shrink-0 items-center gap-3 rounded-lg px-3.5 py-2.5 text-left transition-colors lg:w-full', tab === key ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground')}
            >
              <Icon className={cn('size-[18px] shrink-0', tab === key ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
              <span className="min-w-0">
                <span className="block text-sm font-medium whitespace-nowrap">{label}</span>
                <span className="hidden text-[11px] leading-tight opacity-70 lg:block">{hint}</span>
              </span>
            </button>
          ))}
        </nav>
        <div className="min-w-0 max-w-3xl lg:border-l lg:pl-10">
          {ws.isLoading ? <ListSkeleton rows={4} /> : ws.isError ? <ErrorState error={ws.error} onRetry={() => ws.refetch()} /> : ws.data && <SettingsBody key={ws.data.id} ws={ws.data} tab={tab} readOnly={readOnly} />}
        </div>
      </div>
    </div>
  )
}
