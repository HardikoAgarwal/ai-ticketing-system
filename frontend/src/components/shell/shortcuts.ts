import { useEffect, useRef, useSyncExternalStore } from 'react'

/**
 * Tiny global keyboard-shortcut manager.
 *
 *   useShortcut('mod+k', () => openPalette(), { description: 'Open command palette', group: 'General', allowInInput: true })
 *   useShortcut('j', next)           // single key
 *   useShortcut('g i', goInbox)      // two-key sequence (second key within 1s)
 *
 * Key syntax: modifiers `mod` (Cmd on Mac, Ctrl elsewhere), `shift`, `alt`, joined with `+`; a key is a character or one of
 * enter, esc, up, down, left, right, space. Plain-key shortcuts are ignored while typing in an input/textarea/select/contenteditable
 * and while a modal dialog is open; `mod+…` combos always work unless `allowInInput` is false for inputs.
 * Everything registered with a `description` appears in the "?" shortcuts sheet.
 */
export interface ShortcutOptions {
  description?: string
  group?: string
  /** Fire even while typing in a field. Default: only for `mod+` combos. */
  allowInInput?: boolean
  enabled?: boolean
}

interface Entry extends ShortcutOptions {
  id: number
  keys: string
  steps: Step[]
  handler: (e: KeyboardEvent) => void
}
interface Step {
  key: string
  mod: boolean
  shift: boolean
  alt: boolean
}

const entries = new Map<number, Entry>()
const listeners = new Set<() => void>()
let nextId = 1
let snapshot: ShortcutInfo[] = []
let installed = false
let buffer: { key: string; at: number }[] = []

export interface ShortcutInfo {
  keys: string
  description: string
  group: string
}

const ALIASES: Record<string, string> = { esc: 'escape', up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright', space: ' ' }

function parse(keys: string): Step[] {
  return keys
    .trim()
    .split(/\s+/)
    .map((part) => {
      const bits = part.split('+')
      const raw = bits[bits.length - 1] || '+'
      const key = ALIASES[raw.toLowerCase()] ?? raw.toLowerCase()
      const mods = bits.slice(0, -1).map((m) => m.toLowerCase())
      return { key, mod: mods.includes('mod'), shift: mods.includes('shift'), alt: mods.includes('alt') }
    })
}

function matches(step: Step, e: KeyboardEvent) {
  if (e.key.toLowerCase() !== step.key) return false
  const mod = e.metaKey || e.ctrlKey
  if (step.mod !== mod) return false
  if (step.alt !== e.altKey) return false
  // shift only matters when asked for; punctuation like "?" is produced with shift
  if (step.shift && !e.shiftKey) return false
  return true
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  if (!el || !el.tagName) return false
  if (el.isContentEditable) return true
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  const role = el.getAttribute('role')
  return role === 'textbox' || role === 'combobox' || role === 'searchbox'
}

const modalOpen = () => !!document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')

function onKeyDown(e: KeyboardEvent) {
  if (e.defaultPrevented || e.repeat || ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return
  const now = Date.now()
  buffer = buffer.filter((b) => now - b.at < 1000)
  buffer.push({ key: e.key.toLowerCase(), at: now })
  const typing = isTyping(e.target)
  for (const entry of entries.values()) {
    if (entry.enabled === false) continue
    const last = entry.steps[entry.steps.length - 1]
    if (!matches(last, e)) continue
    if (entry.steps.length > 1) {
      const need = entry.steps.slice(0, -1).map((s) => s.key)
      const have = buffer.slice(-entry.steps.length, -1).map((b) => b.key)
      if (need.length !== have.length || need.some((k, i) => k !== have[i])) continue
    }
    const combo = last.mod
    if (typing && !(entry.allowInInput ?? combo)) continue
    if (!combo && modalOpen()) continue
    e.preventDefault()
    buffer = []
    entry.handler(e)
    return
  }
}

function publish() {
  snapshot = [...entries.values()]
    .filter((e) => e.description && e.enabled !== false)
    .map((e) => ({ keys: e.keys, description: e.description!, group: e.group ?? 'General' }))
  listeners.forEach((l) => l())
}

export function useShortcut(keys: string, handler: (e: KeyboardEvent) => void, options: ShortcutOptions = {}) {
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
  const { description, group, allowInInput, enabled } = options
  useEffect(() => {
    if (!installed) {
      window.addEventListener('keydown', onKeyDown)
      installed = true
    }
    const id = nextId++
    entries.set(id, { id, keys, steps: parse(keys), handler: (e) => ref.current(e), description, group, allowInInput, enabled })
    publish()
    return () => {
      entries.delete(id)
      publish()
    }
  }, [keys, description, group, allowInInput, enabled])
}

/** The registered shortcuts that have a description (for the help sheet). */
export function useShortcutList(): ShortcutInfo[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => snapshot,
  )
}

/** Opens the "?" shortcuts sheet (mounted by the shell). */
export const SHORTCUTS_EVENT = 'helpdesk:shortcuts'
export const openShortcutsHelp = () => window.dispatchEvent(new Event(SHORTCUTS_EVENT))
