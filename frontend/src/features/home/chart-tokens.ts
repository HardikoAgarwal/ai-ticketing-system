/** The hues a chart may use. Each maps to a token pair, so everything follows the light and dark themes. */
export const HUE = {
  rose: 'var(--rose-ink)',
  peach: 'var(--peach-ink)',
  butter: 'var(--butter-ink)',
  mint: 'var(--mint-ink)',
  sky: 'var(--sky-ink)',
  lav: 'var(--lav-ink)',
  slate: 'var(--ink-3)',
} as const
export type Hue = keyof typeof HUE

/** A hue blended into the surface: `pct` 30 gives a soft fill that dark text sits on, 70 gives a solid slice. */
export const mix = (hue: Hue, pct: number) => `color-mix(in srgb, ${HUE[hue]} ${pct}%, var(--surface))`

/** Saturated versions for slices and columns, taken from the chart palette. */
export const SOLID: Record<Hue, string> = {
  rose: 'var(--chart-4)',
  peach: 'color-mix(in srgb, var(--chart-2) 55%, var(--chart-4))',
  butter: 'var(--chart-2)',
  mint: 'var(--chart-1)',
  sky: 'var(--chart-5)',
  lav: 'var(--chart-3)',
  slate: 'color-mix(in srgb, var(--ink-3) 65%, var(--surface))',
}

export const PRIORITY_HUE: Record<string, Hue> = { CRITICAL: 'rose', HIGH: 'peach', MEDIUM: 'butter', LOW: 'slate' }
export const SENTIMENT_HUE: Record<string, Hue> = { NEGATIVE: 'rose', NEUTRAL: 'slate', POSITIVE: 'mint' }
export const CATEGORY_HUES: Hue[] = ['mint', 'lav', 'peach', 'sky', 'rose', 'butter']

export const CHART = {
  opened: 'var(--chart-2)',
  resolved: 'var(--chart-1)',
  grid: 'var(--line)',
  axis: 'var(--ink-3)',
} as const

export const TOOLTIP = {
  contentStyle: { background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 10, boxShadow: 'var(--shadow-pop)', color: 'var(--ink)', fontSize: 12, padding: '8px 10px' },
  labelStyle: { color: 'var(--ink-3)', marginBottom: 2 },
  itemStyle: { color: 'var(--ink)' },
  cursor: { fill: 'var(--sunken)', opacity: 0.6 },
}

export const AXIS = { fontSize: 12, tickLine: false as const, axisLine: false as const, tick: { fill: CHART.axis } }
