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
      className={cn('sticky top-0 z-10 border-b border-line-strong bg-sunken px-4 py-3.5 text-left text-xs font-semibold tracking-[0.06em] whitespace-nowrap text-ink-2 uppercase first:rounded-tl-panel first:pl-6 last:rounded-tr-panel last:pl-8 last:pr-8', className)}
      {...rest}
    >
      {children}
    </th>
  )
}

export function Td({ className, children, ...rest }: ComponentProps<'td'>) {
  return (
    <td className={cn('border-b border-line px-4 py-4 align-middle first:pl-6 last:pl-8 last:pr-8', className)} {...rest}>
      {children}
    </td>
  )
}

/**
 * A row you can click. Even rows carry a faint grey so a long line is easy to follow across the table; the hover and selected tints
 * are stronger (and marked important) so they always win over the striping.
 */
export const ROW = 'cursor-pointer transition-colors even:bg-[color-mix(in_srgb,var(--ink)_3.5%,var(--surface))] hover:bg-[color-mix(in_srgb,var(--violet)_11%,var(--surface))]!'
export const ROW_SELECTED = 'bg-[color-mix(in_srgb,var(--violet)_17%,var(--surface))]!'

/** Classes for the <tbody>: no divider under the last row, and its corners follow the panel. */
export const TBODY = '[&>tr:last-child>td]:border-b-0 [&>tr:last-child>td:first-child]:rounded-bl-panel [&>tr:last-child>td:last-child]:rounded-br-panel'
