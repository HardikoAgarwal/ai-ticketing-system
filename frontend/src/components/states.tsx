import { AlertTriangle, Loader2, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
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
    <div className={cn('flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-12 text-center', className)}>
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Icon className="size-5" />
      </div>
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/50 px-6 py-10 text-center', className)}>
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
