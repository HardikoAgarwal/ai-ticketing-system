import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

const HUES = [
  'bg-lav text-lav-ink border-lav-line',
  'bg-mint text-mint-ink border-mint-line',
  'bg-peach text-peach-ink border-peach-line',
  'bg-butter text-butter-ink border-butter-line',
  'bg-rose text-rose-ink border-rose-line',
  'bg-sky text-sky-ink border-sky-line',
]
const SIZES = {
  xs: 'size-5 text-[9px] rounded-md',
  sm: 'size-6 text-[10px] rounded-md',
  md: 'size-8 text-xs rounded-control',
  lg: 'size-10 text-sm rounded-control',
  xl: 'size-14 text-lg rounded-panel',
} as const

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/** Initials tile with a stable pastel per name. `shape="circle"` only for presence-style uses. Decorative: the name is always shown beside it. */
export function Avatar({ name, src, size = 'md', shape = 'squircle', className }: { name?: string; src?: string | null; size?: keyof typeof SIZES; shape?: 'squircle' | 'circle'; className?: string }) {
  const hue = HUES[hash(name ?? '?') % HUES.length]
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden border font-semibold select-none', SIZES[size], shape === 'circle' && 'rounded-full', !src && hue, className)}
    >
      {src ? <img src={src} alt="" className="size-full object-cover" /> : initials(name)}
    </span>
  )
}
