import { useParams } from 'react-router-dom'

import { useWorkspace } from '@/auth/workspace'
import { useShellBleed } from '@/components/shell/shell-context'
import { cn } from '@/lib/utils'

import { TicketView } from './TicketView'

/** Full-width ticket page at /w/:slug/agent/tickets/:id. Takes over the whole content area and scrolls its own panes. */
export function TicketPage() {
  const { id = '' } = useParams()
  const { isDemo } = useWorkspace()
  useShellBleed()
  // In demo workspaces the floating demo pill sits bottom-right; keep the composer clear of it. With the side panel open (wide screens) the composer ends before the pill, so no gap is needed.
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', isDemo && 'max-[1179px]:pb-12')}>
      <TicketView key={id} id={id} />
    </div>
  )
}
