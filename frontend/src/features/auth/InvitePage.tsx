import { Loader2, MailX } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { homeFor, useAuth } from '@/auth/AuthContext'
import { EmptyState } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { authApi } from '@/lib/endpoints'

import { AuthLayout, AuthLink } from './AuthLayout'
import { FormAlert, PasswordField, TextField } from './fields'
import { friendlyError } from './errors'
import { focusFirstInvalid } from './focus'

export function InvitePage() {
  const { token = '' } = useParams()
  const { user, completeAuth } = useAuth()
  const navigate = useNavigate()
  const formRef = useRef<HTMLFormElement>(null)
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ name?: string; password?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={homeFor(user)} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const errs: { name?: string; password?: string } = {}
    if (!fullName.trim()) errs.name = 'Enter your name.'
    if (password.length < 8) errs.password = 'Use at least 8 characters.'
    setErrors(errs)
    if (errs.name || errs.password) return focusFirstInvalid(formRef)
    setBusy(true)
    try {
      const res = await authApi.acceptInvite({ token, full_name: fullName.trim(), password })
      const u = completeAuth(res)
      navigate(homeFor(u, res.workspace_slug), { replace: true })
    } catch (err) {
      // 404/410, or a 400 with no field errors, mean the link itself is unusable (already used, expired or revoked)
      if (err instanceof ApiError && ([404, 410].includes(err.status) || (err.status === 400 && Object.keys(err.fieldErrors).length === 0))) setInvalid(true)
      else setError(friendlyError(err))
      setBusy(false)
    }
  }

  if (invalid) {
    return (
      <AuthLayout title="This invite can't be used" subtitle="The link may have expired, been revoked, or already been accepted.">
        <EmptyState icon={MailX} title="Ask for a new invite" description="Ask the workspace owner to send you a fresh link. If you already set up your account, sign in instead." action={<Button asChild><Link to="/login">Go to sign in</Link></Button>} />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Join your team" subtitle="Set up your account to accept the invite." footer={<>Already have an account? <AuthLink to="/login">Sign in</AuthLink></>}>
      <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
        <FormAlert message={error} />
        <TextField label="Your name" autoComplete="name" autoFocus value={fullName} onChange={(e) => { setFullName(e.target.value); setErrors((x) => ({ ...x, name: undefined })) }} error={errors.name} />
        <PasswordField label="Choose a password" autoComplete="new-password" value={password} onChange={(e) => { setPassword(e.target.value); setErrors((x) => ({ ...x, password: undefined })) }} error={errors.password} hint="At least 8 characters." />
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />} {busy ? 'Joining…' : 'Accept invite'}
        </Button>
      </form>
    </AuthLayout>
  )
}
