import { Compass, Home, LogIn } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAuth, homeFor } from '@/auth/AuthContext'
import { BrandMark } from '@/features/auth/BrandPanel'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  const { user } = useAuth()
  return (
    <main id="main" className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-canvas px-5 text-ink">
      <div className="pointer-events-none absolute -top-32 left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-aurora-1/20 blur-[110px]" aria-hidden />
      <div className="relative w-full max-w-md text-center">
        <Link to="/" aria-label="Helpdesk AI, back to home" className="mx-auto mb-8 inline-flex rounded-control outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet">
          <BrandMark className="size-11" />
        </Link>
        <p className="text-sm font-semibold text-violet">404</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em]">Page not found</h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-ink-2">
          <Compass className="mr-1.5 mb-0.5 inline size-4" aria-hidden />
          The page you are looking for doesn't exist, was moved, or you don't have access to it.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2.5">
          <Button asChild size="lg">
            <Link to={user ? homeFor(user) : '/'}>
              <Home aria-hidden /> {user ? 'Back to my workspace' : 'Go to home'}
            </Link>
          </Button>
          {!user && (
            <Button asChild size="lg" variant="outline">
              <Link to="/login">
                <LogIn aria-hidden /> Sign in
              </Link>
            </Button>
          )}
        </div>
      </div>
    </main>
  )
}
