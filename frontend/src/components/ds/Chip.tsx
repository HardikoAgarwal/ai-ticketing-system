import type { LucideIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { CHIP_TONES, type ChipTone } from './chip-tones'


const SIZES = { sm: 'h-6 gap-1 px-2 text-xs', md: 'h-7 gap-1.5 px-2.5 text-[13px]', lg: 'h-8 gap-1.5 px-3 text-sm' } as const
const ICON = { sm: 'size-3.5', md: 'size-3.5', lg: 'size-4' } as const

export interface ChipProps extends Omit<ComponentProps<'span'>, 'children'> {
  tone?: ChipTone
  icon?: LucideIcon
  size?: keyof typeof SIZES
  /** Renders a button (keyboard focusable) instead of a span. */
  onClick?: () => void
  children: ReactNode
}

/**
 * The one badge look in the app. Always give it an icon or clear text: state is never conveyed by colour alone.
 * Pass `onClick` to make it interactive (renders a real button).
 */
export function Chip({ tone = 'slate', icon: Icon, size = 'md', className, children, onClick, ...rest }: ChipProps) {
  const cls = cn(
    'inline-flex w-fit shrink-0 items-center rounded-chip border font-semibold whitespace-nowrap',
    SIZES[size],
    CHIP_TONES[tone],
    onClick && 'cursor-pointer transition-[filter] hover:brightness-95 dark:hover:brightness-125',
    className,
  )
  const body = (
    <>
      {Icon && <Icon className={cn('shrink-0', ICON[size])} aria-hidden />}
      {children}
    </>
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls} {...(rest as ComponentProps<'button'>)}>
        {body}
      </button>
    )
  }
  return (
    <span className={cls} {...rest}>
      {body}
    </span>
  )
}
