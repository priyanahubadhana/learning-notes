/**
 * The gesture watchdog (R7-1, R7-3, R7-5, R7-6, R7-8).
 *
 * On the iPad a pointer that is down when the app goes to the background
 * (another app, another tab, the Update bar's reload in a second window)
 * never gets its `pointerup` or `pointercancel`. Every piece of code that
 * remembers "a pointer is down" then stays stuck: the ink engine keeps a
 * half gesture and refuses the next one, a grip drag keeps the page
 * read-only, the palm guard ignores every finger, the selection guard thinks
 * the person is still pressing. Nothing in the app told those pieces that
 * the world moved on.
 *
 * This module is the one place they listen to. Each piece registers a reset
 * with `onGestureReset`; the watchdog calls them all when the app is hidden,
 * when it comes back (visibility, focus, bfcache `pageshow`) and when a
 * screen asks for it. Each reset must be cheap and safe to run at any time
 * (it only forgets transient state; nothing is saved or changed).
 *
 * The same pieces also register a `registerToolState` reader, so Settings ›
 * Advanced › "Copy tool state" can show what each of them believes right now
 * (the dump the owner can paste into a message).
 */

export type ResetReason =
  'hidden' | 'visible' | 'pageshow' | 'pagehide' | 'focus' | 'blur' | 'manual'

type Reset = (reason: ResetReason) => void

const resets = new Set<Reset>()
const readers = new Map<string, () => Record<string, unknown>>()

/** The last reset that ran (for the tool-state dump). */
let last: { reason: ResetReason; at: number } | null = null
let count = 0

/** Registers a reset of transient gesture state; returns the way to stop. */
export function onGestureReset(fn: Reset): () => void {
  resets.add(fn)
  return () => {
    resets.delete(fn)
  }
}

/** Runs every registered reset (one that throws does not stop the others). */
export function resetGestures(reason: ResetReason = 'manual'): void {
  last = { reason, at: Date.now() }
  count++
  for (const fn of [...resets]) {
    try {
      fn(reason)
    } catch (e) {
      console.error('Gesture reset', e)
    }
  }
}

/** What the window and document send; narrow so tests can fake them. */
export interface WatchdogWindow {
  addEventListener: (type: string, fn: (e: Event) => void) => void
  removeEventListener: (type: string, fn: (e: Event) => void) => void
  document: {
    visibilityState: string
    addEventListener: (type: string, fn: (e: Event) => void) => void
    removeEventListener: (type: string, fn: (e: Event) => void) => void
  }
}

/**
 * Listens for the app going away and coming back. `visibilitychange` covers
 * app and tab switches, `pageshow` the bfcache (a page put to sleep and
 * woken as it was), `focus`/`blur` the split-screen and keyboard cases where
 * the page stays visible but stops getting the pointer.
 */
export function installGestureWatchdog(
  win: WatchdogWindow = window as unknown as WatchdogWindow,
): () => void {
  const { document: doc } = win
  const onVisibility = () =>
    resetGestures(doc.visibilityState === 'hidden' ? 'hidden' : 'visible')
  const onShow = () => resetGestures('pageshow')
  const onHide = () => resetGestures('pagehide')
  const onFocus = () => resetGestures('focus')
  const onBlur = () => resetGestures('blur')
  doc.addEventListener('visibilitychange', onVisibility)
  win.addEventListener('pageshow', onShow)
  win.addEventListener('pagehide', onHide)
  win.addEventListener('focus', onFocus)
  win.addEventListener('blur', onBlur)
  return () => {
    doc.removeEventListener('visibilitychange', onVisibility)
    win.removeEventListener('pageshow', onShow)
    win.removeEventListener('pagehide', onHide)
    win.removeEventListener('focus', onFocus)
    win.removeEventListener('blur', onBlur)
  }
}

// ---- The tool-state dump (Settings › Advanced › Copy tool state) ----

/** Registers a reader of one piece's current state, under its name. */
export function registerToolState(
  name: string,
  read: () => Record<string, unknown>,
): () => void {
  readers.set(name, read)
  return () => {
    if (readers.get(name) === read) readers.delete(name)
  }
}

/** Everything the registered pieces believe right now. */
export function toolState(): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {
    watchdog: {
      resets: count,
      lastReset: last
        ? `${last.reason} ${Math.round((Date.now() - last.at) / 100) / 10}s ago`
        : 'never',
      listeners: resets.size,
    },
  }
  for (const [name, read] of readers) {
    try {
      out[name] = read()
    } catch (e) {
      out[name] = { error: String(e) }
    }
  }
  return out
}

/** The dump as plain text, one `section.key: value` line each. */
export function toolStateReport(
  state: Record<string, Record<string, unknown>> = toolState(),
  header: Record<string, unknown> = {},
): string {
  const lines: string[] = []
  for (const [k, v] of Object.entries(header)) lines.push(`${k}: ${show(v)}`)
  for (const [section, values] of Object.entries(state)) {
    for (const [k, v] of Object.entries(values)) {
      lines.push(`${section}.${k}: ${show(v)}`)
    }
  }
  return lines.join('\n')
}

function show(v: unknown): string {
  if (v === null || v === undefined) return 'none'
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

/** Tests only. */
export function resetWatchdogForTests(): void {
  resets.clear()
  readers.clear()
  last = null
  count = 0
}
