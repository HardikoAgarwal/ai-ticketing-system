import { AlertCircle, ArrowRight, Check, Loader2, Send } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useId, useRef, useState, type ChangeEvent, type ComponentProps, type FormEvent, type ReactNode } from 'react'

import { focusFirstInvalid } from '@/features/auth/focus'
import { ApiError, errorMessage } from '@/lib/api'
import { workspaceRequestApi, type WorkspaceRequestInput } from '@/lib/endpoints'
import { cn } from '@/lib/utils'

import { lpBtnPrimary, LpBtnIcon } from './cta'
import { EASE, Reveal, WordReveal } from './motion'

type Errors = Partial<Record<keyof WorkspaceRequestInput, string>>

const EMPTY: WorkspaceRequestInput = { full_name: '', email: '', company: '', team_size: '', message: '' }

const STEPS = [
  { title: 'Send the form', body: 'Your name, your company and what you support.' },
  { title: 'We set up your workspace', body: 'With your own knowledge base, categories, response targets and tone of voice.' },
  { title: 'You get a sign-in by email', body: 'From there you invite your team and your customers.' },
]

/** Same rules as the API (apps/workspaces/workspace_requests.py), so the form catches them before the round trip. */
function validate(f: WorkspaceRequestInput): Errors {
  const e: Errors = {}
  if (f.full_name.trim().length < 2) e.full_name = 'Enter your name.'
  if (!f.email.trim()) e.email = 'Enter your work email.'
  else if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'That does not look like an email address.'
  if (f.company.trim().length < 2) e.company = 'Enter your company or team name.'
  if (f.message.trim().length < 10) e.message = 'Tell us a little about what you need.'
  return e
}

// Focus is shown on the field itself: the border turns violet inside a soft violet halo (red for a field with an error).
const control =
  'w-full rounded-2xl border-2 border-(--lp-ink)/15 bg-white px-4 text-base text-(--lp-ink) outline-hidden transition-[border-color,box-shadow] placeholder:text-(--lp-muted)/70 hover:border-(--lp-ink)/30 focus:border-(--lp-violet) focus:ring-4 focus:ring-(--lp-violet)/15 aria-invalid:border-[#c4321c] aria-invalid:focus:border-[#c4321c] aria-invalid:focus:ring-[#c4321c]/15'

