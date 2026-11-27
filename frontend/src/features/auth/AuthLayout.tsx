import { Moon, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { IconButton } from '@/components/ds'
import { useTheme } from '@/theme/ThemeProvider'

import { AuthPanel } from './AuthPanel'
import { BrandMark } from './BrandMark'

/**
 * Shell for the signed-out screens (sign in, accept an invite).
 * Left: the logo and one form, straight on the paper canvas with no card around it. Right: the brand panel.
 * Built on theme tokens only, so it follows the same light or dark theme as the app.
 */
export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas text-ink lg:grid lg:h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:overflow-hidden">
      <div className="scroll-quiet flex min-h-dvh flex-col lg:min-h-0 lg:overflow-y-auto">
        <header className="flex h-[4.5rem] shrink-0 items-center justify-between px-6 sm:px-10 lg:h-20 lg:px-12">
          <Link to="/" aria-label="Helpdesk AI, back to home" className="-ml-1 inline-flex items-center gap-2.5 rounded-control p-1">
            <BrandMark className="size-8" />
            <span className="text-[15px] font-semibold tracking-tight">Helpdesk AI</span>
          </Link>
          <ThemeSwitch />
        </header>

        <main id="main" className="flex flex-1 flex-col justify-center px-6 py-6 sm:px-10 lg:px-12">
          <div className="fade-up mx-auto w-full max-w-[23rem]">
            <h1 className="text-[28px] leading-[1.15] font-semibold tracking-[-0.03em]">{title}</h1>
            {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 text-sm leading-relaxed text-ink-2">{footer}</div>}
          </div>
        </main>

        {/* mirrors the header's height so the form sits in the true middle of the column; gives way first on short windows */}
        <div className="h-20 shrink max-lg:hidden" aria-hidden />
      </div>

      <AuthPanel />
    </div>
  )
}

function ThemeSwitch() {
  const { resolved, setChoice } = useTheme()
  const dark = resolved === 'dark'
  return <IconButton label={dark ? 'Switch to light theme' : 'Switch to dark theme'} icon={dark ? Sun : Moon} onClick={() => setChoice(dark ? 'light' : 'dark')} />
}

export function AuthLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="rounded-sm font-semibold text-violet underline-offset-4 hover:underline">
      {children}
    </Link>
  )
}
