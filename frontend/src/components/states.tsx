import { AlertTriangle, Loader2, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

export function FullPageLoader() {
  return (
    <div role="status" aria-label="Loading" className="relative flex min-h-dvh flex-col items-center justify-center gap-4 overflow-hidden bg-canvas text-ink">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-20 left-1/3 size-64 rounded-full bg-lav/70 blur-3xl" />
        <div className="absolute right-1/4 bottom-16 size-52 rounded-full bg-mint/60 blur-3xl" />
      </div>
      <span className="relative flex size-12 items-center justify-center rounded-2xl bg-lav text-lav-ink ring-1 ring-lav-line">
        <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden />
      </span>
      <span className="relative text-sm font-medium text-ink-2">Loading workspace…</span>
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center shadow-xs', className)}>
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground ring-8 ring-accent/40">
        <Icon className="size-5" />
      </div>
      <p className="text-base font-semibold tracking-tight">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/60 px-6 py-12 text-center', className)}>
      <AlertTriangle className="mb-2 size-5 text-red-600" />
      <p className="font-medium text-red-900">We couldn't load this</p>
      <p className="mt-1 max-w-sm text-sm text-red-800/80">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function CardGridSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-44 rounded-xl" />
      ))}
    </div>
  )
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-lg" />
      ))}
    </div>
  )
}
