import { AlertTriangle, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

import { AiSurface } from './AiSurface'

/** Placeholder block. Honours reduced motion. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-control bg-sunken motion-reduce:animate-none', className)} />
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3.5', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}

/** List-row skeleton: avatar + two lines. Announces loading to assistive tech once. */
export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" aria-label="Loading" className={cn('space-y-2', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-panel border border-line bg-surface p-4">
          <Skeleton className="size-9 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-4/5" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action, tone = 'plain', className }: {
  icon: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  /** `ai` wraps the state in the aurora surface (AI-related empty states). */
  tone?: 'plain' | 'ai'
  className?: string
}) {
  const body = (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className={cn('mb-4 flex size-12 items-center justify-center rounded-panel', tone === 'ai' ? 'bg-lav text-ai' : 'bg-sunken text-ink-2')}>
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="text-base font-semibold tracking-tight text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-3">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
  if (tone === 'ai') return <AiSurface tone="quiet" className={className}>{body}</AiSurface>
  return <div className={cn('rounded-panel border border-dashed border-line-strong bg-surface-2', className)}>{body}</div>
}

export function ErrorState({ error, title = "We couldn't load this", onRetry, className }: { error?: unknown; title?: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center rounded-panel border border-rose-line bg-rose px-6 py-10 text-center', className)}>
      <AlertTriangle className="mb-2 size-5 text-rose-ink" aria-hidden />
      <p className="font-semibold text-rose-ink">{title}</p>
      {error !== undefined && <p className="mt-1 max-w-sm text-sm text-rose-ink/85">{errorMessage(error)}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
