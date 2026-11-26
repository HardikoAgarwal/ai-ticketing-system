import { Check, Loader2 } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { homeFor, useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { authApi } from '@/lib/endpoints'
import { cn } from '@/lib/utils'

import { AuthLayout, AuthLink } from './AuthLayout'
import { FormAlert, PasswordField, TextField } from './fields'
import { friendlyError } from './errors'
import { focusFirstInvalid } from './focus'

type Form = { workspace_name: string; full_name: string; email: string; password: string }

function validate(f: Form): Partial<Record<keyof Form, string>> {
  const e: Partial<Record<keyof Form, string>> = {}
  if (!f.workspace_name.trim()) e.workspace_name = 'Give your workspace a name, for example your company.'
  if (!f.full_name.trim()) e.full_name = 'Enter your name.'
  if (!f.email.trim()) e.email = 'Enter your work email.'
  else if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'That does not look like an email address.'
  if (f.password.length < 8) e.password = 'Use at least 8 characters.'
  return e
}

export function SignupPage() {
  const { user, completeAuth } = useAuth()
  const navigate = useNavigate()
  const formRef = useRef<HTMLFormElement>(null)
  const [form, setForm] = useState<Form>({ workspace_name: '', full_name: '', email: '', password: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={homeFor(user)} replace />

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const local = validate(form)
    setErrors(local)
    if (Object.keys(local).length) return focusFirstInvalid(formRef)
    setBusy(true)
    try {
      const res = await authApi.register({ ...form, workspace_name: form.workspace_name.trim(), full_name: form.full_name.trim(), email: form.email.trim() })
      const u = completeAuth(res)
      navigate(homeFor(u, res.workspace_slug), { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setErrors(err.fieldErrors as Partial<Record<keyof Form, string>>)
        focusFirstInvalid(formRef)
      }
      setError(friendlyError(err))
      setBusy(false)
    }
  }

  const longEnough = form.password.length >= 8
  return (
    <AuthLayout
      title="Create your workspace"
      subtitle="You become the owner. Invite your team and customers whenever you are ready."
      footer={
        <>
          Already have an account? <AuthLink to="/login">Sign in</AuthLink>. Just looking? <AuthLink to="/#demo">Try a demo</AuthLink>.
        </>
      }
    >
      <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
        <FormAlert message={error} />
        <TextField label="Workspace name" autoComplete="organization" autoFocus value={form.workspace_name} onChange={set('workspace_name')} error={errors.workspace_name} hint="Shown to your team and customers." />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Your name" autoComplete="name" value={form.full_name} onChange={set('full_name')} error={errors.full_name} />
          <TextField label="Work email" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={set('email')} error={errors.email} />
        </div>
        <PasswordField
          label="Password"
          autoComplete="new-password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          hint={
            <span className={cn('inline-flex items-center gap-1.5', longEnough && 'font-medium text-mint-ink')}>
              {longEnough && <Check className="size-3.5" aria-hidden />} At least 8 characters
            </span>
          }
        />
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />} {busy ? 'Creating workspace…' : 'Create workspace'}
        </Button>
      </form>
    </AuthLayout>
  )
}
