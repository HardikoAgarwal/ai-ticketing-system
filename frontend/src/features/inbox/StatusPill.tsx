import { fill, type Hue } from '@/components/ds'

/** A quiet status label for tables: a small coloured dot and plain words in a neutral outline, so a long list is not a wall of colour. */
export function StatusPill({ hue, children }: { hue: Hue; children: string }) {
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-chip border border-line-strong bg-surface px-2.5 text-xs font-semibold whitespace-nowrap text-ink-2">
      <span className="size-2 rounded-full" style={{ background: fill(hue) }} aria-hidden />
      {children}
    </span>
  )
}
