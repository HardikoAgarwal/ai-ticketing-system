import { Link, useNavigate } from 'react-router-dom'

import { RelativeTime } from '@/components/common'
import { DataTable, ROW, SolidChip, TBODY, Td, Th } from '@/components/ds'
import { categoryHue } from '@/features/inbox/model'
import { StatusPill } from '@/features/inbox/StatusPill'
import type { ArticleListItem } from '@/lib/types'

import { visibilityOf } from './kb-utils'
import { VisibilityBadge } from './VisibilityBadge'

const aiStatus = (a: ArticleListItem) =>
  a.is_published ? <StatusPill hue={a.indexed ? 'mint' : 'butter'}>{a.indexed ? 'AI ready' : 'Indexing'}</StatusPill> : <span className="text-sm text-ink-3">Not used</span>

function Category({ a }: { a: ArticleListItem }) {
  return a.category_name ? (
    <SolidChip hue={categoryHue(a.category_name)} size="sm" className="max-w-full truncate">
      {a.category_name}
    </SolidChip>
  ) : (
    <span className="text-ink-3">—</span>
  )
}

function Row({ article: a, to }: { article: ArticleListItem; to: string }) {
  const navigate = useNavigate()
  return (
    <tr
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('a,button')) navigate(to)
      }}
      className={`group ${ROW}`}
    >
      <Td>
        <Link to={to} className="block truncate rounded-sm text-[15px] font-semibold text-ink outline-none focus-visible:ring-2 focus-visible:ring-violet">
          {a.title}
        </Link>
        <span className="mt-1 block truncate text-[13px] text-ink-2">{a.excerpt}</span>
      </Td>
      <Td className="hidden w-44 xl:table-cell">
        <Category a={a} />
      </Td>
      <Td className="w-36">
        <VisibilityBadge value={visibilityOf(a)} />
      </Td>
      <Td className="w-36">{aiStatus(a)}</Td>
      <Td className="w-40 text-right text-sm whitespace-nowrap text-ink-2">
        <RelativeTime value={a.updated_at} />
      </Td>
    </tr>
  )
}

/** The article library as a real table: title with a one-line excerpt, category, visibility, whether the AI can search it yet, and when it changed. */
export function ArticleTable({ articles, basePath }: { articles: ArticleListItem[]; basePath: string }) {
  return (
    <>
      <div className="hidden lg:block">
        <DataTable caption="Knowledge base articles">
          <thead>
            <tr>
              <Th>Article</Th>
              <Th className="hidden w-44 xl:table-cell">Category</Th>
              <Th className="w-36">Visibility</Th>
              <Th className="w-36">AI search</Th>
              <Th className="w-40 text-right">Updated</Th>
            </tr>
          </thead>
          <tbody className={TBODY}>
            {articles.map((a) => (
              <Row key={a.id} article={a} to={`${basePath}/${a.id}`} />
            ))}
          </tbody>
        </DataTable>
      </div>
      <ul aria-label="Knowledge base articles" className="space-y-3 lg:hidden">
        {articles.map((a) => (
          <li key={a.id} className="rounded-panel bg-surface shadow-card">
            <Link to={`${basePath}/${a.id}`} className="block rounded-panel px-4 py-4 outline-none focus-visible:ring-2 focus-visible:ring-violet">
              <span className="block text-[15px] font-semibold text-ink">{a.title}</span>
              <span className="mt-1 line-clamp-2 block text-[13px] leading-5 text-ink-2">{a.excerpt}</span>
              <span className="mt-3 flex flex-wrap items-center gap-2">
                <VisibilityBadge value={visibilityOf(a)} />
                {aiStatus(a)}
                <span className="ml-auto text-xs text-ink-3">
                  <RelativeTime value={a.updated_at} />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
