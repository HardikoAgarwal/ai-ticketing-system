import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useWorkspace } from '@/auth/workspace'
import { PRIORITIES, PRIORITY_META, STATUSES, STATUS_META } from '@/lib/constants'

import type { FilterKey } from './model'

export interface FilterOption {
  value: string
  label: string
}
export interface FilterSpec {
  key: FilterKey
  label: string
  /** Comma-separated multi value in the URL when true. */
  multi?: boolean
  options: FilterOption[]
}

/**
 * The filters offered in the popup: status (Open or In progress; finished tickets live in History), priority and category. Overdue and owner (me / unassigned) are left out on purpose,
 * because the tiles at the top of the page already set them.
 */
export function useFilterSpecs(): FilterSpec[] {
  const { slug, api } = useWorkspace()
  const categories = useQuery({ queryKey: ['categories', slug], queryFn: api.categories, staleTime: 60_000 })

  return useMemo(() => {
    const specs: FilterSpec[] = [
      { key: 'status', label: 'Status', multi: true, options: STATUSES.filter((s) => s === 'OPEN' || s === 'IN_PROGRESS').map((s) => ({ value: s, label: STATUS_META[s].label })) },
      { key: 'priority', label: 'Priority', multi: true, options: PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label })) },
      { key: 'category', label: 'Category', multi: true, options: (categories.data ?? []).map((c) => ({ value: c.key, label: c.name })) },
    ]
    return specs.filter((s) => s.options.length > 0)
  }, [categories.data])
}
