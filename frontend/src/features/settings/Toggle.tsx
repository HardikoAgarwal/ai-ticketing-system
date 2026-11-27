import { fill, on } from '@/components/ds'
import { cn } from '@/lib/utils'

/**
 * A proper on/off switch: a rounded track with a sliding knob and the word ON or OFF written inside it. On is the theme green, off is a quiet
 * grey. It is a real `role="switch"` button, so it works with the keyboard and screen readers.
 */
export function Toggle({ checked, onChange, disabled, label, id }: { checked: boolean; onChange: (next: boolean) => void; disabled?: boolean; label: string; id?: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-9 w-[4.5rem] shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60',
        checked ? 'border-transparent' : 'border-line-strong bg-sunken',
      )}
      style={checked ? { background: fill('mint'), color: on('mint') } : undefined}
    >
      <span className={cn('absolute text-[11px] font-bold tracking-wider transition-opacity duration-200', checked ? 'left-3.5' : 'right-3.5 text-ink-3')} aria-hidden>
        {checked ? 'ON' : 'OFF'}
      </span>
      <span className={cn('absolute left-1 size-7 rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform duration-200 ease-out motion-reduce:transition-none', checked ? 'translate-x-[34px]' : 'translate-x-0')} aria-hidden />
    </button>
  )
}
