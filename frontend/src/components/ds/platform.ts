export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
/** Modifier label for the platform: the command symbol on Apple devices, Ctrl elsewhere. */
export const modLabel = isMac ? '\u2318' : 'Ctrl'
