/**
 * Slow-moments recorder (R6-11): a light log of stalls on this device, for
 * the owner's iPad freezes. Two detectors:
 *
 * - `PerformanceObserver` long tasks (50 ms or more on the main thread).
 * - An event-loop stall check: a timer that should fire every 500 ms; when
 *   it fires late by 250 ms or more, the page was frozen that long (this
 *   also catches freezes on browsers without the long-task API, like Safari).
 *
 * Each entry notes what was going on (route, active tool, focused element,
 * app in front or not). The last 50 stay in localStorage; nothing leaves the
 * device. Settings › Advanced › Record slow moments turns it on; Copy report
 * puts the entries on the clipboard as text.
 */

import { activeTool } from '../app/tools/main/mainTools'

const KEY = 'learning-notes:perf.slow'
export const KEEP = 50
const TICK_MS = 500
const STALL_MS = 250
const LONG_TASK_MS = 50

export interface SlowMoment {
  /** ms since the epoch */
  at: number
  kind: 'longtask' | 'stall' | 'drive'
  /** Plain note (Drive connection log). */
  note?: string
  /** ms */
  ms: number
  route: string
  /** The active tool, when the page has one. */
  tool?: string
  /** Tag and role of the focused element. */
  focus?: string
  hidden?: boolean
  /** Rough memory use, when the browser says (Chromium only). */
  heapMb?: number
}

function store(): Storage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

export function readSlowMoments(): SlowMoment[] {
  try {
    const raw = store()?.getItem(KEY)
    const list: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? (list as SlowMoment[]) : []
  } catch {
    return []
  }
}

export function clearSlowMoments(): void {
  try {
    store()?.removeItem(KEY)
  } catch {
    // nothing kept
  }
}

function context(): Omit<SlowMoment, 'at' | 'kind' | 'ms'> {
  const el = document.activeElement
  const mem = (performance as { memory?: { usedJSHeapSize?: number } }).memory
    ?.usedJSHeapSize
  return {
    route: location.hash
      .replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '<id>')
      .slice(0, 60),
    tool: activeTool.get(),
    focus: el
      ? `${el.tagName.toLowerCase()}${el.getAttribute('role') ? `[${el.getAttribute('role')}]` : ''}`
      : undefined,
    hidden: document.visibilityState !== 'visible' || undefined,
    heapMb: mem ? Math.round(mem / 1048576) : undefined,
  }
}

export function noteSlowMoment(
  kind: SlowMoment['kind'],
  ms: number,
  now = Date.now(),
): void {
  const entry: SlowMoment = { at: now, kind, ms: Math.round(ms), ...context() }
  const list = [...readSlowMoments(), entry].slice(-KEEP)
  try {
    store()?.setItem(KEY, JSON.stringify(list))
  } catch {
    // Storage full or blocked: this moment is not kept.
  }
}

/** Starts both detectors; returns the stop function. */
export function startSlowMoments(): () => void {
  const stops: (() => void)[] = []
  if (typeof PerformanceObserver !== 'undefined') {
    try {
      const po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.duration >= LONG_TASK_MS) noteSlowMoment('longtask', e.duration)
        }
      })
      po.observe({ type: 'longtask', buffered: false })
      stops.push(() => po.disconnect())
    } catch {
      // No long-task support (Safari): the stall check below still works.
    }
  }
  let last = performance.now()
  const timer = setInterval(() => {
    const now = performance.now()
    const late = now - last - TICK_MS
    last = now
    // A hidden tab is throttled on purpose: that is not a freeze.
    if (late >= STALL_MS && document.visibilityState === 'visible') {
      noteSlowMoment('stall', late)
    }
  }, TICK_MS)
  stops.push(() => clearInterval(timer))
  const onVisible = () => {
    last = performance.now()
  }
  document.addEventListener('visibilitychange', onVisible)
  stops.push(() => document.removeEventListener('visibilitychange', onVisible))
  return () => {
    for (const s of stops) s()
  }
}

/** The report as plain text (one line per moment, newest last). */
export function slowMomentsReport(
  list = readSlowMoments(),
  nav = typeof navigator === 'undefined' ? '' : navigator.userAgent,
): string {
  const head = [
    `Learning Notes slow moments (${list.length})`,
    nav,
    `screen ${typeof screen === 'undefined' ? '?' : `${screen.width}x${screen.height}`}`,
    '',
  ]
  const lines = list.map((m) => {
    const when = new Date(m.at).toISOString().replace('T', ' ').slice(0, 19)
    const parts = [
      when,
      m.kind === 'stall' ? 'froze' : m.kind === 'drive' ? 'drive' : 'long task',
      m.kind === 'drive' ? (m.note ?? '') : `${m.ms} ms`,
      m.route || '#',
      m.tool ? `tool=${m.tool}` : '',
      m.focus ? `focus=${m.focus}` : '',
      m.hidden ? 'hidden' : '',
      m.heapMb ? `heap=${m.heapMb}MB` : '',
    ]
    return parts.filter(Boolean).join('  ')
  })
  return [...head, ...lines].join('\n')
}
