import { Lock, Loader2, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/** A settings section: a plain heading, then rows separated by hairlines. No card chrome. */
export function Section({ id, icon: Icon, title, description, children, aside }: { id: string; icon: typeof Lock; title: string; description: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`}>
      <header className="flex items-start gap-4 border-b pb-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-h`} className="text-xl font-semibold tracking-tight">
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {aside}
      </header>
      <div className="divide-y [&>*]:py-6">{children}</div>
    </section>
  )
}

/** One setting row: label and explanation on the left, control on the right. `stack` puts a wide control underneath. */
export function Field({ label, htmlFor, hint, children, className, stack }: { label: string; htmlFor?: string; hint?: ReactNode; children: ReactNode; className?: string; stack?: boolean }) {
  return (
    <div className={cn('grid gap-x-10 gap-y-2.5', stack ? 'grid-cols-1' : 'md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]', className)}>
      <div>
        <Label htmlFor={htmlFor} className="text-sm font-semibold">
          {label}
        </Label>
        {hint && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      </div>
      <div className="min-w-0 space-y-1.5">{children}</div>
    </div>
  )
}

export function ReadOnlyBanner({ children }: { children?: ReactNode }) {
  return (
    <p className="mb-5 flex items-center gap-2.5 rounded-lg bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
      <Lock className="size-4 shrink-0" />
      {children ?? 'You can view these settings. Only workspace owners and admins can change them.'}
    </p>
  )
}

/** Floating "unsaved changes" bar shared by the workspace-level sections. */
export function SaveBar({ visible, saving, onSave, onDiscard, disabled }: { visible: boolean; saving: boolean; onSave: () => void; onDiscard: () => void; disabled?: boolean }) {
  return (
    <div
      role="region"
      aria-label="Unsaved changes"
      aria-hidden={!visible}
      className={cn('pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 transition-all duration-300', visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0')}
    >
      <div className={cn('flex w-full max-w-lg items-center gap-3 rounded-2xl border bg-popover/95 py-2.5 pr-2.5 pl-4 shadow-xl backdrop-blur', visible && 'pointer-events-auto')}>
        <span className="size-2 shrink-0 rounded-full bg-amber-500" />
        <p className="flex-1 text-sm font-medium whitespace-nowrap">You have unsaved changes</p>
        <Button variant="ghost" size="sm" onClick={onDiscard} disabled={saving || !visible} tabIndex={visible ? 0 : -1}>
          <RotateCcw /> Discard
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving || disabled || !visible} tabIndex={visible ? 0 : -1}>
          {saving && <Loader2 className="animate-spin" />} Save changes
        </Button>
      </div>
    </div>
  )
}