function Field({ label, optional, error, children }: { label: string; optional?: boolean; error?: string; children: (p: { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string }) => ReactNode }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
        {optional && <span className="ml-1.5 font-medium text-(--lp-muted)">optional</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${id}-error` : undefined })}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-[13px] font-semibold text-[#a3260f]">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {error}
        </p>
      )}
    </div>
  )
}

function TextInput({ label, optional, error, ...input }: { label: string; optional?: boolean; error?: string } & Omit<ComponentProps<'input'>, 'id'>) {
  return (
    <Field label={label} optional={optional} error={error}>
      {(p) => <input {...p} {...input} className={cn(control, 'h-13')} />}
    </Field>
  )
}

/** Shown in place of the form once the request is stored. */
function Sent({ request, onReset }: { request: WorkspaceRequestInput; onReset: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null)
  // the card is already on screen, so move focus for screen readers without letting the browser re-scroll the page
  useEffect(() => heading.current?.focus({ preventScroll: true }), [])
  return (
    <div className="flex flex-col items-start px-6 py-10 sm:px-8 sm:py-12">
      <span className="flex size-16 items-center justify-center rounded-full border-2 border-(--lp-ink) bg-(--lp-lime) shadow-[4px_4px_0_0_var(--lp-ink)]">
        <Check className="size-8" strokeWidth={2.5} aria-hidden />
      </span>
      <h3 ref={heading} tabIndex={-1} className="mt-7 text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.02] font-semibold tracking-[-0.04em] outline-none">
        Request sent.
      </h3>
      <p role="status" className="mt-3 max-w-md text-lg leading-relaxed text-(--lp-muted)">
        Thanks, {request.full_name.split(' ')[0]}. We will reply to <span className="font-semibold [overflow-wrap:anywhere] text-(--lp-ink)">{request.email}</span> about a workspace for {request.company}.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-4">
        <a href="#demo" className={cn(lpBtnPrimary, 'h-13 gap-3 py-1.5 pr-1.5 pl-6 text-[0.95rem]')}>
          Try the demo meanwhile
          <LpBtnIcon tone="lime" className="size-10">
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </LpBtnIcon>
        </a>
        <button type="button" onClick={onReset} className="lp-focus rounded-full px-1 text-[15px] font-semibold underline decoration-2 underline-offset-4">
          Send another request
        </button>
      </div>
    </div>
  )
}

function RequestForm() {
  const reduce = useReducedMotion()
  const formRef = useRef<HTMLFormElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [held, setHeld] = useState<number>()
  const [form, setForm] = useState<WorkspaceRequestInput>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState<WorkspaceRequestInput | null>(null)

  const set = (k: keyof WorkspaceRequestInput) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setError(null)
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length) return focusFirstInvalid(formRef)
    const request: WorkspaceRequestInput = { full_name: form.full_name.trim(), email: form.email.trim(), company: form.company.trim(), team_size: form.team_size.trim(), message: form.message.trim() }
    setBusy(true)
    try {
      await workspaceRequestApi.send(request)
      setHeld(cardRef.current?.offsetHeight)
      setSent(request)
      setForm(EMPTY)
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && Object.keys(err.fieldErrors).length) {
        setErrors(err.fieldErrors as Errors)
        focusFirstInvalid(formRef)
      } else if (err instanceof ApiError && err.status === 429) {
        setError('Too many requests from this connection. Please try again in an hour.')
      } else if (err instanceof ApiError && (err.status === 0 || err.status >= 502)) {
        setError('We could not reach the server. It may be waking up, so try again in a few seconds.')
      } else {
        setError(errorMessage(err))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    // minHeight keeps the card the size of the form while the confirmation is shown, so nothing below it jumps
    <div ref={cardRef} style={{ minHeight: sent ? held : undefined }} className="flex flex-col overflow-hidden rounded-[1.75rem] border-2 border-(--lp-ink) bg-white shadow-[6px_6px_0_0_var(--lp-ink)]">
      <AnimatePresence mode="wait" initial={false}>
        {sent ? (
          <motion.div key="sent" className="flex flex-1 flex-col justify-center" initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease: EASE }}>
            <Sent request={sent} onReset={() => setSent(null)} />
          </motion.div>
        ) : (
          <motion.div key="form" initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            {/* slanted colour header, the same cut as the demo desk cards */}
            <div className="flex items-center justify-between gap-3 bg-(--lp-violet) px-6 pt-5 pb-8 text-white sm:px-8 lg:pb-9" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 78%, 0 100%)' }}>
              <div className="flex items-center gap-3.5">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                  <Send className="size-6" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="text-[1.35rem] leading-tight font-semibold tracking-[-0.03em] sm:text-2xl">Tell us about your team</h3>
              </div>
              <span className="hidden shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold tracking-[0.05em] text-(--lp-ink) uppercase sm:block">Takes a minute</span>
            </div>

            <form ref={formRef} onSubmit={submit} noValidate className="space-y-4 px-6 pt-6 pb-6 sm:px-8 sm:pt-7 sm:pb-8">
              {error && (
                <p role="alert" className="flex items-start gap-2 rounded-2xl border-2 border-[#c4321c]/30 bg-[#fff0ec] px-4 py-3 text-sm font-semibold text-[#a3260f]">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
                </p>
              )}
              {/* who is asking: one row on desktop, two by two on tablets, a single column on phones */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <TextInput label="Your name" name="name" autoComplete="name" maxLength={150} value={form.full_name} onChange={set('full_name')} error={errors.full_name} />
                <TextInput label="Work email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="you@company.com" maxLength={254} value={form.email} onChange={set('email')} error={errors.email} />
                <TextInput label="Company" name="organization" autoComplete="organization" maxLength={150} value={form.company} onChange={set('company')} error={errors.company} />
                <TextInput label="Team size" name="team-size" optional placeholder="e.g. 8 agents" maxLength={60} value={form.team_size} onChange={set('team_size')} error={errors.team_size} />
              </div>
              <Field label="What do you need?" error={errors.message}>
                {(p) => (
                  <textarea {...p} name="message" rows={4} maxLength={2000} placeholder="What you support, roughly how many tickets, and when you want to start." value={form.message} onChange={set('message')} className={cn(control, 'block min-h-[7.5rem] resize-y py-3 leading-relaxed')} />
                )}
              </Field>
              <div className="flex justify-end pt-1">
                <button type="submit" disabled={busy} className={cn(lpBtnPrimary, 'h-14 w-full justify-between gap-6 py-1.5 pr-1.5 pl-6 text-[0.95rem] sm:w-auto sm:min-w-72')}>
                  <span className="flex items-center gap-2">
                    {busy && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
                    {busy ? 'Sending…' : 'Send request'}
                  </span>
                  <LpBtnIcon tone="lime" className="size-10">
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </LpBtnIcon>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** "Request a workspace": there is no self-serve signup, so teams ask for a workspace of their own here. Stacked like the demo section: headline, the three steps in a row, then the form across the full width. */
export function Request() {
  return (
    <section id="request" data-nav="light" className="relative -mt-10 rounded-t-[2.5rem] bg-(--lp-request) pb-28 text-(--lp-ink) sm:pb-32">
      <div className="relative mx-auto max-w-6xl px-5 pt-24 sm:px-8 sm:pt-32">
        <h2 className="max-w-4xl text-[clamp(2.6rem,7.4vw,6rem)] leading-[0.94] font-semibold tracking-[-0.05em] text-balance">
          <WordReveal text="Want one for your own team?" />
        </h2>
        <p className="mt-5 max-w-xl text-lg font-medium text-(--lp-ink)/80">Workspaces are set up by request. Tell us about your team and we will build one around you.</p>

        <ol className="mt-10 grid md:grid-cols-3 md:gap-x-8">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4 border-t-2 border-(--lp-ink)/15 py-4 md:pb-0">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--lp-ink) text-sm font-bold text-white tabular-nums" aria-hidden>
                {i + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-lg leading-snug font-semibold tracking-[-0.02em]">{s.title}</p>
                <p className="mt-0.5 text-[15px] leading-relaxed text-(--lp-ink)/75">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <Reveal className="mt-8 md:mt-12">
          <RequestForm />
        </Reveal>
      </div>
    </section>
  )
}
