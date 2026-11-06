import { usedBytes } from '../canvasBudget'
import { penTapStats } from '../penTap'

/**
 * What the Pencil lab records: counters per pointer type, text events on the
 * page, focus moves and the visual viewport. Pure data plus one function that
 * listens to the document; the lab screen only shows it.
 */

export interface PointerCounts {
  down: number
  move: number
  coalesced: number
  up: number
  cancel: number
  lostCapture: number
}
export interface LabStats {
  pointers: Record<string, PointerCounts>
  touchstart: Record<string, number>
  hoverPen: number
  textEvents: { type: string; inputType: string; data: string | null }[]
  textEdits: number
  focus: string[]
  viewport: { height: number; offsetTop: number; scrollY: number }
}

const blank = (): PointerCounts => ({
  down: 0,
  move: 0,
  coalesced: 0,
  up: 0,
  cancel: 0,
  lostCapture: 0,
})

export const newStats = (): LabStats => ({
  pointers: {},
  touchstart: {},
  hoverPen: 0,
  textEvents: [],
  textEdits: 0,
  focus: [],
  viewport: { height: 0, offsetTop: 0, scrollY: 0 },
})

const describe = (el: Element | null): string => {
  if (!el) return 'none'
  const tag = el.tagName.toLowerCase()
  return el.closest('[data-page-content]')
    ? `${tag} (page text)`
    : el.hasAttribute('data-page-title')
      ? `${tag} (title)`
      : tag
}

const inPage = (t: EventTarget | null): boolean =>
  t instanceof Element &&
  !!t.closest('[data-page-content], [data-page-title]') &&
  !t.closest('[data-lab-panel]')

/** Listens until the returned function is called. */
export function watchStats(stats: LabStats, onChange: () => void): () => void {
  const off: (() => void)[] = []
  const on = <E extends Event>(
    target: EventTarget,
    type: string,
    fn: (e: E) => void,
  ) => {
    target.addEventListener(type, fn as EventListener, true)
    off.push(() => target.removeEventListener(type, fn as EventListener, true))
  }
  const count = (e: PointerEvent): PointerCounts =>
    (stats.pointers[e.pointerType] ??= blank())
  on<PointerEvent>(document, 'pointerdown', (e) => {
    count(e).down++
    onChange()
  })
  on<PointerEvent>(document, 'pointermove', (e) => {
    const c = count(e)
    c.move++
    c.coalesced += e.getCoalescedEvents?.().length ?? 0
    if (e.pointerType === 'pen' && e.buttons === 0) stats.hoverPen++
  })
  on<PointerEvent>(document, 'pointerup', (e) => {
    count(e).up++
    onChange()
  })
  on<PointerEvent>(document, 'pointercancel', (e) => {
    count(e).cancel++
    onChange()
  })
  on<PointerEvent>(document, 'lostpointercapture', (e) => {
    count(e).lostCapture++
  })
  on<TouchEvent>(document, 'touchstart', (e) => {
    for (const t of Array.from(e.changedTouches)) {
      const k = (t as Touch & { touchType?: string }).touchType ?? 'unknown'
      stats.touchstart[k] = (stats.touchstart[k] ?? 0) + 1
    }
    onChange()
  })
  for (const type of ['beforeinput', 'input']) {
    on<InputEvent>(document, type, (e) => {
      if (!inPage(e.target)) return
      stats.textEvents.push({
        type,
        inputType: e.inputType,
        data: e.data,
      })
      if (stats.textEvents.length > 200) stats.textEvents.shift()
      if (type === 'input') stats.textEdits++
      onChange()
    })
  }
  on<FocusEvent>(document, 'focusin', (e) => {
    stats.focus.push(describe(e.target as Element))
    if (stats.focus.length > 100) stats.focus.shift()
    onChange()
  })
  const vv = window.visualViewport
  const view = () => {
    stats.viewport = {
      height: Math.round(vv?.height ?? window.innerHeight),
      offsetTop: Math.round(vv?.offsetTop ?? 0),
      scrollY: Math.round(window.scrollY),
    }
    onChange()
  }
  vv?.addEventListener('resize', view)
  vv?.addEventListener('scroll', view)
  off.push(() => {
    vv?.removeEventListener('resize', view)
    vv?.removeEventListener('scroll', view)
  })
  view()
  return () => off.forEach((f) => f())
}

export interface LabReport {
  stats: LabStats
  mode: string
  canvasMB: number
  penTap: { cancelledTouches: number; clicks: number; swallowed: number }
  inkCancels: { kept: number; dropped: number }
  userAgent: string
  at: string
}

export function buildReport(
  stats: LabStats,
  mode: string,
  inkCancels: { kept: number; dropped: number },
): LabReport {
  return {
    stats,
    mode,
    canvasMB: Math.round((usedBytes() / (1024 * 1024)) * 10) / 10,
    penTap: { ...penTapStats },
    inkCancels,
    userAgent: navigator.userAgent,
    at: new Date().toISOString(),
  }
}

/** Plain-text summary to paste into a chat. */
export function summarize(r: LabReport): string {
  const lines = [
    `Pencil lab ${r.at}`,
    `Page mode: ${r.mode}; canvas ${r.canvasMB} MB`,
    `Scribble wrote into the page: ${r.stats.textEdits} input events`,
  ]
  for (const [type, c] of Object.entries(r.stats.pointers)) {
    lines.push(
      `${type}: down ${c.down}, move ${c.move} (coalesced ${c.coalesced}), up ${c.up}, cancel ${c.cancel}, lostcapture ${c.lostCapture}`,
    )
  }
  lines.push(
    `touchstart by type: ${JSON.stringify(r.stats.touchstart)}`,
    `pen hover moves: ${r.stats.hoverPen}`,
    `bar taps handled by us: ${r.penTap.clicks}, touches cancelled ${r.penTap.cancelledTouches}, late clicks swallowed ${r.penTap.swallowed}`,
    `ink pointercancel kept ${r.inkCancels.kept}, dropped ${r.inkCancels.dropped}`,
    `viewport height ${r.stats.viewport.height}, offsetTop ${r.stats.viewport.offsetTop}, scrollY ${r.stats.viewport.scrollY}`,
    `last focus moves: ${r.stats.focus.slice(-6).join(' > ') || 'none'}`,
  )
  const edits = r.stats.textEvents.filter((e) => e.type === 'input').slice(-8)
  if (edits.length)
    lines.push(
      'Scribble wrote: ' +
        edits.map((e) => `${e.inputType}:${JSON.stringify(e.data)}`).join(', '),
    )
  return lines.join('\n')
}
