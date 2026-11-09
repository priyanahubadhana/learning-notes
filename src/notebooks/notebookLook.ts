import type { Notebook } from '../core/types'
import { readPref, writePref } from '../app/uiPrefs'

/**
 * How a notebook looks: its cover colour, its short label and the order of
 * the Notebooks home. Pure helpers, so they are easy to test.
 */

/** Cover colours (white text on each passes the AA large-text contrast). */
export const COVER_COLOURS = [
  '#6941E0',
  '#1D7A50',
  '#C2410C',
  '#2563EB',
  '#BE185D',
  '#0E7490',
  '#A16207',
  '#7C3AED',
] as const

const HEX = /^#[0-9a-f]{6}$/i

/** The notebook's colour: its own, else one picked from its id (stable). */
export function notebookColour(n: Pick<Notebook, 'id' | 'colour'>): string {
  if (n.colour && HEX.test(n.colour)) return n.colour
  let sum = 0
  for (const ch of n.id) sum = (sum * 31 + ch.charCodeAt(0)) >>> 0
  return COVER_COLOURS[sum % COVER_COLOURS.length]
}

/** The colour after `current` in the list (the "change colour" step). */
export function nextColour(current: string): string {
  const at = COVER_COLOURS.findIndex(
    (c) => c.toLowerCase() === current.toLowerCase(),
  )
  return COVER_COLOURS[(at + 1) % COVER_COLOURS.length]
}

/** A short label for the cover and the sidebar tile: "Bio", "CA". */
export function shortLabel(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '·'
  const first = (w: string) => Array.from(w)[0] ?? ''
  if (words.length === 1) return Array.from(words[0]).slice(0, 3).join('')
  return (first(words[0]) + first(words[1])).toLocaleUpperCase()
}

/** Pinned notebooks first; otherwise the order the sidebar uses. */
export function shelfOrder<T extends Pick<Notebook, 'starred'>>(
  notebooks: readonly T[],
): T[] {
  return [
    ...notebooks.filter((n) => n.starred),
    ...notebooks.filter((n) => !n.starred),
  ]
}

// ---- Last opened (this device, like the last page of a notebook) ----

const KEY = 'notebookOpenedAt'
const KEEP = 500
type Opened = Record<string, number>
const isOpened = (v: unknown): v is Opened =>
  typeof v === 'object' &&
  v !== null &&
  !Array.isArray(v) &&
  Object.values(v).every((x) => typeof x === 'number')

export function touchNotebookOpened(id: string, now = Date.now()): void {
  const all = readPref(KEY, isOpened, {})
  const rest = { ...all }
  delete rest[id]
  writePref(
    KEY,
    Object.fromEntries(Object.entries({ ...rest, [id]: now }).slice(-KEEP)),
  )
}

export const notebookOpenedAt = (): Opened => readPref(KEY, isOpened, {})

/** When a notebook was last opened here; else when it last changed. */
export function lastOpened(
  n: Pick<Notebook, 'id' | 'updatedAt'>,
  opened: Opened,
): number {
  return opened[n.id] ?? n.updatedAt
}

/** 'today' | 'yesterday' | 'date' for the line under a title. */
export function dayKind(
  ts: number,
  now = Date.now(),
): 'today' | 'yesterday' | 'date' {
  const day = (x: number) => {
    const d = new Date(x)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  }
  const diff = Math.round((day(now) - day(ts)) / 86_400_000)
  return diff <= 0 ? 'today' : diff === 1 ? 'yesterday' : 'date'
}

// ---- Window of a long list (only the visible rows are drawn) ----

/** The rows to draw for a scroll position: a few extra above and below. */
export function visibleRows(
  scrollTop: number,
  viewport: number,
  rowHeight: number,
  rows: number,
  overscan = 3,
): { from: number; to: number } {
  const from = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
  const to = Math.min(
    rows,
    Math.ceil((scrollTop + viewport) / rowHeight) + overscan,
  )
  return { from, to }
}
