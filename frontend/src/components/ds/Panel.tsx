import type { LucideIcon } from 'lucide-react'
import type { ComponentProps, ElementType, ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** The one container: surface, hairline border, 14px radius, warm shadow. Do not stack panels inside panels; use Section. */
export function Panel({ as, tone = 'default', padded = false, className, ...rest }: { as?: ElementType; tone?: 'default' | 'sunken'; padded?: boolean } & ComponentProps<'div'>) {
  const Comp = (as ?? 'section') as ElementType
  return (
    <Comp
      className={cn('rounded-panel border border-line', tone === 'default' ? 'bg-surface shadow-panel' : 'bg-surface-2', padded && 'p-5', className)}
      {...rest}
    />
  )
}

export function PanelHeader({ title, description, icon: Icon, actions, divided = true, headingLevel: H = 'h2', className }: {
  title: ReactNode
  description?: ReactNode
  icon?: LucideIcon
  actions?: ReactNode
  divided?: boolean
  headingLevel?: 'h1' | 'h2' | 'h3'
  className?: string
}) {
  return (
    <div className={cn('flex items-start gap-3 px-5 py-4', divided && 'border-b border-line', className)}>
      {Icon && (
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-control bg-sunken text-ink-2">
          <Icon className="size-4" aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <H className="text-[15px] leading-6 font-semibold tracking-tight text-ink">{title}</H>
        {description && <p className="mt-0.5 text-[13px] leading-5 text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

/** A titled block inside a panel or page, separated by a hairline from the previous one. */
export function Section({ title, description, actions, children, className, first = false }: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  first?: boolean
}) {
  return (
    <section className={cn('px-5 py-5', !first && 'border-t border-line', className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase">{title}</h3>
          {description && <p className="mt-1 text-[13px] text-ink-3">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

/** One label/value pair. Use inside <KeyValueList>. */
export function KeyValue({ label, children, icon: Icon, className }: { label: ReactNode; children: ReactNode; icon?: LucideIcon; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-3">
        {Icon && <Icon className="size-3.5" aria-hidden />}
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium break-words text-ink">{children}</dd>
    </div>
  )
}

export function KeyValueList({ children, columns = 2, className }: { children: ReactNode; columns?: 1 | 2 | 3 | 4; className?: string }) {
  const cols = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-2 sm:grid-cols-3', 4: 'grid-cols-2 lg:grid-cols-4' }[columns]
  return <dl className={cn('grid gap-x-6 gap-y-4', cols, className)}>{children}</dl>
}

const STAT_TONES = {
  default: 'bg-sunken text-ink-2',
  violet: 'bg-lav text-lav-ink',
  green: 'bg-mint text-mint-ink',
  amber: 'bg-butter text-butter-ink',
  red: 'bg-rose text-rose-ink',
  blue: 'bg-sky text-sky-ink',
  peach: 'bg-peach text-peach-ink',
} as const

/** Big number with an icon tile and a hint line. Pass `onClick` to make it a button (e.g. KPI filters). */
export function Stat({ label, value, hint, icon: Icon, tone = 'default', onClick, active, className }: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  tone?: keyof typeof STAT_TONES
  onClick?: () => void
  active?: boolean
  className?: string
}) {
  const body = (
    <>
      {Icon && (
        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-control', STAT_TONES[tone])}>
          <Icon className="size-[18px]" aria-hidden />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-ink-3">{label}</span>
        <span className="mt-0.5 block text-2xl leading-8 font-semibold tracking-tight text-ink tabular-nums">{value}</span>
        {hint && <span className="mt-0.5 block text-xs text-ink-3">{hint}</span>}
      </span>
    </>
  )
  const cls = cn(
    'flex items-start gap-3 rounded-panel border border-line bg-surface p-4 text-left shadow-card',
    onClick && 'w-full cursor-pointer transition-colors hover:bg-surface-2',
    active && 'border-violet bg-violet-soft/50 hover:bg-violet-soft/50',
    className,
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={active} className={cls}>
        {body}
      </button>
    )
  }
  return <div className={cls}>{body}</div>
}
