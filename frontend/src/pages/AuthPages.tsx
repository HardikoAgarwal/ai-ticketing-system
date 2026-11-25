import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'

import { homeFor, useAuth } from '@/auth/AuthContext'
import { Logo } from '@/components/common'
import { DemoLauncher } from '@/components/DemoLauncher'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, errorMessage } from '@/lib/api'
import { authApi } from '@/lib/endpoints'

function Shell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <Link to="/" aria-label="Back to home" className="mb-8 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Logo />
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-pop sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-7">{children}</div>
      </div>
      {footer && <div className="mt-6 w-full max-w-md text-center text-sm text-muted-foreground">{footer}</div>}
    </div>
  )
}

function PasswordInput({ id, value, onChange, autoComplete }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input id={id} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} className="pr-10" />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

function FormError({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  ) : null
}

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const from = (location.state as { from?: string } | null)?.from

  if (user) return <Navigate to={from && from.startsWith('/w/') ? from : homeFor(user)} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) return setError('Enter your email and password.')
    setBusy(true)
    try {
      const u = await login(email.trim(), password)
      navigate(from && from.startsWith('/w/') ? from : homeFor(u), { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Shell
      title="Welcome back"
      subtitle="Sign in to your workspace."
      footer={
        <>
          New here? <Link to="/signup" className="font-medium text-primary hover:underline">Create a workspace</Link>, or <Link to="/#demo" className="font-medium text-primary hover:underline">try the demo</Link>.
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormError message={error} />
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Sign in
        </Button>
      </form>
      <details className="mt-6 text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Just looking? Open a demo workspace</summary>
        <div className="mt-4">
          <DemoLauncher />
        </div>
      </details>
    </Shell>
  )
}

export function SignupPage() {
  const { user, completeAuth } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', workspace_name: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={homeFor(user)} replace />

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setErrors({})
    setBusy(true)
    try {
      const res = await authApi.register(form)
      const u = completeAuth(res)
      navigate(homeFor(u, res.workspace_slug), { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) setErrors(err.fieldErrors)
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Shell title="Create your workspace" subtitle="You become the owner. Invite your team and customers later." footer={<>Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormError message={error} />
        {(
          [
            ['workspace_name', 'Workspace name', 'text', 'organization'],
            ['full_name', 'Your name', 'text', 'name'],
            ['email', 'Work email', 'email', 'email'],
          ] as const
        ).map(([k, label, type, ac]) => (
          <div key={k} className="space-y-1.5">
            <Label htmlFor={k}>{label}</Label>
            <Input id={k} type={type} autoComplete={ac} value={form[k]} onChange={(e) => set(k)(e.target.value)} aria-invalid={!!errors[k]} />
            {errors[k] && <p className="text-xs text-red-600">{errors[k]}</p>}
          </div>
        ))}
        <div className="space-y-1.5">
          <Label htmlFor="su-password">Password</Label>
          <PasswordInput id="su-password" value={form.password} onChange={set('password')} autoComplete="new-password" />
          {errors.password ? <p className="text-xs text-red-600">{errors.password}</p> : <p className="text-xs text-muted-foreground">At least 8 characters.</p>}
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Create workspace
        </Button>
      </form>
    </Shell>
  )
}

export function InvitePage() {
  const { token = '' } = useParams()
  const { user, completeAuth } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={homeFor(user)} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await authApi.acceptInvite({ token, full_name: fullName, password })
      const u = completeAuth(res)
      navigate(homeFor(u, res.workspace_slug), { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Shell title="Join your team" subtitle="Set up your account to accept the invite.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormError message={error} />
        <div className="space-y-1.5">
          <Label htmlFor="inv-name">Your name</Label>
          <Input id="inv-name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inv-pw">Password</Label>
          <PasswordInput id="inv-pw" value={password} onChange={setPassword} autoComplete="new-password" />
        </div>
        <Button type="submit" className="w-full" disabled={busy || !fullName.trim() || password.length < 8}>
          {busy && <Loader2 className="animate-spin" />} Accept invite
        </Button>
      </form>
    </Shell>
  )
}
