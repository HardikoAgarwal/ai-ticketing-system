/** Lightens a theme colour toward the surface so large fills stay soft in both themes. */
const soft = (v: string) => `color-mix(in srgb, ${v} 62%, var(--surface))`

/** Colours come from CSS variables so every chart follows the light and dark themes. */
export const CHART = {
  opened: 'var(--chart-2)',
  resolved: 'var(--chart-1)',
  grid: 'var(--line)',
  axis: 'var(--ink-3)',
  priority: { CRITICAL: soft('var(--rose-ink)'), HIGH: soft('var(--peach-ink)'), MEDIUM: soft('var(--butter-ink)'), LOW: soft('var(--ink-3)') },
  sentiment: { NEGATIVE: soft('var(--rose-ink)'), NEUTRAL: soft('var(--ink-3)'), POSITIVE: soft('var(--mint-ink)') },
  series: ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'],
} as const

export const TOOLTIP = {
  contentStyle: { background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 10, boxShadow: 'var(--shadow-pop)', color: 'var(--ink)', fontSize: 12, padding: '8px 10px' },
  labelStyle: { color: 'var(--ink-3)', marginBottom: 2 },
  itemStyle: { color: 'var(--ink)' },
  cursor: { fill: 'var(--sunken)', opacity: 0.6 },
}

export const AXIS = { fontSize: 11, tickLine: false as const, axisLine: false as const, tick: { fill: CHART.axis } }
