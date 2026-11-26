import { cn } from '@/lib/utils'

import { isMac, modLabel } from './platform'

const PRETTY: Record<string, string> = { mod: modLabel, shift: '⇧', alt: isMac ? '⌥' : 'Alt', enter: '↵', esc: 'Esc', up: '↑', down: '↓' }

/** A keyboard key cap. Pass `keys="mod+k"` for a combo (rendered as separate caps) or children for a single label. */
export function Kbd({ keys, className, children }: { keys?: string; className?: string; children?: React.ReactNode }) {
  const cap = 'inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-line-strong bg-surface-2 px-1.5 font-sans text-[11px] leading-none font-medium text-ink-2 shadow-[0_1px_0_var(--line-strong)]'
  if (keys) {
    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        {keys.split(/[+ ]/).map((k, i) => (
          <kbd key={i} className={cap}>
            {PRETTY[k.toLowerCase()] ?? k.toUpperCase()}
          </kbd>
        ))}
      </span>
    )
  }
  return <kbd className={cn(cap, className)}>{children}</kbd>
}
