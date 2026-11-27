import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'

import { useWorkspace } from '@/auth/workspace'
import { ErrorState, SkeletonRows } from '@/components/ds'
import { PageHeader } from '@/features/shared/PageHeader'
import type { Workspace } from '@/lib/types'
import { cn } from '@/lib/utils'

import { AiSettings } from './AiSettings'
import { AutomationSettings } from './AutomationSettings'
import { CategorySettings } from './CategorySettings'
import { GeneralSettings } from './GeneralSettings'
import { ReadOnlyNote, SaveBar } from './rows'
import { isSettingsKey, SETTINGS_SECTIONS, type SettingsKey } from './sections'
import { SlaSettings } from './SlaSettings'
import { useWorkspaceForm } from './use-workspace-form'

function SettingsBody({ ws, tab, readOnly }: { ws: Workspace; tab: SettingsKey; readOnly: boolean }) {
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
      {tab === 'automation' && <AutomationSettings f={f} readOnly={readOnly} />}
      {tab === 'categories' && <CategorySettings readOnly={readOnly} />}
      {!readOnly && tab !== 'categories' && <SaveBar dirty={f.dirty} saving={f.save.isPending} saved={f.saved} error={f.save.error} disabled={!f.valid} onSave={() => f.save.mutate()} onDiscard={f.discard} />}
    </>
  )
}

/**
 * One Settings tab as its own page. The tabs are listed under "Settings" in the sidebar, so this page is just a header (the tab's title and what
 * it is for) and a short stack of cards.
 */
export function SettingsPage() {
  const { slug, api, manager } = useWorkspace()
  const { section } = useParams()
  const [params] = useSearchParams()
  const ws = useQuery({ queryKey: ['workspace', slug], queryFn: api.workspace })
  const base = `/w/${slug}/agent`

  // `/settings` and old links (`?tab=…`) land on a real tab; the team now has its own page
  if (!section) {
    const old = params.get('tab')
    return <Navigate to={old === 'team' ? `${base}/users` : `${base}/settings/${isSettingsKey(old ?? undefined) ? old : 'general'}`} replace />
  }
  if (section === 'team') return <Navigate to={`${base}/users`} replace />
  if (!isSettingsKey(section)) return <Navigate to={`${base}/settings/general`} replace />

  const meta = SETTINGS_SECTIONS.find((s) => s.key === section)!
  const readOnly = !manager
  return (
    <div className="mx-auto w-full max-w-[1000px] pb-8">
      <PageHeader icon={meta.icon} title={meta.title} description={meta.description} />
      {/* the sidebar lists the tabs on bigger screens; a phone has no sidebar, so the tabs sit here instead */}
      <nav aria-label="Settings tabs" className="scroll-quiet -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden [&::-webkit-scrollbar]:hidden">
        {SETTINGS_SECTIONS.map((s) => (
          <Link key={s.key} to={`${base}/settings/${s.key}`} aria-current={s.key === section ? 'page' : undefined} className={cn('inline-flex h-10 shrink-0 items-center gap-2 rounded-control border px-4 text-sm font-semibold', s.key === section ? 'border-ink bg-ink text-canvas' : 'border-line bg-surface text-ink-2')}>
            <s.icon className="size-4" aria-hidden />
            {s.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6 md:mt-8">
        {readOnly && <ReadOnlyNote />}
        {section === 'categories' ? (
          <CategorySettings readOnly={readOnly} />
        ) : ws.isLoading ? (
          <SkeletonRows rows={4} />
        ) : ws.isError ? (
          <ErrorState error={ws.error} onRetry={() => ws.refetch()} />
        ) : (
          ws.data && <SettingsBody key={ws.data.id} ws={ws.data} tab={section} readOnly={readOnly} />
        )}
      </div>
    </div>
  )
}
