import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { BrandMark, BrandPanel } from './BrandPanel'

/** Split layout: the form on paper canvas, the product story on a deep-ink panel (lg and up). */
export function AuthLayout({ title, subtitle, children, footer, width = 'max-w-[26rem]' }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; width?: string }) {
  return (
    <div className="min-h-dvh bg-canvas text-ink lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <main id="main" className="flex min-h-dvh flex-col px-5 py-6 sm:px-10 lg:min-h-0 lg:py-10">
        <header className="lg:hidden">
          <Link to="/" aria-label="Helpdesk AI, back to home" className="inline-flex items-center gap-2.5 rounded-control p-1 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet">
            <BrandMark />
            <span className="text-[15px] font-semibold tracking-tight">Helpdesk AI</span>
          </Link>
        </header>
        <div className="flex flex-1 items-center justify-center py-10 lg:py-0">
          <div className={`w-full ${width}`}>
            <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.03em]">{title}</h1>
            {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 border-t border-line pt-6 text-sm text-ink-2">{footer}</div>}
          </div>
        </div>
      </main>
      <BrandPanel />
    </div>
  )
}

/** Styled in-text link used by auth footers. */
export function AuthLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="rounded-sm font-semibold text-violet underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet">
      {children}
    </Link>
  )
}
