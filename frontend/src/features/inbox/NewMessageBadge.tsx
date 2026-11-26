import { Mail } from 'lucide-react'

import { fill } from '@/components/ds'

/**
 * "A customer wrote back." Deliberately unlike every other badge: a dark pill with an envelope and a pulsing green dot (still when
 * reduced motion is on), so a ticket waiting for a reply is the first thing the eye lands on in a long list.
 */
export function NewMessageBadge({ label, size = 'lg' }: { label: string; size?: 'sm' | 'lg' }) {
  return (
    <span
      className={size === 'lg' ? 'inline-flex h-9 items-center gap-2 rounded-chip bg-ink pr-3.5 pl-3 text-sm font-bold whitespace-nowrap text-canvas' : 'inline-flex h-7 items-center gap-1.5 rounded-chip bg-ink pr-2.5 pl-2 text-xs font-bold whitespace-nowrap text-canvas'}
      style={{ boxShadow: `0 0 0 3px color-mix(in srgb, ${fill('mint')} 38%, transparent)` }}
    >
      <span className="relative flex size-2.5 shrink-0" aria-hidden>
        <span className="absolute inline-flex size-full rounded-full opacity-75 motion-safe:animate-ping" style={{ background: fill('mint') }} />
        <span className="relative inline-flex size-2.5 rounded-full" style={{ background: fill('mint') }} />
      </span>
      <Mail className={size === 'lg' ? 'size-4' : 'size-3.5'} aria-hidden />
      {label}
    </span>
  )
}
