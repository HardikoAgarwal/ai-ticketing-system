import { DataTable, TBODY, Td, Th } from '@/components/ds'
import { cn } from '@/lib/utils'

import type { SkeletonColumn } from './table-columns'

const BLOCK = 'sk rounded-md bg-sunken'

/** The table with its real header and a few shimmering rows, shown while a list loads. */
export function TableSkeleton({ columns, rows = 7, caption }: { columns: SkeletonColumn[]; rows?: number; caption: string }) {
  return (
    <div role="status" aria-label={caption}>
      <DataTable caption={caption}>
        <thead>
          <tr>
            {columns.map((c) => (
              <Th key={c.label} className={c.className}>
                {c.kind === 'select' ? <span className="sr-only">Select</span> : c.label}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody className={TBODY} aria-hidden>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {columns.map((c) => (
                <Td key={c.label} className={c.className}>
                  {c.kind === 'select' && <div className="sk size-6 rounded-full bg-sunken" />}
                  {c.kind === 'two-lines' && (
                    <div className="space-y-2">
                      <div className={cn(BLOCK, 'h-4', r % 2 ? 'w-3/5' : 'w-4/5')} />
                      <div className={cn(BLOCK, 'h-3 w-2/5')} />
                    </div>
                  )}
                  {c.kind === 'chip' && <div className="sk h-6 w-24 rounded-chip bg-sunken" />}
                  {c.kind === 'person' && (
                    <div className="flex items-center gap-2">
                      <div className="sk size-6 rounded-md bg-sunken" />
                      <div className={cn(BLOCK, 'h-3.5 w-20')} />
                    </div>
                  )}
                  {c.kind === 'short' && <div className={cn(BLOCK, 'h-3.5 w-14')} />}
                </Td>
              ))}
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  )
}
