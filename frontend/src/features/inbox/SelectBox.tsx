import { Check, Minus } from 'lucide-react'

import { cn } from '@/lib/utils'

/** A round select button: an empty white circle that fills with the accent colour and a check when chosen. A real checkbox for assistive tech. */
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
        'flex size-7 items-center justify-center rounded-full border-2 shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none disabled:opacity-40',
        checked ? 'border-violet bg-violet text-canvas' : 'border-line-strong bg-surface text-transparent hover:border-violet hover:text-violet',
        className,
      )}
    >
      {checked === 'mixed' ? <Minus className="size-4" strokeWidth={3} aria-hidden /> : <Check className="size-4" strokeWidth={3} aria-hidden />}
    </button>
  )
}
