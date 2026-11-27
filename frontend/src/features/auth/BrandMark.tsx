import { LifeBuoy } from 'lucide-react'

import { cn } from '@/lib/utils'

/** The logo tile: the brand emerald with the lifebuoy. Decorative; the product name is always written next to it. */
export function BrandMark({ className = 'size-9' }: { className?: string }) {
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-control bg-brand text-on-brand', className)} aria-hidden>
      <LifeBuoy className="size-[56%]" />
    </span>
  )
}
