import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { Bento } from '@/components/landing/Bento'
import { Faq, FinalCta, Footer } from '@/components/landing/Closing'
import { Demo } from '@/components/landing/Demo'
import { Hero } from '@/components/landing/Hero'
import { Nav } from '@/components/landing/Nav'
import { Story } from '@/components/landing/Story'
import { API_URL } from '@/lib/api'

const LOADED_WITH_HASH = typeof location === 'undefined' ? '' : location.hash
let deepLinkDone = false

/** Public marketing page. Palette lives in index.css (.lp), brand copy in components/landing/constants.ts. */
export function LandingPage() {
  const { hash } = useLocation()
  const [notice, setNotice] = useState<string | null>(null)

  // Free hosts sleep when idle: wake the API while the visitor reads so "Enter as agent" is instant.
  useEffect(() => {
    fetch(`${API_URL}/health/`, { mode: 'cors' }).catch(() => {})
  }, [])

  useEffect(() => {
    const n = sessionStorage.getItem('helpdesk.notice')
    if (n) {
      setNotice(n)
      sessionStorage.removeItem('helpdesk.notice')
      document.getElementById('demo')?.scrollIntoView()
    }
  }, [])

  // Deep links such as /#faq: sections are still laying out (fonts, reveal animations) and the browser may
  // restore scroll after first paint, so re-apply the jump a few times on the initial load only.
  useEffect(() => {
    if (!hash) return
    const go = () => {
      const el = document.getElementById(hash.slice(1))
      // 'instant' beats the page-wide CSS smooth scroll, which a deep link must not animate across 10,000px
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'instant' })
    }
    if (hash !== LOADED_WITH_HASH || deepLinkDone) {
      document.getElementById(hash.slice(1))?.scrollIntoView() // in-app navigation to a section
      return
    }
    go()
    const timers = [150, 500, 1200, 2500].map((ms) => window.setTimeout(go, ms))
    timers.push(window.setTimeout(() => (deepLinkDone = true), 2600))
    return () => timers.forEach(window.clearTimeout)
  }, [hash])

  return (
    <div className="lp min-h-screen overflow-x-clip bg-(--lp-ink)">
      <Nav />
      <main>
        <Hero />
        <Story />
        <Bento />
        <Demo notice={notice} />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
