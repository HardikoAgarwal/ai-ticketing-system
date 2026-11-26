import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { fill, on, type Hue } from './viz'

const SIZES = { sm: 'h-6 gap-1 px-2 text-xs', md: 'h-7 gap-1.5 px-2.5 text-[13px]', lg: 'h-8 gap-1.5 px-3 text-sm' } as const

/** A badge in a solid colour (text on the matching `--on-*` colour). Always carries an icon or words, never colour alone. */
export function SolidChip({ hue, icon: Icon, size = 'md', className, children }: { hue: Hue; icon?: LucideIcon; size?: keyof typeof SIZES; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex w-fit shrink-0 items-center rounded-chip font-semibold whitespace-nowrap', SIZES[size], className)} style={{ background: fill(hue), color: on(hue) }}>
      {Icon && <Icon className="size-3.5 shrink-0" aria-hidden />}
      {children}
    </span>
  )
}
