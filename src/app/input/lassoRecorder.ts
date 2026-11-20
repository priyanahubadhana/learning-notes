import { toolState } from '../gestureReset'
import { inputMachine } from '../inputMachine'
import { activeTool } from '../tools/main/mainTools'
import { selection } from '../selection/store'
import { t } from '../../i18n/t'

/**
 * The quiet recorder (Part A2, docs/features/quiet-recorder.md). Preview only
 * (Settings > Try new features > Lasso recorder). It watches what the iPad
 * really delivers and keeps the last minute in memory, so "Copy last trace"
 * can hand a real Lasso fault to the chat.
 *
 * It changes nothing (RC-N1): passive window listeners, no preventDefault, no
 * stopPropagation, no pointer capture, no timers, nothing drawn on the page
 * (only the small button, outside it, in the top layer). It stores no note
 * words (RC-N2): text input and selection changes are only "changed" with
 * lengths and positions; keys are never recorded; a test id is kept only when
 * it looks like a fixed id. It does no heavy work per event (RC-N3): one
 * small object pushed to an array; the app state is read only at a pointer
 * down, up, cancel or lost capture while the Lasso is the tool.
 * Loaded only while the switch is on (see circleRecorderKey.ts).
 */

/** Ring buffer: the last minute, at most this many events (RC-04). */
const KEEP_MS = 60_000
const MAX_EVENTS = 20_000
/** What "Copy last trace" takes (RC-05). */
const COPY_MS = 30_000

const POINTER = [
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointercancel',
  'pointerover',
  'pointerout',
  'pointerenter',
  'pointerleave',
  'gotpointercapture',
  'lostpointercapture',
] as const
const TOUCH = ['touchstart', 'touchmove', 'touchend', 'touchcancel'] as const
const MOUSE = [
  'mousedown',
  'mouseup',
  'click',
  'dblclick',
  'contextmenu',
] as const
const OTHER = [
  'focusin',
  'focusout',
  'visibilitychange',
  'selectionchange',
  'beforeinput',
  'input',
  'compositionstart',
  'compositionend',
] as const
const TYPES = [...POINTER, ...TOUCH, ...MOUSE, ...OTHER]

/** The app state next to a Lasso event (RC-03). */
export type RecState = {
  tool: string
  gesture: string
  machine: string
  sel: string
  selCount: number
  outlines: number
  editable: string
  timer: boolean
  ended: string
}

/** One recorded event (RC-01, RC-02). Short keys keep the copy small. */
export type RecEvent = {
  n: number
  /** The event's own time stamp, and the performance clock. */
  t: number
  p: number
  e: string
  /** Trusted (1) or made by a script (0). */
  tr: number
  /** Cancelled by the page by the time it reached the window (1), and whether it reached it. */
  dp?: number
  rc?: number
  /** Target kind (box, paper, bar, other) and its fixed test id. */
  g?: string
  id?: string
  /** Pointer fields. */
  pid?: number
  pt?: string
  pri?: number
  b?: number
  bs?: number
  pres?: number
  tx?: number
  ty?: number
  w?: number
  h?: number
  x?: number
  y?: number
  /** Coalesced points of a pen move, flat x,y,x,y. */
  co?: number[]
  /** Touch: how many fingers, and the changed ones. */
  tc?: number
  ch?: { i: number; x: number; y: number; k?: string }[]
  /** Click count. */
  d?: number
  /** Focus: the kind of thing (input, textarea, editable, other). */
  fk?: string
  /** Page visibility. */
  vs?: string
  /** Selection change: ranges, collapsed, offsets, length (never letters). */
  sr?: number
  sc?: number
  so?: [number, number]
  sl?: number
  /** Text input: that it happened, its kind and the length of what came in (never the letters). */
  it?: string
  il?: number
  /** Input machine state change. */
  m?: string
  /** App state (RC-03). */
  st?: RecState
}

export type Trace = {
  v: 2
  build: string
  built: string
  screen: {
    w: number
    h: number
    dpr: number
    sw: number
    sh: number
    orient: string
  }
  /** performance clock of the first and last event, and when copied. */
  span: [number, number, number]
  /** The Lasso state when it was copied. */
  end: RecState
  events: RecEvent[]
}

const r1 = (v: number) => Math.round(v * 10) / 10

let buf: RecEvent[] = []
let seq = 0
let running = false
let stops: (() => void)[] = []
let host: HTMLElement | null = null
const seen = new WeakMap<Event, RecEvent>()
let lastTarget: EventTarget | null = null
let lastKind: { g: string; id?: string } = { g: 'other' }

const FIXED_ID = /^[a-z][a-z0-9_:.-]{0,39}$/

/** A short kind for the target and its test id, never its text (RC-01). */
function kindOf(target: EventTarget | null): { g: string; id?: string } {
  if (target === lastTarget) return lastKind
  lastTarget = target
  if (!(target instanceof Element)) return (lastKind = { g: 'other' })
  const g = target.closest('[data-paper-box]')
    ? 'box'
    : target.closest(
          '[data-ink-pad],[data-paper-wrap],[data-paper-sheet],[data-ink-paper]',
        )
      ? 'paper'
      : target.closest('[role="toolbar"],[data-ink-ui],header,nav')
        ? 'bar'
        : 'other'
  const raw = target.closest('[data-testid]')?.getAttribute('data-testid') ?? ''
  return (lastKind = FIXED_ID.test(raw) ? { g, id: raw } : { g })
}

