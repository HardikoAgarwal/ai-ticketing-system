import type { ReactNode } from 'react'

import { Panel, PanelHeader } from '@/components/ds'
import { cn } from '@/lib/utils'

/**
 * A chart in a panel. `summary` is the accessible description of the picture; `table` is the same data as a real table,
 * offered behind a "View as table" disclosure for screen-reader and keyboard users (and anyone who prefers numbers).
 */
export function ChartPanel({ title, description, summary, table, empty, children, className }: {
  title: string
  description: string
  summary: string
  table: { columns: string[]; rows: (string | number)[][] }
  empty?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <Panel as="figure" className={cn('flex flex-col', className)}>
      <PanelHeader title={<figcaption>{title}</figcaption>} description={description} divided={false} className="pb-2" />
      <div className="flex flex-1 flex-col px-5 pb-5">
        {empty ? (
          <div className="flex h-60 flex-1 items-center justify-center rounded-control border border-dashed border-line-strong bg-surface-2 text-sm text-ink-3">No data in this period yet</div>
        ) : (
          <>
            <div role="img" aria-label={summary} className="flex flex-1 flex-col justify-center">
              {children}
            </div>
            <details className="group mt-3">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-chip px-1 text-xs font-medium text-violet select-none hover:underline focus-visible:ring-2 focus-visible:ring-violet/40 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                View as table
              </summary>
              <div className="scroll-quiet mt-2 max-h-56 overflow-auto rounded-control border border-line">
                <table className="w-full text-left text-xs">
                  <caption className="sr-only">{title}</caption>
                  <thead className="sticky top-0 bg-sunken text-ink-2">
                    <tr>
                      {table.columns.map((c) => (
                        <th key={c} scope="col" className="px-3 py-1.5 font-semibold">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-ink">
                    {table.rows.map((r, i) => (
                      <tr key={i}>
                        {r.map((cell, j) => (
                          <td key={j} className="px-3 py-1.5 tabular-nums">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </div>
    </Panel>
  )
}
