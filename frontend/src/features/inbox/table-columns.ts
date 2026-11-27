export interface SkeletonColumn {
  label: string
  /** What the real cell holds, so the placeholder has the same shape. */
  kind: 'select' | 'two-lines' | 'chip' | 'person' | 'short'
  className?: string
}

export const TICKET_COLUMNS: SkeletonColumn[] = [
  { label: 'Select', kind: 'select', className: 'w-12' },
  { label: 'Ticket', kind: 'two-lines' },
  { label: 'Priority', kind: 'chip', className: 'w-28' },
  { label: 'Customer', kind: 'person', className: 'w-44' },
  { label: 'Category', kind: 'chip', className: 'hidden w-44 xl:table-cell' },
  { label: 'Owner', kind: 'person', className: 'hidden w-36 xl:table-cell' },
  { label: 'Updated', kind: 'short', className: 'w-40' },
]

export const HISTORY_COLUMNS: SkeletonColumn[] = [
  { label: 'Ticket', kind: 'two-lines' },
  { label: 'Customer', kind: 'person', className: 'w-44' },
  { label: 'Category', kind: 'chip', className: 'hidden w-44 xl:table-cell' },
  { label: 'Finished', kind: 'two-lines', className: 'w-32' },
  { label: 'Took', kind: 'short', className: 'hidden w-24 xl:table-cell' },
  { label: 'Rating', kind: 'short', className: 'w-36' },
]

export const ARTICLE_COLUMNS: SkeletonColumn[] = [
  { label: 'Article', kind: 'two-lines' },
  { label: 'Category', kind: 'chip', className: 'hidden w-44 xl:table-cell' },
  { label: 'Visibility', kind: 'chip', className: 'w-36' },
  { label: 'AI search', kind: 'chip', className: 'w-36' },
  { label: 'Updated', kind: 'short', className: 'w-40' },
]
