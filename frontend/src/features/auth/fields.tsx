import { AlertCircle, Eye, EyeOff, Info } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface ControlProps {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

/** Label + control + hint/error, with the description wired to the control through aria-describedby. */
export function Field({ label, hint, error, optional, children }: { label: string; hint?: ReactNode; error?: string | null; optional?: boolean; children: (props: ControlProps) => ReactNode }) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[13px] font-semibold text-ink">
        {label}
        {optional && <span className="ml-1 font-normal text-ink-3">(optional)</span>}
      </Label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-[13px] font-medium text-rose-ink">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="text-[13px] text-ink-3">
          {hint}
        </p>
      )}
    </div>
  )
}

export function TextField({ label, hint, error, optional, className, ...input }: { label: string; hint?: ReactNode; error?: string | null; optional?: boolean } & Omit<React.ComponentProps<'input'>, 'id'>) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional}>
      {(p) => <Input {...p} {...input} className={cn('h-11', className)} />}
    </Field>
  )
}

export function PasswordField({ label, hint, error, ...input }: { label: string; hint?: ReactNode; error?: string | null } & Omit<React.ComponentProps<'input'>, 'id' | 'type'>) {
  const [show, setShow] = useState(false)
  return (
    <Field label={label} hint={hint} error={error}>
      {(p) => (
        <div className="relative">
          <Input {...p} {...input} type={show ? 'text' : 'password'} className="h-11 pr-11" />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            aria-pressed={show}
            className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-control text-ink-3 transition-colors hover:bg-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet"
          >
            {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        </div>
      )}
    </Field>
  )
}

export function FormAlert({ message, tone = 'error' }: { message: string | null; tone?: 'error' | 'info' }) {
  if (!message) return null
  const error = tone === 'error'
  const Icon = error ? AlertCircle : Info
  return (
    <p role={error ? 'alert' : 'status'} className={cn('flex items-start gap-2 rounded-control border px-3 py-2.5 text-sm font-medium', error ? 'border-rose-line bg-rose text-rose-ink' : 'border-sky-line bg-sky text-sky-ink')}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden /> {message}
    </p>
  )
}
