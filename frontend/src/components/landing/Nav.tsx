import { ArrowRight, LifeBuoy, Menu, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { homeFor, useAuth } from '@/auth/AuthContext'
import { cn } from '@/lib/utils'

import { BRAND, GITHUB_URL } from './constants'

const LINKS = [
  { href: '#story', label: 'Product' },
  { href: '#features', label: 'Features' },
  { href: '#demo', label: 'Demo' },
  { href: '#faq', label: 'FAQ' },
]

export function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.4-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  )
}

/** Which kind of section is under the nav: sections declare it with data-nav="dark" | "light". */
function useNavTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-nav]'))
    if (!sections.length) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setTheme((e.target as HTMLElement).dataset.nav === 'light' ? 'light' : 'dark')
      },
      { rootMargin: '-44px 0px -92% 0px' },
    )
    sections.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [])
  return theme
}

export function Nav() {
  const { user } = useAuth()
  const theme = useNavTheme()
  const [open, setOpen] = useState(false)
  const dark = theme === 'dark'

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const pill = dark ? 'bg-white/10 text-white ring-white/15' : 'bg-white/80 text-(--lp-ink) ring-black/10'
  const link = dark ? 'text-white/75 hover:bg-white/10 hover:text-white' : 'text-(--lp-ink)/70 hover:bg-black/5 hover:text-(--lp-ink)'

  return (
    <>
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 top-3 z-50 flex justify-center px-3 sm:top-4"
      >
        <div className={cn('flex w-full max-w-4xl items-center gap-1 rounded-full py-1.5 pr-1.5 pl-3 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.35)] ring-1 backdrop-blur-xl transition-colors duration-500', pill)}>
          <a href="#top" className="lp-focus flex items-center gap-2 rounded-full pr-2 font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-full bg-(--lp-lime) text-(--lp-ink)">
              <LifeBuoy className="size-4" />
            </span>
            <span className="hidden sm:inline">{BRAND}</span>
          </a>

          <nav className="ml-auto hidden items-center md:flex" aria-label="Sections">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className={cn('lp-focus rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors', link)}>
                {l.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 md:ml-2">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label="GitHub repository" className={cn('lp-focus hidden size-9 items-center justify-center rounded-full transition-colors sm:flex', link)}>
              <GithubMark className="size-[18px]" />
            </a>
            {user ? (
              <Link to={homeFor(user)} className="lp-focus flex h-9 items-center gap-1.5 rounded-full bg-(--lp-lime) px-4 text-sm font-semibold text-(--lp-ink) transition-transform hover:scale-[1.03]">
                Open workspace <ArrowRight className="size-4" />
              </Link>
            ) : (
              <>
                <Link to="/login" className={cn('lp-focus hidden h-9 items-center rounded-full px-3.5 text-sm font-medium transition-colors sm:flex', link)}>
                  Log in
                </Link>
                <a href="#demo" className="lp-focus flex h-9 items-center gap-1.5 rounded-full bg-(--lp-lime) px-4 text-sm font-semibold text-(--lp-ink) transition-transform hover:scale-[1.03]">
                  Try a demo <ArrowRight className="size-4" />
                </a>
              </>
            )}
            <button type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((o) => !o)} className={cn('lp-focus flex size-9 items-center justify-center rounded-full md:hidden', link)}>
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-menu"
            aria-label="Menu"
            initial={{ clipPath: 'circle(0% at calc(100% - 2.4rem) 2.6rem)' }}
            animate={{ clipPath: 'circle(150% at calc(100% - 2.4rem) 2.6rem)' }}
            exit={{ clipPath: 'circle(0% at calc(100% - 2.4rem) 2.6rem)' }}
            transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-40 flex flex-col justify-center gap-2 bg-(--lp-ink) px-8 text-white md:hidden"
          >
            {[...LINKS, { href: GITHUB_URL, label: 'GitHub' }].map((l, i) => (
              <motion.a
                key={l.label}
                href={l.href}
                {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
                onClick={() => setOpen(false)}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 + i * 0.07, duration: 0.5 }}
                className="lp-focus text-5xl font-semibold tracking-tight"
              >
                {l.label}
              </motion.a>
            ))}
            {!user && (
              <Link to="/login" onClick={() => setOpen(false)} className="lp-focus mt-4 text-lg text-white/60">
                Log in →
              </Link>
            )}
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  )
}
