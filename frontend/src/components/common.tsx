import { LifeBuoy } from 'lucide-react'
import type { ReactNode } from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDateTime, relativeTime } from '@/lib/format'
import { useConnectionState } from '@/realtime/RealtimeProvider'
import { cn } from '@/lib/utils'

export function Logo({ subtitle, name = 'Helpdesk AI' }: { subtitle?: string; name?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <LifeBuoy className="size-4" />
      </div>
      <div className="leading-tight">
        <p className="max-w-40 truncate text-sm font-semibold tracking-tight">{name}</p>
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

const STAT_ACCENTS = {
  default: { tile: 'bg-muted text-muted-foreground', value: '' },
  green: { tile: 'bg-emerald-100 text-emerald-700', value: '' },
  blue: { tile: 'bg-sky-100 text-sky-700', value: '' },
  violet: { tile: 'bg-violet-100 text-violet-700', value: '' },
  amber: { tile: 'bg-amber-100 text-amber-700', value: 'text-amber-700' },
  red: { tile: 'bg-red-100 text-red-700', value: 'text-red-700' },
} as const

export function Stat({ label, value, hint, icon, tone, accent = 'default' }: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  tone?: 'default' | 'warning' | 'danger' | 'success'
  accent?: keyof typeof STAT_ACCENTS
}) {
  const resolved = tone === 'warning' ? 'amber' : tone === 'danger' ? 'red' : tone === 'success' ? 'green' : accent
  const a = STAT_ACCENTS[resolved]
  return (
    <div className="rounded-2xl border bg-card p-3.5 shadow-xs sm:p-5">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <p className="text-[10px] leading-tight font-semibold tracking-wide text-muted-foreground uppercase sm:text-xs">{label}</p>
        {icon && <span className={cn('hidden size-9 items-center justify-center rounded-xl sm:flex', a.tile)}>{icon}</span>}
      </div>
      <p className={cn('mt-1 text-xl font-semibold tracking-tight sm:text-2xl', a.value)}>{value}</p>
      {hint && <p className="mt-1.5 hidden text-xs text-muted-foreground sm:block">{hint}</p>}
    </div>
  )
}
