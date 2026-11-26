import { Sparkles, type LucideIcon } from 'lucide-react'
import type { ComponentProps, ElementType, ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * The shared "this is AI" treatment: 1px aurora gradient border (violet, cyan, pink) plus a soft glow.
 * `working` rotates the gradient and breathes the glow while the AI is generating; at rest it is static.
 * tone="quiet" = border only (lists, small cards); tone="bold" = border + glow (primary AI surfaces such as the draft).
 */
export function AiSurface({
  as,
  working = false,
  animated = false,
  tone = 'bold',
  className,
  children,
  ...rest
}: { as?: ElementType; working?: boolean; /** Keep the glow and the rotating border moving even when nothing is being generated. */ animated?: boolean; tone?: 'quiet' | 'bold'; className?: string; children?: ReactNode } & Omit<ComponentProps<'div'>, 'children'>) {
  const Comp = (as ?? 'div') as ElementType
  return (
    <Comp
      data-working={working || animated ? 'true' : undefined}
      aria-busy={working || undefined}
      className={cn('ai-border relative rounded-panel bg-surface', tone === 'bold' ? 'ai-surface' : 'shadow-card', working && tone === 'quiet' && 'ai-shimmer', className)}
      {...rest}
    >
      {children}
    </Comp>
  )
}

/** The spark glyph; pulses while working. Decorative unless you pass a label. */
export function AiSpark({ working = false, className, label }: { working?: boolean; className?: string; label?: string }) {
  return (
    <Sparkles
      className={cn('size-4 shrink-0 text-ai', working && 'animate-pulse motion-reduce:animate-none', className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    />
  )
}

/** Small glowing chip: "AI · 95%", "Draft ready". Content must carry the meaning in text. */
export function AiChip({ icon: Icon = Sparkles, working = false, size = 'md', className, children }: {
  icon?: LucideIcon
  working?: boolean
  size?: 'sm' | 'md'
  className?: string
  children: ReactNode
}) {
  return (
    <span
      data-working={working ? 'true' : undefined}
      className={cn(
        'ai-border inline-flex w-fit shrink-0 items-center rounded-chip bg-surface font-semibold whitespace-nowrap text-lav-ink',
        size === 'sm' ? 'h-6 gap-1 px-2 text-xs' : 'h-7 gap-1.5 px-2.5 text-[13px]',
        className,
      )}
    >
      <Icon className={cn('size-3.5 shrink-0 text-ai', working && 'animate-pulse motion-reduce:animate-none')} aria-hidden />
      {children}
    </span>
  )
}

/** Tiny inline marker for AI-written text or values: "✦ AI". */
export function AiBadgeInline({ className, children = 'AI' }: { className?: string; children?: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-semibold text-lav-ink', className)}>
      <Sparkles className="size-3 text-ai" aria-hidden />
      {children}
    </span>
  )
}
