import type { LucideIcon } from 'lucide-react'
import { isValidElement, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** One card look for every dashboard panel: white, 1px border, rounded-2xl and a soft shadow, so panels pop off the tinted page. */
export const surface = 'rounded-2xl border border-slate-200/80 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.05),0_8px_24px_-12px_rgba(15,23,42,0.12)]'

export function Surface({ className, children, ...rest }: React.ComponentProps<'section'>) {
  return (
    <section className={cn(surface, 'overflow-hidden', className)} {...rest}>
      {children}
    </section>
  )
}

const TONES = {
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  violet: 'bg-violet-100 text-violet-700 ring-violet-200',
  blue: 'bg-blue-100 text-blue-700 ring-blue-200',
  emerald: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-100 text-amber-800 ring-amber-200',
} as const

/** Tinted section header bar: icon tile + title on the left, optional slot on the right. */
export function SurfaceHeader({ icon, title, tone = 'slate', right, className, as: Tag = 'h2' }: {
  icon: LucideIcon | ReactNode
  title: ReactNode
  tone?: keyof typeof TONES
  right?: ReactNode
  className?: string
  as?: 'h2' | 'h3'
}) {
  const glyph = isValidElement(icon) ? icon : (() => { const Icon = icon as LucideIcon; return <Icon className="size-4" /> })()
  return (
    <header className={cn('flex min-h-12 items-center gap-2.5 border-b border-slate-200/80 bg-slate-50/80 px-4 py-2.5 sm:px-5', className)}>
      <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset', TONES[tone])}>
        {glyph}
      </span>
      <Tag className="text-sm font-semibold tracking-tight">{title}</Tag>
      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </header>
  )
}
