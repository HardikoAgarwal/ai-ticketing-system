import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { homeFor } from '@/auth/RequireRole'
import { Logo } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorMessage } from '@/lib/api'

const DEMO_ACCOUNTS = [
  { label: 'Author', name: 'Priya Sharma', email: 'priya.sharma@email.com', password: 'Author@123' },
  { label: 'Author', name: 'Sneha Kulkarni', email: 'sneha.kulkarni@email.com', password: 'Author@123' },
  { label: 'Admin', name: 'Aarav Mehta', email: 'admin@bookleaf.com', password: 'Admin@123' },
]

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from

  if (user) return <Navigate to={from && from.startsWith(homeFor(user.role)) ? from : homeFor(user.role)} replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setSubmitting(true)
    try {
      const signedIn = await login(email, password)
      const home = homeFor(signedIn.role)
      navigate(from && from.startsWith(home) ? from : home, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-accent/60 to-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo subtitle="Author Support Portal" />
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h1 className="text-lg font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Authors and BookLeaf team members use the same sign-in.</p>

          <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            {error && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <Button type="submit" className="h-9 w-full" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <div className="mt-4 rounded-xl border border-dashed bg-card/70 p-4">
          <p className="text-xs font-medium text-muted-foreground">Demo accounts (click to fill)</p>
          <div className="mt-2 space-y-1.5">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => {
                  setEmail(acc.email)
                  setPassword(acc.password)
                  setError(null)
                }}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
              >
                <span>
                  <span className="font-medium">{acc.name}</span>
                  <span className="text-muted-foreground"> · {acc.email}</span>
                </span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{acc.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">All authors: Author@123 · All admins: Admin@123</p>
        </div>
      </div>
    </div>
  )
}
