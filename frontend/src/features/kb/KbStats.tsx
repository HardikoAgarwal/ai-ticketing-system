import { BookOpen, FileText, Lock, ScanSearch } from 'lucide-react'

import { Stat } from '@/components/ds'
import type { ArticleListItem } from '@/lib/types'

import type { StatusFilter } from './kb-utils'

/** Four tiles that double as filters. Click one to narrow the list, click again to clear. */
export function KbStats({ articles, status, onStatus }: { articles: ArticleListItem[]; status: StatusFilter; onStatus: (s: StatusFilter) => void }) {
  const total = articles.length
  const published = articles.filter((a) => a.is_published).length
  const internal = articles.filter((a) => a.is_internal).length
  const indexed = articles.filter((a) => a.indexed).length
  const pct = total ? Math.round((indexed / total) * 100) : 0
  const toggle = (s: StatusFilter) => onStatus(status === s ? 'all' : s)
  const categories = new Set(articles.map((a) => a.category).filter(Boolean)).size
  return (
    <div role="group" aria-label="Filter articles by state" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat icon={FileText} tone="violet" label="Articles" value={total} hint={`${categories} ${categories === 1 ? 'category' : 'categories'}`} onClick={() => onStatus('all')} active={status === 'all'} />
      <Stat icon={BookOpen} tone="green" label="Published" value={published} hint={total - published ? `${total - published} draft, ignored by AI` : 'All live'} onClick={() => toggle('draft')} active={status === 'draft'} />
      <Stat icon={Lock} tone="amber" label="Internal only" value={internal} hint="Staff guidance, never quoted" onClick={() => toggle('internal')} active={status === 'internal'} />
      <Stat icon={ScanSearch} tone="blue" label="AI-search ready" value={`${pct}%`} hint={total - indexed ? `${total - indexed} still indexing` : 'Everything indexed'} onClick={() => toggle('unindexed')} active={status === 'unindexed'} />
    </div>
  )
}
