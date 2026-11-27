import type { ReactNode } from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export const DEMO_LOCK_MESSAGE = 'Switched off in demo workspaces. Create your own workspace to use this.'

/** Wraps a disabled control so hovering (or focusing) it explains why it is off. A disabled button gets no mouse events, so the wrapper listens instead. */
export function DemoLock({ locked, children }: { locked: boolean; children: ReactNode }) {
  if (!locked) return <>{children}</>
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex cursor-not-allowed rounded-control focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none [&>*]:pointer-events-none">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{DEMO_LOCK_MESSAGE}</TooltipContent>
    </Tooltip>
  )
}
