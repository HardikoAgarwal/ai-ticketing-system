import { AlertTriangle, Check, Loader2, Lock, RotateCcw, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

/** One settings section: a title block, then rows separated by hairlines. No card chrome. */
export function SettingsSection({ id, icon: Icon, title, description, actions, children }: { id: string; icon: LucideIcon; title: string; description: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`}>
      <header className="flex items-start gap-4 pb-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-sunken text-ink-2">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-h`} className="text-xl leading-7 font-semibold tracking-tight text-ink">
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-2">{description}</p>
        </div>
        {actions}
      </header>
      <div className="divide-y divide-line border-y border-line [&>*]:py-6">{children}</div>
    </section>
  )
}

/** One setting: label and explanation on the left, control on the right. `stack` puts a wide control underneath. */
export function Row({ label, htmlFor, hint, children, stack, className }: { label: ReactNode; htmlFor?: string; hint?: ReactNode; children: ReactNode; stack?: boolean; className?: string }) {
  return (
    <div className={cn('grid gap-x-10 gap-y-3', stack ? 'grid-cols-1' : 'md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]', className)}>
      <div>
        <Label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
          {label}
        </Label>
        {hint && <p className="mt-1 text-[13px] leading-5 text-ink-2">{hint}</p>}
      </div>
      <div className="min-w-0 space-y-2">{children}</div>
    </div>
  )
}

export function ReadOnlyNote({ children }: { children?: ReactNode }) {
  return (
    <p className="mb-6 flex items-center gap-2.5 rounded-control border border-line bg-surface-2 px-4 py-3 text-sm text-ink-2">
      <Lock className="size-4 shrink-0" aria-hidden />
      {children ?? 'You can view these settings. Only workspace owners and admins can change them.'}
    </p>
  )
}

/**
 * Sticky save bar with four states: unsaved changes, saving, saved (flashes for a moment), and error with retry.
 * Hidden when there is nothing to say. The region is announced politely.
 */
export function SaveBar({ dirty, saving, saved, error, disabled, onSave, onDiscard }: { dirty: boolean; saving: boolean; saved: boolean; error: unknown; disabled?: boolean; onSave: () => void; onDiscard: () => void }) {
  const failed = !!error && dirty && !saving
  const visible = dirty || saving || saved
  return (
    <div className={cn('pointer-events-none sticky bottom-4 z-30 mt-8 flex justify-center transition-all duration-200 motion-reduce:transition-none', visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0')}>
      <div
        role="status"
        aria-live="polite"
        className={cn('flex w-full max-w-xl items-center gap-3 rounded-panel border bg-surface py-2.5 pr-2.5 pl-4 shadow-pop', failed ? 'border-rose-line' : 'border-line-strong', visible && 'pointer-events-auto')}
      >
        {saving ? <Loader2 className="size-4 animate-spin text-violet" aria-hidden /> : failed ? <AlertTriangle className="size-4 text-rose-ink" aria-hidden /> : dirty ? <span className="size-2 rounded-full bg-butter-ink" aria-hidden /> : <Check className="size-4 text-mint-ink" aria-hidden />}
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
          {saving ? 'Saving…' : failed ? `Couldn't save: ${errorMessage(error)}` : dirty ? 'You have unsaved changes' : 'All changes saved'}
        </p>
        {(dirty || saving) && (
          <>
            <Button variant="ghost" size="sm" onClick={onDiscard} disabled={saving} tabIndex={visible ? 0 : -1}>
              <RotateCcw /> Discard
            </Button>
            <Button size="sm" onClick={onSave} disabled={saving || disabled} tabIndex={visible ? 0 : -1}>
              {failed ? 'Retry' : 'Save changes'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
