import { Loader2 } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { homeFor, useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'

import { AuthLayout } from './AuthLayout'
import { FormAlert, PasswordField, TextField } from './fields'
import { friendlyError } from './errors'

/**
 * Sign in, and nothing else. Agents and customers share this page, so it carries no demo, no workspace request and
 * no word about how accounts are made: the demo and the request form both live on the landing page.
 */
export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const from = (location.state as { from?: string } | null)?.from

  if (user) return <Navigate to={from && from.startsWith('/w/') ? from : homeFor(user)} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const errs: { email?: string; password?: string } = {}
    if (!email.trim()) errs.email = 'Enter your email address.'
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = 'That does not look like an email address.'
    if (!password) errs.password = 'Enter your password.'
    setFieldErrors(errs)
    if (errs.email) return emailRef.current?.focus()
    if (errs.password) return passwordRef.current?.focus()
    setBusy(true)
    try {
      const u = await login(email.trim(), password)
      navigate(from && from.startsWith('/w/') ? from : homeFor(u), { replace: true })
    } catch (err) {
      setError(friendlyError(err))
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormAlert message={error} />
        <TextField ref={emailRef} label="Email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErrors.email} />
        <PasswordField ref={passwordRef} label="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={fieldErrors.password} />
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />}
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
