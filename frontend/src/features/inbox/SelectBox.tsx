import { Check, Minus } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * A select button that fills with the accent colour and a check when chosen. A real checkbox for assistive tech.
 * `round` (default) is for cards, `square` for table rows. `onCanvas` paints the empty state in the page colour, for a button
 * that sits half outside a card; otherwise it is white.
 */
export function SelectBox({ checked, onChange, label, className, disabled, shape = 'round', onCanvas = false }: { checked: boolean | 'mixed'; onChange: () => void; label: string; className?: string; disabled?: boolean; shape?: 'round' | 'square'; onCanvas?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={cn(
        'flex size-7 items-center justify-center border-2 transition-colors focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none disabled:opacity-40',
        shape === 'round' ? 'rounded-full shadow-sm' : 'rounded-md',
        checked ? 'border-violet bg-violet text-canvas' : cn('border-line-strong text-transparent hover:border-violet hover:text-violet', onCanvas ? 'bg-canvas' : 'bg-surface'),
        className,
      )}
    >
      {checked === 'mixed' ? <Minus className="size-4" strokeWidth={3} aria-hidden /> : <Check className="size-4" strokeWidth={3} aria-hidden />}
    </button>
  )
}
