import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { DemoPicker } from '@/components/landing/DemoPicker'
import { Features } from '@/components/landing/Features'
import { Hero } from '@/components/landing/Hero'
import { Nav } from '@/components/landing/Nav'
import { Faq, FinalCta, Footer, HowItWorks, UseCases } from '@/components/landing/Sections'
import { Showcase } from '@/components/landing/Showcase'
import { API_URL } from '@/lib/api'

/** Public marketing page. All brand copy lives in components/landing/constants.ts. */
export function LandingPage() {
  const { hash } = useLocation()
  const [notice, setNotice] = useState<string | null>(null)

  // Free hosts sleep when idle: wake the API while the visitor reads so "Start the demo" is instant.
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
    <div id="top" className="min-h-screen overflow-x-clip bg-background">
      <Nav />
      <main>
        <Hero />
        <Showcase />
        <Features />
        <DemoPicker notice={notice} />
        <HowItWorks />
        <UseCases />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
