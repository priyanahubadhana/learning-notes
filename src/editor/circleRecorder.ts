import type { EditorView } from 'prosemirror-view'
import { t } from '../i18n/t'
import { selection } from '../app/selection/store'
import { activeTool } from '../app/tools/main/mainTools'
import { watchWindowEvents } from '../app/input/windowRecorder'
export { RECORDER_KEY, recorderOn } from './circleRecorderKey'

/**
 * Circle recorder (preview only, Settings > Try new features). The owner's
 * iPad circles still select a word to the left of the circle; this records,
 * for one Pencil stroke in a text box, what the browser really delivers: every
 * pointer and touch event (type, time, pen or finger, the points it carried,
 * where), whether the stroke was cancelled and after how many points, every
 * selection change with its range and rectangle, what our own loop check made
 * of the path, and the layout facts that could shift text geometry. It shows
 * a copyable panel (Copy gives a JSON trace that e2e/circleTrace.ts can
 * replay), our path in red and the selection rectangle in blue. Nothing
 * leaves the device; nothing is stored. Loaded only while the switch is on
 * (see circleSelect.ts).
 */

type P = { x: number; y: number }
/** What circleSelect.ts reports at the end of a stroke. */
export type LoopReport = {
  path: P[]
  loop: boolean
  glyphs: number
  range: [number, number] | null
}

/** One recorded event. `t` is ms since the stroke began. */
export type TraceEvent = {
  type: string
  t: number
  pointerType?: string
  id?: number
  x?: number
  y?: number
  /** Points the event carried (coalesced), as [x, y]. */
  co?: [number, number][]
  touches?: { x: number; y: number; touchType?: string; id: number }[]
  /** Where the event went (tag.class). */
  tgt?: string
  cancelable?: boolean
  /** defaultPrevented when it reached the window (capture), and after the page's handlers. */
  dp?: boolean
  dpAfter?: boolean
  /** Reached the window bubble phase (false: stopped on the way). */
  reached?: boolean
  /** pointerdown: the paper box it hit, and the active tool. */
  box?: string
  tool?: string
  /** selection store change: what the app selected. */
  store?: string
  /** beforeinput / input / composition (Scribble writing over a word): what and where. */
  input?: {
    inputType?: string
    data?: string | null
    composing?: boolean
    ranges?: number
    key?: string
  }
  /** click count (click, dblclick). */
  detail?: number
  /** preventDefault events only: which event, and who called it. */
  of?: string
  stack?: string[]
  /** selectionchange only. */
  sel?: {
    pm: [number, number]
    text: string
    rect: [number, number, number, number] | null
  }
}

/** The whole recording; what Copy puts on the clipboard. */
export type CircleTrace = {
  version: 1
  counts: Record<string, number>
  points: number
  cancelAfterPoints: number | null
  stylusTouchEvents: number
  loop: {
    isLoop: boolean
    points: number
    glyphs: number
    range: [number, number] | null
  } | null
  facts: string[]
  viewport: {
    width: number
    height: number
    dpr: number
    scroll: [number, number]
    visualViewport: [number, number, number, number] | null
  }
  editorRect: [number, number, number, number]
  events: TraceEvent[]
}

/** Quiet time (ms) after the stroke in which selection changes are kept. */
const AFTER_MS = 3000
/** Most events kept for one stroke. */
const MAX_EVENTS = 800
const TYPES = [
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointercancel',
  'pointerover',
  'pointerout',
  'gotpointercapture',
  'lostpointercapture',
  'touchstart',
  'touchmove',
  'touchend',
  'touchcancel',
  'contextmenu',
  'mousedown',
  'mouseup',
  'click',
  'dblclick',
  'auxclick',
  'selectstart',
  'focusin',
  'beforeinput',
  'input',
  'keydown',
  'compositionstart',
  'compositionupdate',
  'compositionend',
  'focusout',
  'gesturestart',
  'gesturechange',
  'gestureend',
] as const