function focusKind(target: EventTarget | null): string {
  if (!(target instanceof HTMLElement)) return 'other'
  const tag = target.tagName
  if (tag === 'TEXTAREA') return 'textarea'
  if (tag === 'INPUT') return 'input'
  return target.isContentEditable ? 'editable' : 'other'
}

/** The app state the Lasso is in (RC-03): read only, from what the app already reports. */
function snap(): RecState {
  const all = toolState()
  const ink = all.ink ?? {}
  const machine = all.machine ?? {}
  const gesture = String(ink.gesture ?? 'none')
  const inkSel = Number(ink.selection ?? 0) + Number(ink.blockSel ?? 0)
  const store = selection.getSnapshot()
  const down = machine.down
  return {
    tool: activeTool.get(),
    gesture,
    machine: inputMachine.state(),
    sel: inkSel > 0 ? 'ink' : store.kind,
    selCount: inkSel,
    outlines:
      document.querySelectorAll('[data-paper-lasso]').length +
      (gesture.startsWith('lasso') ? 1 : 0),
    editable: String(ink.editorEditable ?? 'none'),
    timer: Array.isArray(down) && down.length > 0,
    ended: String(machine.lastAbort ?? 'never'),
  }
}

/** Drops what is older than a minute; runs at a pointer down, not per move. */
function prune() {
  const from = performance.now() - KEEP_MS
  let i = 0
  while (i < buf.length && buf[i].p < from) i++
  if (i > 0) buf.splice(0, i)
}

function push(ev: RecEvent) {
  buf.push(ev)
  if (buf.length > MAX_EVENTS) buf.splice(0, 2000)
}

function onCapture(e: Event) {
  if (host && e.target instanceof Node && host.contains(e.target)) return
  const type = e.type
  const ev: RecEvent = {
    n: ++seq,
    t: r1(e.timeStamp),
    p: r1(performance.now()),
    e: type,
    tr: e.isTrusted ? 1 : 0,
  }
  if (type === 'selectionchange') {
    const s = document.getSelection()
    ev.sr = s ? s.rangeCount : 0
    if (s && s.rangeCount > 0) {
      ev.sc = s.isCollapsed ? 1 : 0
      ev.so = [s.anchorOffset, s.focusOffset]
      ev.sl = s.isCollapsed ? 0 : s.toString().length
    }
  } else if (type === 'visibilitychange') {
    ev.vs = document.visibilityState
  } else if (type === 'focusin' || type === 'focusout') {
    ev.fk = focusKind(e.target)
  } else if (type === 'beforeinput' || type === 'input') {
    const ie = e as InputEvent
    ev.it = ie.inputType
    ev.il = ie.data ? ie.data.length : 0
  } else if (type.startsWith('composition')) {
    // Only that it happened.
  } else {
    const k = kindOf(e.target)
    ev.g = k.g
    if (k.id) ev.id = k.id
    if (type.startsWith('pointer') || type.endsWith('pointercapture')) {
      const pe = e as PointerEvent
      ev.pid = pe.pointerId
      ev.pt = pe.pointerType
      ev.pri = pe.isPrimary ? 1 : 0
      ev.b = pe.button
      ev.bs = pe.buttons
      ev.pres = Math.round(pe.pressure * 1000) / 1000
      ev.tx = pe.tiltX
      ev.ty = pe.tiltY
      ev.w = r1(pe.width)
      ev.h = r1(pe.height)
      ev.x = r1(pe.clientX)
      ev.y = r1(pe.clientY)
      if (type === 'pointermove' && pe.pointerType === 'pen') {
        const co = pe.getCoalescedEvents?.()
        if (co && co.length > 1) {
          const flat: number[] = []
          for (const c of co) flat.push(r1(c.clientX), r1(c.clientY))
          ev.co = flat
        }
      }
    } else if (type.startsWith('touch')) {
      const te = e as TouchEvent
      ev.tc = te.touches.length
      ev.ch = Array.from(te.changedTouches, (c) => ({
        i: c.identifier,
        x: r1(c.clientX),
        y: r1(c.clientY),
        k: (c as Touch & { touchType?: string }).touchType,
      }))
    } else if (type === 'click' || type === 'dblclick') {
      ev.d = (e as MouseEvent).detail
    }
  }
  if (type === 'pointerdown') prune()
  if (
    activeTool.get() === 'lasso' &&
    (type === 'pointerdown' ||
      type === 'pointerup' ||
      type === 'pointercancel' ||
      type === 'lostpointercapture' ||
      type === 'click')
  )
    ev.st = snap()
  if (e.cancelable) seen.set(e, ev)
  push(ev)
}

