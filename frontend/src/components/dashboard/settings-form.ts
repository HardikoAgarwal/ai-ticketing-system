import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { errorMessage } from '@/lib/api'
import type { TicketPriority, Workspace } from '@/lib/types'

export interface WorkspaceForm {
  name: string
  tagline: string
  agent_title: string
  tone: string
  ai_enabled: boolean
  sla_hours: Record<TicketPriority, number>
}

const fromWorkspace = (ws: Workspace): WorkspaceForm => ({
  name: ws.name,
  tagline: ws.tagline,
  agent_title: ws.agent_title,
  tone: ws.tone,
  ai_enabled: ws.ai_enabled,
  sla_hours: { ...ws.sla_hours },
})

/** Shared form state for the General, AI and SLA sections so one save bar covers all three. */
export function useWorkspaceForm(ws: Workspace) {
  const { slug, api } = useWorkspace()
  const queryClient = useQueryClient()
  const server = useMemo(() => fromWorkspace(ws), [ws])
  const [edits, setEdits] = useState<Partial<WorkspaceForm>>({})
  const form: WorkspaceForm = { ...server, ...edits }
  const dirty = (Object.keys(edits) as (keyof WorkspaceForm)[]).some((k) => JSON.stringify(edits[k]) !== JSON.stringify(server[k]))
  const set = useCallback(<K extends keyof WorkspaceForm>(key: K, value: WorkspaceForm[K]) => setEdits((e) => ({ ...e, [key]: value })), [])
  const save = useMutation({
    mutationFn: () => api.updateWorkspace(form),
    onSuccess: () => {
      toast.success('Settings saved')
      setEdits({})
      queryClient.invalidateQueries({ queryKey: ['workspace', slug] })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
  return { form, set, dirty, save, discard: () => setEdits({}), valid: form.name.trim().length > 0 && form.agent_title.trim().length > 0 }
}
export type WorkspaceFormApi = ReturnType<typeof useWorkspaceForm>