const n = (v: number) => Math.round(v * 10) / 10
const box = (r: DOMRect): [number, number, number, number] => [
  n(r.left),
  n(r.top),
  n(r.width),
  n(r.height),
]

/** Layout facts that could make WebKit's text geometry differ from the drawing. */
export function layoutFacts(editorDom: Element): string[] {
  const vv = window.visualViewport
  const out = [
    `devicePixelRatio ${window.devicePixelRatio}`,
    `window inner ${innerWidth}x${innerHeight} scroll ${n(scrollX)},${n(scrollY)}`,
    vv
      ? `visualViewport offset ${n(vv.offsetLeft)},${n(vv.offsetTop)} page ${n(vv.pageLeft)},${n(vv.pageTop)} scale ${vv.scale} size ${n(vv.width)}x${n(vv.height)}`
      : 'visualViewport none',
    `editor rect ${box(editorDom.getBoundingClientRect()).join(' ')}`,
  ]
  let hits = 0
  for (let el: Element | null = editorDom; el; el = el.parentElement) {
    const cs = getComputedStyle(el)
    const zoom = (cs as CSSStyleDeclaration & { zoom?: string }).zoom
    const found: string[] = []
    if (cs.transform && cs.transform !== 'none')
      found.push(`transform ${cs.transform}`)
    if (zoom && zoom !== '1' && zoom !== 'normal') found.push(`zoom ${zoom}`)
    if (cs.scale && cs.scale !== 'none') found.push(`scale ${cs.scale}`)
    if (cs.translate && cs.translate !== 'none')
      found.push(`translate ${cs.translate}`)
    if (found.length) {
      hits++
      const id = el.id ? `#${el.id}` : ''
      const cls =
        typeof el.className === 'string' && el.className
          ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
          : ''
      out.push(
        `ancestor ${el.tagName.toLowerCase()}${id}${cls}: ${found.join('; ')}`,
      )
    }
  }
  if (hits === 0) out.push('ancestors: no transform, zoom, scale or translate')
  return out
}

const svgNs = 'http://www.w3.org/2000/svg'

