import type { LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'

import { Kbd } from '@/components/ds/Kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const SIZES = { md: 'size-9', lg: 'size-11' } as const
const VARIANTS = {
  ghost: 'text-ink-2 hover:bg-sunken hover:text-ink',
  outline: 'border border-line-strong bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink',
  solid: 'bg-ink text-canvas hover:bg-ink/90',
} as const

/** Icon-only button. `label` is required: it is the accessible name and the tooltip. 36px minimum target (44px for `lg`). */
export function IconButton({ label, icon: Icon, shortcut, badge, size = 'md', variant = 'ghost', className, ...rest }: {
  label: string
  icon: LucideIcon
  shortcut?: string
  /** Small count/dot overlay; 0 or undefined hides it. */
  badge?: number
  size?: keyof typeof SIZES
  variant?: keyof typeof VARIANTS
} & Omit<ComponentProps<'button'>, 'children' | 'aria-label'>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={badge ? `${label}, ${badge} new` : label}
          className={cn('relative inline-flex shrink-0 items-center justify-center rounded-control transition-colors disabled:pointer-events-none disabled:opacity-50', SIZES[size], VARIANTS[variant], className)}
          {...rest}
        >
          <Icon className="size-[18px]" aria-hidden />
          {!!badge && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-md bg-rose-ink px-1 text-[10px] leading-none font-semibold text-canvas ring-2 ring-surface tabular-nums">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut && <Kbd keys={shortcut} className="ml-1 [&_kbd]:border-white/25 [&_kbd]:bg-white/10 [&_kbd]:text-canvas [&_kbd]:shadow-none" />}
      </TooltipContent>
    </Tooltip>
  )
}
