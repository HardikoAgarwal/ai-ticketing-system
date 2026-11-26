import { Check, Minus } from 'lucide-react'

import { cn } from '@/lib/utils'

/** A clean select box: an empty rounded square that fills solid with a check when chosen. A real checkbox for assistive tech. */
export function SelectBox({ checked, onChange, label, className, disabled }: { checked: boolean | 'mixed'; onChange: () => void; label: string; className?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={cn(
        'flex size-7 items-center justify-center rounded-control border-2 transition-colors disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none',
        checked ? 'border-ink bg-ink text-canvas' : 'border-line-strong bg-surface text-transparent hover:border-ink hover:text-ink-3',
        className,
      )}
    >
      {checked === 'mixed' ? <Minus className="size-4" strokeWidth={3} aria-hidden /> : <Check className="size-4" strokeWidth={3} aria-hidden />}
    </button>
  )
}
