import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** Neo-brutal hero CTA: hard ink border + offset shadow. Shared across the landing page. */
export const lpBtn =
  'lp-focus group inline-flex items-center rounded-full border-2 border-(--lp-ink) font-semibold shadow-[5px_5px_0_0_var(--lp-ink)] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_var(--lp-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_0_var(--lp-ink)] disabled:pointer-events-none disabled:opacity-55'

/** Same hard-offset style for dark surfaces — white border + white shadow. */
export const lpBtnOnDark =
  'lp-focus group inline-flex items-center rounded-full border-2 border-white font-semibold shadow-[5px_5px_0_0_#ffffff] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#ffffff] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_0_#ffffff] disabled:pointer-events-none disabled:opacity-55'

export const lpBtnPrimary = cn(lpBtn, 'bg-(--lp-violet) text-white')
export const lpBtnSecondary = cn(lpBtn, 'bg-white text-(--lp-ink)')
export const lpBtnLime = cn(lpBtn, 'bg-(--lp-lime) text-(--lp-ink)')
export const lpBtnInk = cn(lpBtn, 'bg-(--lp-ink) text-white')

export const lpBtnLimeOnDark = cn(lpBtnOnDark, 'bg-(--lp-lime) text-(--lp-ink)')
export const lpBtnSecondaryOnDark = cn(lpBtnOnDark, 'bg-white text-(--lp-ink)')
export const lpBtnPrimaryOnDark = cn(lpBtnOnDark, 'bg-(--lp-violet) text-white')

const ICON_TONE = {
  lime: 'bg-(--lp-lime) text-(--lp-ink)',
  violetSoft: 'bg-(--lp-violet)/15 text-(--lp-violet)',
  white: 'bg-white text-(--lp-ink)',
  ink: 'bg-(--lp-ink) text-white',
} as const

export function LpBtnIcon({
  children,
  tone = 'lime',
  className,
}: {
  children: ReactNode
  tone?: keyof typeof ICON_TONE
  className?: string
}) {
  return <span className={cn('flex shrink-0 items-center justify-center rounded-full', ICON_TONE[tone], className)}>{children}</span>
}