/** The bubble phase: did the event get here, and had the page cancelled it? */
function onBubble(e: Event) {
  const ev = seen.get(e)
  if (!ev) return
  ev.rc = 1
  ev.dp = e.defaultPrevented ? 1 : 0
}

/** The trace text for the last 30 seconds (RC-05). */
export function traceJson(): string {
  const now = performance.now()
  const events = buf.filter((ev) => ev.p >= now - COPY_MS)
  const trace: Trace = {
    v: 2,
    build: typeof __APP_COMMIT__ === 'string' ? __APP_COMMIT__ : 'dev',
    built: typeof __APP_BUILT__ === 'string' ? __APP_BUILT__ : '',
    screen: {
      w: innerWidth,
      h: innerHeight,
      dpr: devicePixelRatio,
      sw: screen.width,
      sh: screen.height,
      orient: innerWidth >= innerHeight ? 'sideways' : 'upright',
    },
    span: [events[0]?.p ?? now, events[events.length - 1]?.p ?? now, r1(now)],
    end: snap(),
    events,
  }
  return JSON.stringify(trace)
}

const STYLE: Partial<CSSStyleDeclaration> = {
  position: 'fixed',
  inset: 'auto 8px calc(8px + env(safe-area-inset-bottom)) auto',
  margin: '0',
  padding: '0',
  border: '0',
  background: 'transparent',
  overflow: 'visible',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: '6px',
  font: '500 13px/1.3 system-ui, sans-serif',
}

const CARD: Partial<CSSStyleDeclaration> = {
  background: 'var(--color-bg, #fff)',
  color: 'var(--color-ink, #18171c)',
  border: '1px solid var(--color-line-strong, #8a8796)',
  borderRadius: '22px',
  padding: '0 14px',
  minHeight: '44px',
  minWidth: '44px',
}

function mount() {
  const el = document.createElement('div')
  el.setAttribute('data-lasso-recorder', '')
  el.setAttribute('popover', 'manual')
  Object.assign(el.style, STYLE)
  const note = (text: string, fade: boolean) => {
    el.querySelector('[data-lasso-recorder-note]')?.remove()
    const n = document.createElement('div')
    n.setAttribute('data-lasso-recorder-note', '')
    n.setAttribute('role', 'status')
    n.textContent = text
    Object.assign(n.style, { ...CARD, display: 'flex', alignItems: 'center' })
    el.prepend(n)
    // The note leaves by itself, with a style animation (no timer of ours).
    if (fade)
      n.animate([{ opacity: 1 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], {
        duration: 4000,
      }).onfinish = () => n.remove()
    return n
  }
  const button = document.createElement('button')
  button.type = 'button'
  button.setAttribute('data-lasso-recorder-copy', '')
  button.textContent = t('recorder.copyTrace')
  Object.assign(button.style, {
    ...CARD,
    cursor: 'pointer',
    touchAction: 'manipulation',
  })
  button.onclick = () => {
    const json = traceJson()
    const clip = navigator.clipboard
    const fail = () => {
      // The browser did not let the button copy: show the text to select.
      const n = note(t('recorder.copyFailed'), false)
      const area = document.createElement('textarea')
      area.readOnly = true
      area.value = json
      area.setAttribute('data-lasso-recorder-text', '')
      area.setAttribute('aria-label', t('recorder.copyTrace'))
      Object.assign(area.style, {
        width: '260px',
        height: '120px',
        font: '11px monospace',
      })
      const close = document.createElement('button')
      close.type = 'button'
      close.textContent = '✕'
      close.setAttribute('aria-label', t('recorder.close'))
      Object.assign(close.style, { minWidth: '44px', minHeight: '44px' })
      close.onclick = () => n.remove()
      n.style.flexDirection = 'column'
      n.style.alignItems = 'stretch'
      n.append(area, close)
      area.select()
    }
    if (!clip?.writeText) return fail()
    clip.writeText(json).then(() => note(t('recorder.copied'), true), fail)
  }
  el.append(button)
  document.body.append(el)
  try {
    el.showPopover()
  } catch {
    // No top layer: it stays last in the page.
  }
  host = el
}

/** Starts the recorder (the switch went on). Safe to call twice. */
export function startLassoRecorder(): void {
  if (running) return
  running = true
  for (const type of TYPES) {
    window.addEventListener(type, onCapture, { capture: true, passive: true })
    window.addEventListener(type, onBubble, { passive: true })
  }
  const stopMachine = inputMachine.subscribe(() => {
    push({
      n: ++seq,
      t: r1(performance.now()),
      p: r1(performance.now()),
      e: 'machine',
      tr: 1,
      m: inputMachine.state(),
    })
  })
  stops = [
    () => {
      for (const type of TYPES) {
        window.removeEventListener(type, onCapture, { capture: true })
        window.removeEventListener(type, onBubble)
      }
    },
    stopMachine,
  ]
  mount()
}

/** Stops it (the switch went off): the buffer is cleared, the button leaves (RC-04). */
export function stopLassoRecorder(): void {
  if (!running) return
  running = false
  for (const s of stops) s()
  stops = []
  buf = []
  host?.remove()
  host = null
}

/** Tests: how many events are held now. */
export const heldEvents = () => buf.length
