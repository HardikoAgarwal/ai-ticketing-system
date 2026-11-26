/**
 * The solid colours used for charts, stat tiles and chips: each hue is a saturated fill (`--viz-*`) with the text colour that
 * sits on it (`--on-*`). Defined for light and dark in index.css. Use these instead of the faded pastel tints wherever a colour carries meaning.
 */
export type Hue = 'rose' | 'peach' | 'butter' | 'mint' | 'sky' | 'lav' | 'slate'

export const fill = (h: Hue) => `var(--viz-${h})`
export const on = (h: Hue) => `var(--on-${h})`
