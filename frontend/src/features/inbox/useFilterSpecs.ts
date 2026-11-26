import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/auth/workspace'
import { PRIORITIES, PRIORITY_META, SLA_META, STATUSES, STATUS_META } from '@/lib/constants'

import type { FilterKey, ViewKey } from './model'

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

/** The filters that matter, with their option lists. Owner is hidden on views that already fix the owner. */
export function useFilterSpecs(view: ViewKey): FilterSpec[] {
  const { slug, api } = useWorkspace()
  const { user } = useAuth()
  const categories = useQuery({ queryKey: ['categories', slug], queryFn: api.categories, staleTime: 60_000 })
  const members = useQuery({ queryKey: ['members', slug, 'staff'], queryFn: () => api.members(true), staleTime: 60_000 })

  return useMemo(() => {
    const specs: FilterSpec[] = [
      { key: 'status', label: 'Status', multi: true, options: STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label })) },
      { key: 'priority', label: 'Priority', multi: true, options: PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label })) },
      { key: 'category', label: 'Category', multi: true, options: (categories.data ?? []).map((c) => ({ value: c.key, label: c.name })) },
      { key: 'sla', label: 'Response time', options: [{ value: 'overdue', label: SLA_META.overdue.label }, { value: 'at_risk', label: SLA_META.at_risk.label }] },
    ]
    if (view === 'attention' || view === 'all') {
      specs.push({
        key: 'assigned',
        label: 'Owner',
        options: [
          { value: 'me', label: 'Me' },
          { value: 'unassigned', label: 'Unassigned' },
          ...(members.data ?? []).filter((m) => m.id !== user?.id).map((m) => ({ value: String(m.id), label: m.full_name })),
        ],
      })
    }
    return specs.filter((s) => s.options.length > 0)
  }, [categories.data, members.data, user?.id, view])
}
