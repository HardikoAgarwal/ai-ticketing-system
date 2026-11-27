import { useQuery } from '@tanstack/react-query'
import { BookOpen, CircleHelp, Plus, Search, Tags, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { useWorkspace } from '@/auth/workspace'
import { useRegisterCommands, type Command } from '@/components/shell/commands'
import { useShortcut } from '@/components/shell/shortcuts'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/features/shared/PageHeader'

import { AiButton } from './AiButton'
import { AiSearchDialog } from './AiSearchDialog'
import { ArticlesView } from './ArticlesView'
import { HowItWorksDialog } from './HowItWorksDialog'
import { ALL_CATEGORIES } from './kb-utils'

/**
 * Knowledge base: everything you can do is in the header (search, category filter, how it works, test AI search, categories, new article),
 * then the visibility tiles, then the article table. How it works and Test AI search open as modals.
 */
export function KnowledgePage() {
  const { slug, api, manager } = useWorkspace()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [how, setHow] = useState(false)
  const [test, setTest] = useState(false)
  const base = `/w/${slug}/agent/knowledge`
  const q = params.get('q') ?? ''
  const cat = params.get('cat') ?? ALL_CATEGORIES
  const categories = useQuery({ queryKey: ['categories', slug], queryFn: api.categories, staleTime: 60_000 })
  const patch = (changes: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(changes)) {
          if (v) next.set(k, v)
          else next.delete(k)
        }
        return next
      },
      { replace: true },
    )

  const commands = useMemo<Command[]>(
    () => [
      { id: 'kb.new', title: 'New knowledge article', group: 'Knowledge', icon: Plus, keywords: ['write', 'create', 'article'], shortcut: 'n', when: manager, perform: () => navigate(`${base}/new`) },
      { id: 'kb.test', title: 'Test what the AI would read', group: 'Knowledge', icon: Search, keywords: ['search', 'retrieval', 'playground'], perform: () => setTest(true) },
      { id: 'kb.how', title: 'How the knowledge base works', group: 'Knowledge', icon: CircleHelp, keywords: ['help', 'explain'], perform: () => setHow(true) },
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
          crowded
          actions={
            <>
              <div className="relative min-w-0 basis-full sm:basis-auto sm:w-56">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => patch({ q: e.target.value || null })}
                  placeholder="Search articles"
                  aria-label="Search articles"
                  className="h-10 w-full rounded-control border border-line-strong bg-surface pr-9 pl-10 text-sm text-ink shadow-card outline-none placeholder:text-ink-3 focus:border-violet focus:ring-2 focus:ring-violet/30 [&::-webkit-search-cancel-button]:hidden"
                />
                {q && (
                  <button type="button" onClick={() => patch({ q: null })} aria-label="Clear search" className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-3 hover:bg-sunken hover:text-ink focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none">
                    <X className="size-3.5" aria-hidden />
                  </button>
                )}
              </div>
              {!!categories.data?.length && (
                <Select value={cat} onValueChange={(v) => patch({ cat: v === ALL_CATEGORIES ? null : v })}>
                  <SelectTrigger aria-label="Filter by category" className="h-10 w-44 border-line-strong bg-surface shadow-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
                    {categories.data.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button variant="outline" className="h-10" onClick={() => setHow(true)}>
                <CircleHelp /> How it works
              </Button>
              <AiButton onClick={() => setTest(true)}>Test AI search</AiButton>
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
      </div>
      <ArticlesView onHow={() => setHow(true)} />
      <HowItWorksDialog open={how} onOpenChange={setHow} />
      <AiSearchDialog open={test} onOpenChange={setTest} />
    </div>
  )
}
