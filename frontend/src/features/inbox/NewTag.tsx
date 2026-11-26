import { Sparkles } from 'lucide-react'

import { fill, on } from '@/components/ds'
import { cn } from '@/lib/utils'

/**
 * Marks a ticket that arrived while you were looking at the list. A small solid chip with a soft ring that pings outwards and a
 * sparkle that breathes; it pops in once. It sits on the card's top-right corner so it takes no room and moves nothing.
 * Motion is skipped when the user prefers reduced motion.
 */
export function NewTag({ size = 'md', className }: { size?: 'sm' | 'md'; className?: string }) {
  return (
    <span className={cn('pointer-events-none z-20 motion-safe:animate-[new-pop_0.45s_cubic-bezier(0.34,1.56,0.64,1)_both]', className)}>
      <span className="relative inline-flex">
        <span className="absolute inset-0 rounded-chip opacity-50 motion-safe:animate-ping" style={{ background: fill('lav') }} aria-hidden />
        <span className={cn('relative inline-flex items-center gap-1.5 rounded-chip font-bold shadow-md', size === 'md' ? 'h-8 px-3 text-sm' : 'h-6 px-2 text-xs')} style={{ background: fill('lav'), color: on('lav') }}>
          <Sparkles className={cn('motion-safe:animate-pulse', size === 'md' ? 'size-4' : 'size-3.5')} aria-hidden />
          New
        </span>
      </span>
    </span>
  )
}
