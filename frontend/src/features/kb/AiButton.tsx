import { Sparkles } from 'lucide-react'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

/** A button that wears the AI treatment (a thin aurora border) so it is clear it opens something AI-powered. */
export function AiButton({ className, children, ...rest }: ComponentProps<'button'>) {
  return (
    <button type="button" className={cn('ai-border inline-flex h-10 items-center gap-2 rounded-control bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:outline-none', className)} {...rest}>
      <Sparkles className="size-4 text-ai" aria-hidden />
      {children}
    </button>
  )
}
