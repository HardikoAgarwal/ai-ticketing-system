import { Leaf } from 'lucide-react'
import type { ReactNode } from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDateTime, relativeTime } from '@/lib/format'
import { useConnectionState } from '@/realtime/RealtimeProvider'
import { cn } from '@/lib/utils'

export function Logo({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Leaf className="size-4" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-tight">BookLeaf</p>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  )
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function RelativeTime({ value, className }: { value: string | null | undefined; className?: string }) {
  if (!value) return <span className={className}>—</span>
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time dateTime={value} className={cn('whitespace-nowrap', className)}>
          {relativeTime(value)}
        </time>
      </TooltipTrigger>
      <TooltipContent>{formatDateTime(value)}</TooltipContent>
    </Tooltip>
  )
}

export function ConnectionIndicator() {
  const state = useConnectionState()
  const meta = {
    live: { label: 'Live', dot: 'bg-emerald-500', hint: 'Updates appear instantly' },
    connecting: { label: 'Connecting…', dot: 'bg-amber-400 animate-pulse', hint: 'Establishing live connection' },
    offline: { label: 'Reconnecting…', dot: 'bg-zinc-400', hint: 'Live updates paused; refreshing every 15s' },
  }[state]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground">
          <span className={cn('size-2 rounded-full', meta.dot)} />
          {meta.label}
        </span>
      </TooltipTrigger>
      <TooltipContent>{meta.hint}</TooltipContent>
    </Tooltip>
  )
}

export function Stat({ label, value, hint, icon, tone = 'default' }: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  tone?: 'default' | 'warning' | 'danger' | 'success'
}) {
  const toneClass = {
    default: '',
    warning: 'text-amber-700',
    danger: 'text-red-700',
    success: 'text-emerald-700',
  }[tone]
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        {label}
        {icon}
      </div>
      <p className={cn('mt-2 text-2xl font-semibold tracking-tight', toneClass)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
