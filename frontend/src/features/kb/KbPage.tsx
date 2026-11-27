import { BookOpen, FlaskConical, Library, Plus, Tags } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { useWorkspace } from '@/auth/workspace'
import { SegmentedControl } from '@/components/ds'
import { useRegisterCommands, type Command } from '@/components/shell/commands'
import { useShortcut } from '@/components/shell/shortcuts'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/features/shared/PageHeader'

import { ArticlesView } from './ArticlesView'
import { KbPlayground } from './KbPlayground'

type Tab = 'articles' | 'test'

/** Knowledge base: two tabs under one header. Articles is the library; Test AI search shows what the AI would read for a customer question. */
export function KnowledgePage() {
  const { slug, manager } = useWorkspace()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'test' ? 'test' : 'articles'
  const base = `/w/${slug}/agent/knowledge`
  const go = (t: Tab) => setParams(t === 'test' ? { tab: 'test' } : {}, { replace: true })

  const commands = useMemo<Command[]>(
    () => [
      { id: 'kb.new', title: 'New knowledge article', group: 'Knowledge', icon: Plus, keywords: ['write', 'create', 'article'], shortcut: 'n', when: manager, perform: () => navigate(`${base}/new`) },
      { id: 'kb.test', title: 'Test what the AI would read', group: 'Knowledge', icon: FlaskConical, keywords: ['search', 'retrieval', 'playground'], perform: () => navigate(`${base}?tab=test`) },
    ],
    [manager, navigate, base],
  )
  useRegisterCommands(commands)
  useShortcut('n', () => navigate(`${base}/new`), { description: 'New article', group: 'Knowledge', enabled: manager })

  return (
    <div className="mx-auto w-full max-w-[1400px] pb-8">
      <div className="space-y-8 pb-8">
        <PageHeader
          icon={BookOpen}
          title="Knowledge base"
          description="The articles behind every AI draft and every suggestion customers see."
          actions={
            <>
              {manager && (
                <Button variant="outline" asChild className="h-10">
                  <Link to={`/w/${slug}/agent/settings?tab=categories`}>
                    <Tags /> Categories
                  </Link>
                </Button>
              )}
              {manager && (
                <Button asChild className="h-10">
                  <Link to={`${base}/new`}>
                    <Plus /> New article
                  </Link>
                </Button>
              )}
            </>
          }
        />
        <SegmentedControl<Tab>
          ariaLabel="Knowledge base sections"
          value={tab}
          onChange={go}
          options={[
            { value: 'articles', label: 'Articles', icon: Library },
            { value: 'test', label: 'Test AI search', icon: FlaskConical },
          ]}
        />
      </div>
      {tab === 'articles' ? <ArticlesView /> : <div className="max-w-3xl"><KbPlayground /></div>}
    </div>
  )
}
