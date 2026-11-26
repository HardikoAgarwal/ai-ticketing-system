import { Mail } from 'lucide-react'

import { fill, on } from '@/components/ds'
import { cn } from '@/lib/utils'

/**
 * "A customer wrote back." A bright highlighter-yellow badge with an envelope and a pulsing dot (still when reduced motion is on).
 * No other badge uses this colour, so a ticket waiting for a reply stands out in a long list.
 */
export function NewMessageBadge({ label, size = 'lg', className }: { label: string; size?: 'sm' | 'lg'; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center rounded-chip font-bold whitespace-nowrap', size === 'lg' ? 'h-8 gap-2 px-3 text-sm' : 'h-6 gap-1.5 px-2 text-xs', className)}
      style={{ background: fill('butter'), color: on('butter'), boxShadow: `0 0 0 3px color-mix(in srgb, ${fill('butter')} 35%, transparent)` }}
    >
      <span className="relative flex size-2.5 shrink-0" aria-hidden>
        <span className="absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping" style={{ background: on('butter') }} />
        <span className="relative inline-flex size-2.5 rounded-full" style={{ background: on('butter') }} />
      </span>
      <Mail className={size === 'lg' ? 'size-4' : 'size-3.5'} aria-hidden />
      {label}
    </span>
  )
}
