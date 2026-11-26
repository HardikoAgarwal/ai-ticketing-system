import { useQuery } from '@tanstack/react-query'
import { Bot, Clock, Palette, Tags, Users, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useWorkspace } from '@/auth/workspace'
import { ErrorState, SkeletonRows } from '@/components/ds'
import { useRegisterCommands, type Command } from '@/components/shell/commands'
import { PageTitle } from '@/features/shared/PageTitle'
import type { Workspace } from '@/lib/types'
import { cn } from '@/lib/utils'

import { AiSettings } from './AiSettings'
import { CategorySettings } from './CategorySettings'
import { GeneralSettings } from './GeneralSettings'
import { ReadOnlyNote, SaveBar } from './rows'
import { SlaSettings } from './SlaSettings'
import { TeamSettings } from './TeamSettings'
import { useWorkspaceForm } from './use-workspace-form'

const SECTIONS = [
  { key: 'general', label: 'General', hint: 'Name, sign-off, tone', icon: Palette },
  { key: 'ai', label: 'AI assistant', hint: 'What it does, budget', icon: Bot },
  { key: 'sla', label: 'Response targets', hint: 'SLA by priority', icon: Clock },
  { key: 'categories', label: 'Categories', hint: 'How tickets are sorted', icon: Tags },
  { key: 'team', label: 'Team & roles', hint: 'People and permissions', icon: Users },
] as const satisfies readonly { key: string; label: string; hint: string; icon: LucideIcon }[]
type SectionKey = (typeof SECTIONS)[number]['key']

function SettingsBody({ ws, tab, readOnly }: { ws: Workspace; tab: SectionKey; readOnly: boolean }) {
  const f = useWorkspaceForm(ws)
  useEffect(() => {
    if (!f.dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [f.dirty])
  return (
    <>
      {tab === 'general' && <GeneralSettings f={f} readOnly={readOnly} />}
      {tab === 'ai' && <AiSettings f={f} readOnly={readOnly} />}
      {tab === 'sla' && <SlaSettings f={f} readOnly={readOnly} />}
      {tab === 'categories' && <CategorySettings readOnly={readOnly} />}
      {tab === 'team' && <TeamSettings readOnly={readOnly} />}
      {!readOnly && <SaveBar dirty={f.dirty} saving={f.save.isPending} saved={f.saved} error={f.save.error} disabled={!f.valid} onSave={() => f.save.mutate()} onDiscard={f.discard} />}
    </>
  )
}

/** Settings: a section menu on the left, the chosen section as plain rows on the right. */
export function SettingsPage() {
  const { slug, api, manager } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab')
  const tab: SectionKey = SECTIONS.some((t) => t.key === requested) ? (requested as SectionKey) : 'general'
  const ws = useQuery({ queryKey: ['workspace', slug], queryFn: api.workspace })
  const readOnly = !manager
  const go = (key: SectionKey) => setParams({ tab: key }, { replace: true })

  const commands = useMemo<Command[]>(
    () => SECTIONS.map((s) => ({ id: `settings.${s.key}`, title: `Settings: ${s.label}`, group: 'Settings', icon: s.icon, keywords: [s.hint, 'preferences', 'configure'], perform: () => go(s.key) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setParams],
  )
  useRegisterCommands(commands)

  return (
    <div className="pb-8">
      <PageTitle title="Settings" description="Tune how this workspace triages, answers and reports on tickets. Every option explains itself." />
      <div className="mt-6 grid gap-8 lg:grid-cols-[14.5rem_minmax(0,1fr)] lg:items-start">
        <nav aria-label="Settings sections" className="scroll-quiet -mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:sticky lg:top-0 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
          {SECTIONS.map(({ key, label, hint, icon: Icon }) => {
            const on = tab === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => go(key)}
                aria-current={on ? 'page' : undefined}
                className={cn('group flex shrink-0 items-center gap-3 rounded-control px-3 py-2.5 text-left transition-colors lg:w-full', on ? 'bg-violet-soft text-ink' : 'text-ink-2 hover:bg-sunken hover:text-ink')}
              >
                <Icon className={cn('size-[18px] shrink-0', on ? 'text-violet' : 'text-ink-3 group-hover:text-ink')} aria-hidden />
                <span className="min-w-0">
                  <span className="block text-sm font-medium whitespace-nowrap">{label}</span>
                  <span className="hidden text-xs leading-tight text-ink-3 lg:block">{hint}</span>
                </span>
              </button>
            )
          })}
        </nav>
        <div className="min-w-0 max-w-4xl">
          {readOnly && <ReadOnlyNote />}
          {ws.isLoading ? <SkeletonRows rows={4} /> : ws.isError ? <ErrorState error={ws.error} onRetry={() => ws.refetch()} /> : ws.data && <SettingsBody key={ws.data.id} ws={ws.data} tab={tab} readOnly={readOnly} />}
        </div>
      </div>
    </div>
  )
}
