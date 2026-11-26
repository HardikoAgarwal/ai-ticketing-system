export { fill, on, type Hue } from '@/components/ds/viz'
import type { Hue } from '@/components/ds/viz'

export const PRIORITY_HUE: Record<string, Hue> = { CRITICAL: 'rose', HIGH: 'peach', MEDIUM: 'butter', LOW: 'slate' }
export const SENTIMENT_HUE: Record<string, Hue> = { NEGATIVE: 'rose', NEUTRAL: 'slate', POSITIVE: 'mint' }

export const CATEGORY_HUES: Hue[] = ['mint', 'lav', 'peach', 'sky', 'rose', 'butter']

export const CHART = {
  opened: 'var(--viz-slate)',
  resolved: 'var(--viz-mint)',
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
