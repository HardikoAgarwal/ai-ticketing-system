import { AlertTriangle, Check, Info, Loader2, Lock, RotateCcw, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Panel } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * One card of related settings: a title and a line of explanation on top, then the settings stacked with space between them (no divider lines inside a card). A settings page is a
 * short stack of these, so each tab reads as a few clearly named groups instead of one long list.
 */
export function SettingsCard({ icon: Icon, title, description, actions, children, className }: { icon: LucideIcon; title: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Panel as="section" className={className}>
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 rounded-t-panel border-b border-line-strong bg-sunken px-6 py-5">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-surface text-ink shadow-card ring-1 ring-line" aria-hidden>
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg leading-6 font-semibold tracking-tight text-ink">{title}</h2>
            {description && <p className="mt-0.5 max-w-2xl text-sm leading-6 text-ink-2">{description}</p>}
          </div>
        </div>
        {actions}
      </header>
      <div className="space-y-7 p-6">{children}</div>
    </Panel>
  )
}

/** A small (i) next to a label. The explanation shows on hover or keyboard focus, so the page itself stays quiet. */
export function InfoTip({ children }: { children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label="More information" className="inline-flex size-5 items-center justify-center rounded-full text-ink-3 transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none">
          <Info className="size-4" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs px-3 py-2 text-[13px] leading-5">
        {children}
      </TooltipContent>
    </Tooltip>
  )
}

/** One setting: only the label sits outside the field; its explanation is an (i) beside the label that shows on hover. */
export function Row({ label, htmlFor, hint, children, className }: { label: ReactNode; htmlFor?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-2.5', className)}>
      <div className="flex items-center gap-1.5">
        <Label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
          {label}
        </Label>
        {hint && <InfoTip>{hint}</InfoTip>}
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
