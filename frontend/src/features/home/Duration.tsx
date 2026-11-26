import { cn } from '@/lib/utils'

/** "26h 30m" as big digits with small units: <1h in minutes, <1 day in hours and minutes, longer in days and hours. */
export function Duration({ minutes, className, unitClassName }: { minutes: number | null | undefined; className?: string; unitClassName?: string }) {
  if (minutes === null || minutes === undefined) return <span className={className}>—</span>
  const total = Math.max(0, Math.round(minutes))
  const parts: [number, string][] =
    total < 60 ? [[total, 'm']] : total < 1440 ? [[Math.floor(total / 60), 'h'], [total % 60, 'm']] : [[Math.floor(total / 1440), 'd'], [Math.round((total % 1440) / 60), 'h']]
  const shown = parts.filter(([n], i) => i === 0 || n > 0)
  return (
    <span className={cn('tabular-nums', className)}>
      {shown.map(([n, u]) => (
        <span key={u}>
          {n}
          <span className={cn('mr-1.5 ml-0.5 text-[0.55em] font-medium text-ink-2', unitClassName)}>{u}</span>
        </span>
      ))}
    </span>
  )
}