/** Starts the recorder on this editor; returns stop and the loop reporter. */
function makeRecorder(
  view: () => EditorView | null,
  editorDom: HTMLElement,
): { stop: () => void; report: (r: LoopReport) => void } {
  const doc = editorDom.ownerDocument
  const win = doc.defaultView ?? window
  let t0 = 0
  let active = false
  let events: TraceEvent[] = []
  let counts: Record<string, number> = {}
  let points = 0
  let cancelAt: number | null = null
  let path: P[] = []
  let selRect: DOMRect | null = null
  let timer = 0
  let loop: CircleTrace['loop'] = null
  let stylus = 0
  let panel: HTMLElement | null = null
  let root: HTMLElement | null = null

  const own = (e: Event) =>
    e.target instanceof Node && !!panel && panel.contains(e.target)
  const now = () => Math.round(performance.now() - t0)
  const add = (ev: TraceEvent) => {
    if (events.length < MAX_EVENTS) events.push(ev)
  }
  const clear = () => {
    win.clearTimeout(timer)
    root?.remove()
    panel = null
    root = null
  }
  const begin = () => {
    clear()
    t0 = performance.now()
    active = true
    events = []
    counts = {}
    points = 0
    cancelAt = null
    path = []
    selRect = null
    loop = null
    stylus = 0
  }

  const describeSelection = (): NonNullable<TraceEvent['sel']> => {
    const sel = doc.getSelection()
    const v = view()
    const pm: [number, number] = v
      ? [v.state.selection.from, v.state.selection.to]
      : [-1, -1]
    if (!sel || sel.rangeCount === 0) return { pm, text: '', rect: null }
    const r = sel.getRangeAt(0)
    const rect = r.getBoundingClientRect()
    if (!r.collapsed) selRect = rect
    return {
      pm,
      text: sel.toString().replace(/\s+/g, ' ').slice(0, 60),
      rect: box(rect),
    }
  }

  const seen = new WeakMap<Event, TraceEvent>()
  const describe = (x: EventTarget | null): string => {
    if (!(x instanceof Element)) return String(x && x.constructor?.name)
    const c = typeof x.className === 'string' ? x.className.trim() : ''
    return x.tagName.toLowerCase() + (c ? '.' + c.split(/s+/)[0] : '')
  }
  // Who calls preventDefault while recording (our lift hold or the page's
  // own code): logged with the top of the call stack, behaviour unchanged.
  const proto = Event.prototype
  const realPrevent = proto.preventDefault
  proto.preventDefault = function (this: Event) {
    if (active && this.cancelable)
      add({
        type: 'preventDefault',
        t: now(),
        of: this.type,
        stack: (new Error().stack ?? '')
          .split(String.fromCharCode(10))
          .slice(2, 6)
          .map((l) => l.trim().slice(0, 140)),
      })
    return realPrevent.call(this)
  }
  const onEvent = (e: Event) => {
    if (own(e)) return
    const pe = e as PointerEvent
    if (e.type === 'pointerdown') {
      if (pe.pointerType !== 'pen' && pe.pointerType !== 'touch') return
      // Anywhere in a paper box counts: box-select taps too, not only the text.
      if (
        !(e.target instanceof Element) ||
        !(editorDom.contains(e.target) || e.target.closest('[data-paper-box]'))
      )
        return
      // A second tap inside the window goes on in the same recording.
      if (active) win.clearTimeout(timer)
      else begin()
      if (pe.pointerType === 'pen') {
        path = []
        points = 0
        cancelAt = null
      }
    }
    if (!active) return
    counts[e.type] = (counts[e.type] ?? 0) + 1
    const ev: TraceEvent = {
      type: e.type,
      t: now(),
      tgt: describe(e.target),
      cancelable: e.cancelable,
      dp: e.defaultPrevented,
    }
    seen.set(e, ev)
    if (
      e.type === 'beforeinput' ||
      e.type === 'input' ||
      e.type.startsWith('composition') ||
      e.type === 'keydown'
    ) {
      const ie = e as InputEvent & KeyboardEvent
      ev.input = {
        inputType: ie.inputType,
        data: ie.data?.slice(0, 40),
        composing: ie.isComposing,
        ranges: ie.getTargetRanges?.().length,
        key: e.type === 'keydown' ? ie.key : undefined,
      }
      // Writing after a selection goes on in the same recording.
      win.clearTimeout(timer)
      timer = win.setTimeout(show, AFTER_MS)
    }
    ev.reached = false
    if (e.type === 'pointerdown') {
      ev.box =
        (e.target as Element)
          .closest('[data-paper-box]')
          ?.getAttribute('data-paper-box') ?? undefined
      ev.tool = activeTool.get()
    }
    if ('detail' in e && (e.type === 'click' || e.type === 'dblclick'))
      ev.detail = (e as UIEvent).detail
    if (e.type.startsWith('pointer') || e.type.endsWith('pointercapture')) {
      ev.pointerType = pe.pointerType
      ev.id = pe.pointerId
      ev.x = n(pe.clientX)
      ev.y = n(pe.clientY)
      const co = pe.getCoalescedEvents?.() ?? []
      if (co.length)
        ev.co = co.map((c) => [n(c.clientX), n(c.clientY)] as [number, number])
      if (pe.pointerType === 'pen') {
        if (e.type === 'pointermove') {
          const list = co.length ? co : [pe]
          for (const c of list) path.push({ x: c.clientX, y: c.clientY })
          points += list.length
        } else if (e.type === 'pointerdown') {
          path.push({ x: pe.clientX, y: pe.clientY })
          points++
        }
      }
      if (e.type === 'pointercancel') cancelAt = points
    } else if (e.type.startsWith('touch')) {
      ev.touches = Array.from((e as TouchEvent).changedTouches).map((c) => ({
        x: n(c.clientX),
        y: n(c.clientY),
        touchType: (c as Touch & { touchType?: string }).touchType,
        id: c.identifier,
      }))
      if (ev.touches.some((c) => c.touchType === 'stylus')) stylus++
    }
    add(ev)
    if (
      e.type === 'pointerup' ||
      e.type === 'pointercancel' ||
      (active && e.type === 'click')
    ) {
      win.clearTimeout(timer)
      timer = win.setTimeout(show, AFTER_MS)
    }
  }
  /** After the page's own handlers: was the event cancelled by then? */
  const onAfter = (e: Event) => {
    const ev = seen.get(e)
    if (ev) {
      ev.dpAfter = e.defaultPrevented
      // false: the event never reached the window's bubble phase (stopped on the way).
      ev.reached = true
    }
  }
  const onSelection = () => {
    if (!active) return
    add({ type: 'selectionchange', t: now(), sel: describeSelection() })
  }

  const show = () => {
    active = false
    const sel = describeSelection()
    add({ type: 'final-selection', t: now(), sel })
    const vv = win.visualViewport
    const trace: CircleTrace = {
      version: 1,
      counts,
      points,
      cancelAfterPoints: cancelAt,
      stylusTouchEvents: stylus,
      loop,
      facts: layoutFacts(editorDom),
      viewport: {
        width: win.innerWidth,
        height: win.innerHeight,
        dpr: win.devicePixelRatio,
        scroll: [n(win.scrollX), n(win.scrollY)],
        visualViewport: vv
          ? [n(vv.offsetLeft), n(vv.offsetTop), vv.scale, n(vv.width)]
          : null,
      },
      editorRect: box(editorDom.getBoundingClientRect()),
      events,
    }
    drawOutlines()
    drawPanel(trace)
  }

  /** A top-layer box over the page (no stacking order): holds the outline and panel. */
  const layer = (): HTMLElement => {
    if (root) return root
    const r = doc.createElement('div')
    r.setAttribute('popover', 'manual')
    Object.assign(r.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      margin: '0',
      padding: '0',
      border: '0',
      background: 'transparent',
      overflow: 'visible',
      pointerEvents: 'none',
    })
    doc.body.append(r)
    try {
      r.showPopover()
    } catch {
      // No top layer: it stays last in the page.
    }
    root = r
    return r
  }

  const drawOutlines = () => {
    const s = doc.createElementNS(svgNs, 'svg')
    s.setAttribute('data-circle-recorder-svg', '')
    Object.assign(s.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
    })
    if (path.length > 1) {
      const p = doc.createElementNS(svgNs, 'polyline')
      p.setAttribute('points', path.map((q) => `${q.x},${q.y}`).join(' '))
      p.setAttribute('fill', 'none')
      p.setAttribute('stroke', 'red')
      p.setAttribute('stroke-width', '2')
      s.append(p)
    }
    if (selRect) {
      const r = doc.createElementNS(svgNs, 'rect')
      r.setAttribute('x', String(selRect.left))
      r.setAttribute('y', String(selRect.top))
      r.setAttribute('width', String(selRect.width))
      r.setAttribute('height', String(selRect.height))
      r.setAttribute('fill', 'none')
      r.setAttribute('stroke', 'blue')
      r.setAttribute('stroke-width', '2')
      s.append(r)
    }
    layer().append(s)
  }

  /** The panel text: a short summary, then the JSON trace one event a line. */
  const traceText = (tr: CircleTrace): string => {
    const head = [
      `pointer events: ${Object.entries(tr.counts)
        .map(([k, v]) => `${k} ${v}`)
        .join(', ')}`,
      `path points ${tr.points}; ${tr.cancelAfterPoints === null ? 'no pointercancel' : `pointercancel after ${tr.cancelAfterPoints} points`}; stylus touch events ${tr.stylusTouchEvents}`,
      tr.loop
        ? `our loop: isLoop ${tr.loop.isLoop}; points ${tr.loop.points}; glyphs ${tr.loop.glyphs}; range ${tr.loop.range?.join('-') ?? 'none'}`
        : 'our loop: no report',
      ...tr.facts,
    ]
    return head.join('\n')
  }

  const drawPanel = (tr: CircleTrace) => {
    const json = JSON.stringify(tr)
    const el = doc.createElement('div')
    el.setAttribute('data-circle-recorder', '')
    el.setAttribute('role', 'dialog')
    el.setAttribute('aria-label', t('recorder.title'))
    Object.assign(el.style, {
      position: 'fixed',
      right: '8px',
      bottom: '8px',
      width: 'min(360px, calc(100vw - 16px))',
      maxHeight: '45vh',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      padding: '8px',
      background: 'var(--surface, #fff)',
      color: 'var(--text, #111)',
      border: '1px solid var(--border, #999)',
      borderRadius: '10px',
      font: '11px/1.3 ui-monospace, monospace',
      pointerEvents: 'auto',
    })
    const bar = doc.createElement('div')
    bar.style.display = 'flex'
    bar.style.gap = '6px'
    const title = doc.createElement('strong')
    title.textContent = t('recorder.title')
    title.style.flex = '1'
    const mk = (label: string, run: () => void) => {
      const b = doc.createElement('button')
      b.type = 'button'
      b.textContent = label
      b.setAttribute('aria-label', label)
      Object.assign(b.style, { minWidth: '44px', minHeight: '44px' })
      b.onclick = run
      return b
    }
    const area = doc.createElement('textarea')
    area.readOnly = true
    area.setAttribute('data-circle-recorder-text', '')
    area.value = `${traceText(tr)}\n--- JSON ---\n${json}`
    area.setAttribute('aria-label', t('recorder.title'))
    Object.assign(area.style, {
      flex: '1',
      minHeight: '120px',
      font: 'inherit',
    })
    bar.append(
      title,
      mk(t('recorder.copy'), () => {
        area.select()
        void navigator.clipboard?.writeText(json).catch(() => {})
      }),
      mk('✕', clear),
    )
    el.append(bar, area)
    layer().append(el)
    panel = el
  }

  // What the app decides (read only): changes of the shared selection store.
  const stopStore = selection.onChange((next, prev) => {
    if (active)
      add({
        type: 'store-select',
        t: now(),
        store: `${prev.kind} -> ${next.kind}`,
      })
  })
  // selectionchange fires at the document: the window sees it in capture.
  const stopWatch = watchWindowEvents(
    [...TYPES, 'selectionchange'],
    (e) => (e.type === 'selectionchange' ? onSelection() : onEvent(e)),
    onAfter,
  )
  return {
    stop: () => {
      stopWatch()
      stopStore()
      proto.preventDefault = realPrevent
      clear()
    },
    report: (r) => {
      if (!active) return
      loop = {
        isLoop: r.loop,
        points: r.path.length,
        glyphs: r.glyphs,
        range: r.range,
      }
      if (r.path.length > path.length) path = r.path
      add({ type: 'circle-code', t: now() })
    },
  }
}

/**
 * One recorder for the whole page, shared by every editor that asks: a second
 * editor would record the same strokes twice and show a second panel.
 */
let shared: ReturnType<typeof makeRecorder> | null = null
let users = 0
export function startRecorder(
  view: () => EditorView | null,
  editorDom: HTMLElement,
): { stop: () => void; report: (r: LoopReport) => void } {
  if (!shared) shared = makeRecorder(view, editorDom)
  users++
  return {
    stop: () => {
      if (--users <= 0) {
        shared?.stop()
        shared = null
        users = 0
      }
    },
    report: (r) => shared?.report(r),
  }
}
