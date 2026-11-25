import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type ChipTone = 'green' | 'amber' | 'red' | 'blue' | 'violet' | 'slate'

/** Tinted background + slightly darker border + tinted text. Shared by every chip/badge in the dashboard. */
export const CHIP_TONES: Record<ChipTone, string> = {
  green: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/25 dark:text-emerald-300',
  amber: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/25 dark:text-amber-300',
  red: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/25 dark:text-red-300',
  blue: 'bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-500/10 dark:border-sky-500/25 dark:text-sky-300',
  violet: 'bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-500/10 dark:border-violet-500/25 dark:text-violet-300',
  slate: 'bg-zinc-100 border-zinc-200 text-zinc-700 dark:bg-zinc-500/10 dark:border-zinc-500/25 dark:text-zinc-300',
}

const SIZES = { sm: 'h-7 gap-1.5 px-2.5 text-xs', md: 'h-8 gap-2 px-3 text-[13px]' } as const

export function Chip({ tone = 'slate', icon: Icon, size = 'sm', className, children }: {
  tone?: ChipTone
  icon?: LucideIcon
  size?: keyof typeof SIZES
  className?: string
  children: ReactNode
}) {
  return (
    <span className={cn('inline-flex w-fit shrink-0 items-center rounded-lg border font-semibold whitespace-nowrap', SIZES[size], CHIP_TONES[tone], className)}>
      {Icon && <Icon className="size-3.5 shrink-0" />}
      {children}
    </span>
  )
}
