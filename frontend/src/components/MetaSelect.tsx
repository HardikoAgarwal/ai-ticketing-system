import { Sparkles, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Tone } from '@/lib/constants'
import { cn } from '@/lib/utils'

export interface MetaOption {
  value: string
  label: string
  tone?: Tone
  icon?: LucideIcon
  hint?: string
  /** Marks the option the AI picked: a small aurora tag in the list, mirrored onto the trigger while selected. */
  ai?: boolean
}

/** Select whose trigger and items are colored by the selected value's tone. */
export function MetaSelect({
  value,
  onChange,
  options,
  placeholder,
  anyLabel,
  disabled,
  size = 'default',
  className,
  prefix,
  plain,
  ariaLabel,
}: {
  value: string | null
  onChange: (value: string | null) => void
  options: MetaOption[]
  placeholder?: string
  /** When set, adds a "clear" option with this label and emits null for it. */
  anyLabel?: string
  disabled?: boolean
  size?: 'sm' | 'default'
  className?: string
  prefix?: ReactNode
  /** Keep the trigger neutral; only the option icon carries color. */
  plain?: boolean
  /** Accessible name when the visible label is not a <label> for this control. */
  ariaLabel?: string
}) {
  const ANY = '__any__'
  const selected = options.find((o) => o.value === value)
  return (
    <Select value={value ?? (anyLabel ? ANY : undefined)} onValueChange={(v) => onChange(v === ANY ? null : v)} disabled={disabled}>
      <SelectTrigger
        size={size}
        aria-label={ariaLabel}
        className={cn('min-w-36 font-medium', selected?.tone && !plain ? selected.tone.tint : 'text-foreground', className)}
      >
        {prefix && !selected && <span className="text-muted-foreground">{prefix}</span>}
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" align="start">
        {anyLabel && (
          <SelectItem value={ANY} className="text-muted-foreground">
            {anyLabel}
          </SelectItem>
        )}
        {options.map((o) => {
          const Icon = o.tone?.icon ?? o.icon
          return (
            <SelectItem key={o.value} value={o.value}>
              {Icon && <Icon className={cn('size-4', o.tone?.iconClass ?? 'text-muted-foreground')} />}
              {/* On the trigger (inside select-value) the label gives way: it truncates so the AI tag always stays whole. */}
              <span className="font-medium in-data-[slot=select-value]:min-w-0 in-data-[slot=select-value]:truncate">{o.label}</span>
              {o.hint && <span className="ml-1 text-xs font-normal text-muted-foreground">{o.hint}</span>}
              {o.ai && (
                <span className="ai-border inline-flex shrink-0 items-center gap-1 rounded-[6px] bg-surface px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-lav-ink in-data-[slot=select-value]:px-1.5">
                  <Sparkles className="size-3 text-ai" aria-hidden /> AI
                  {/* The full phrase fits in the list; the trigger keeps "AI" and drops "suggested" so it stays short. */}
                  <span className="in-data-[slot=select-value]:hidden">suggested</span>
                </span>
              )}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
