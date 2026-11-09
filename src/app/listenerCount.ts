import { registerToolState } from './gestureReset'

/**
 * Counts the listeners added to the document (and the window), by event type
 * and phase, so "Copy tool state" shows how many pointer handlers every touch
 * runs (tools robustness, step 4). Paper pages mount one editor per box and
 * each adds its own set, so the number grows with the boxes; a number that
 * keeps growing while nothing opens is a leak the health check can see.
 *
 * It wraps `addEventListener` / `removeEventListener` of the two targets and
 * keeps one entry per (type, listener, capture), as the browser does. A
 * `once` listener that fires is not noticed (counted until removed): the
 * count may be a little high, never low.
 */

type Target = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>

const counts = new Map<string, Map<string, Set<unknown>>>()

const capture = (o: boolean | AddEventListenerOptions | undefined): boolean =>
  o === true || (typeof o === 'object' && o !== null && !!o.capture)

function wrap(name: string, target: Target) {
  const live = new Map<string, Set<unknown>>()
  counts.set(name, live)
  const add = target.addEventListener.bind(target)
  const remove = target.removeEventListener.bind(target)
  const key = (type: string, o: boolean | EventListenerOptions | undefined) =>
    type + (capture(o as AddEventListenerOptions) ? ' (capture)' : '')
  target.addEventListener = ((
    type: string,
    fn: EventListenerOrEventListenerObject | null,
    o?: boolean | AddEventListenerOptions,
  ) => {
    if (fn) {
      const k = key(type, o)
      if (!live.has(k)) live.set(k, new Set())
      live.get(k)!.add(fn)
    }
    return add(type, fn as EventListener, o)
  }) as Target['addEventListener']
  target.removeEventListener = ((
    type: string,
    fn: EventListenerOrEventListenerObject | null,
    o?: boolean | EventListenerOptions,
  ) => {
    if (fn) live.get(key(type, o))?.delete(fn)
    return remove(type, fn as EventListener, o)
  }) as Target['removeEventListener']
}

/** The counts so far: `{ 'pointerdown (capture)': 7, ... }` for each target. */
export function listenerCounts(): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {}
  for (const [name, live] of counts) {
    const row: Record<string, number> = {}
    for (const [k, set] of [...live].sort(([a], [b]) => a.localeCompare(b))) {
      if (set.size > 0) row[k] = set.size
    }
    out[name] = row
  }
  return out
}

/** The document capture listeners on pointer events (what every touch runs). */
export function pointerListenerTotal(): number {
  const row = counts.get('document')
  if (!row) return 0
  let n = 0
  for (const [k, set] of row) {
    if (/^pointer(down|move|up|cancel) \(capture\)$/.test(k)) n += set.size
  }
  return n
}

/** Starts counting (once). Call before the editors mount. */
export function installListenerCount(
  doc: Document = document,
  win: Window = window,
): void {
  if (counts.size > 0) return
  wrap('document', doc)
  wrap('window', win)
  registerToolState('listeners', () => ({
    pointerTotal: pointerListenerTotal(),
    editors: doc.querySelectorAll('.bn-editor').length,
    ...Object.fromEntries(
      Object.entries(listenerCounts()).map(([name, row]) => [name, row]),
    ),
  }))
}
