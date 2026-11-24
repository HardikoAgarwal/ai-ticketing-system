import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { Bento } from '@/components/landing/Bento'
import { Faq, FinalCta, Footer } from '@/components/landing/Closing'
import { Demo } from '@/components/landing/Demo'
import { Hero } from '@/components/landing/Hero'
import { Nav } from '@/components/landing/Nav'
import { Story } from '@/components/landing/Story'
import { API_URL } from '@/lib/api'

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

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
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
