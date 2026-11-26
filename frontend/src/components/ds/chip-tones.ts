export type ChipTone = 'green' | 'amber' | 'red' | 'blue' | 'violet' | 'peach' | 'slate' | 'ai'

/** Pastel tint + matching border + deep text. Colours come from tokens, so dark mode is automatic. */
export const CHIP_TONES: Record<ChipTone, string> = {
  green: 'bg-mint border-mint-line text-mint-ink',
  amber: 'bg-butter border-butter-line text-butter-ink',
  red: 'bg-rose border-rose-line text-rose-ink',
  blue: 'bg-sky border-sky-line text-sky-ink',
  violet: 'bg-lav border-lav-line text-lav-ink',
  peach: 'bg-peach border-peach-line text-peach-ink',
  slate: 'bg-sunken border-line text-ink-2',
  ai: 'bg-lav border-lav-line text-lav-ink',
}
