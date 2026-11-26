import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * The one table look: a white rounded panel, a tinted header row that sticks to the top while you scroll, hairline row dividers,
 * a soft hover. Real <table> markup, so screen readers get rows, columns and headers. Give each column its width on the <Th>.
 */
export function DataTable({ caption, children, className }: { caption: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-panel bg-surface shadow-card', className)}>
      <table className="w-full table-fixed border-separate border-spacing-0 text-left">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  )
}

export function Th({ className, children, ...rest }: ComponentProps<'th'>) {
  return (
    <th
      scope="col"
      className={cn('sticky top-0 z-10 border-b border-line bg-surface-2 px-4 py-3 text-left text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap text-ink-3 uppercase first:rounded-tl-panel last:rounded-tr-panel', className)}
      {...rest}
    >
      {children}
    </th>
  )
}

export function Td({ className, children, ...rest }: ComponentProps<'td'>) {
  return (
    <td className={cn('border-b border-line px-4 py-4 align-middle', className)} {...rest}>
      {children}
    </td>
  )
}

/** Classes for the <tbody>: no divider under the last row, and its corners follow the panel. */
export const TBODY = '[&>tr:last-child>td]:border-b-0 [&>tr:last-child>td:first-child]:rounded-bl-panel [&>tr:last-child>td:last-child]:rounded-br-panel'
