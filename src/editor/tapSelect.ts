import { TextSelection } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'
import { onGestureReset, registerToolState } from '../app/gestureReset'
import { activeTool } from '../app/tools/main/mainTools'
import { keepSelection } from './ownSelection'
import { noteTapSelected } from './penGuard'
import { wordAround } from './penSelect'
import type { AppSchema } from './schema'

/**
 * Pencil taps in typing mode (owner's table, 7 Nov): with no pen tool on,
 * the Pencil acts like a finger. A DOUBLE-TAP selects the word under it, a
 * TRIPLE-TAP the visual line on screen at that spot (one row of a wrapped
 * paragraph, R6-19), a QUADRUPLE-TAP the whole paragraph; the mini toolbar
 * follows and the Text tool stays. Hit-testing is tolerant: when the tap
 * lands between lines or in a margin, the nearest text within a few pixels
 * is used. A finger keeps the browser's own double tap. Under the ink tools
 * and the Lasso taps are the ink engine's (a tap draws nothing, a lasso tap
 * starts a loop) and never select text.
 *
 * R6-18 (owner, real iPad): the selection vanished at once. The browser's own
 * second tap arrived after ours: iPadOS selects the word itself, then sends
 * the tap's synthetic click (mousedown, mouseup, click), whose mousedown
 * collapses the selection to a caret, and that arrived within the "recent
 * input" window that ownSelection.ts treats as the person's own doing. So
 * from the second tap on, the Pencil's pointerdown and its stylus touch are
 * cancelled (no native double tap, no click, no Scribble dot) and the
 * selection we set is kept (`keepSelection`) until the next tap or key.
 *
 * This is the ONE tap counter of the page (penSelect and the ink engine do
 * not count taps).
 */

type Editor = AppSchema['BlockNoteEditor']

/** Real iPad timing (owner, 7 Nov): taps up to this far apart add up. */
const TAP_MS = 450
/** Taps this close together (px) count as the same spot. */
const TAP_PX = 12
/** A Pencil that drifts further than this between down and up is not a tap. */
const MOVE_PX = 12
/** A press held longer than this is a hold (holdSelect.ts), not a tap. */
const TAP_HOLD_MS = 300

/** The ink pad, when the tap landed on it (it covers the words). */
export const padOf = (target: EventTarget | null): HTMLElement | null =>
  target instanceof HTMLElement && target.hasAttribute('data-ink-pad')
    ? target
    : null

/** Runs `fn` with the pad letting hits through, so the words under it count. */
export function lookThrough<T>(pad: HTMLElement | null, fn: () => T): T {
  if (!pad) return fn()
  const was = pad.style.pointerEvents
  pad.style.pointerEvents = 'none'
  try {
    return fn()
  } finally {
    pad.style.pointerEvents = was
  }
}

/** A text position near (x, y): exact, else the nearest within `reach` px. */
export function posNear(
  view: Pick<EditorView, 'posAtCoords' | 'state'>,
  x: number,
  y: number,
  reach = 14,
): number | null {
  const inline = (px: number, py: number) => {
    const found = view.posAtCoords({ left: px, top: py })
    if (!found) return null
    return view.state.doc.resolve(found.pos).parent.inlineContent
      ? found.pos
      : null
  }
  const direct = inline(x, y)
  if (direct !== null) return direct
  for (const r of [reach / 2, reach, reach * 2]) {
    for (const [dx, dy] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const hit = inline(x + dx * r, y + dy * r)
      if (hit !== null) return hit
    }
  }
  return null
}

/** What the visual-line rule needs from the editor view. */
export type LineView = Pick<
  EditorView,
  'state' | 'coordsAtPos' | 'posAtCoords' | 'nodeDOM'
>

/**
 * The visual line (one row on screen) of the text block at `pos`, as
 * [from, to]: the caret positions found at the row's left and right edges
 * (R6-19). `y` is where the tap landed, which says which row is meant when
 * `pos` sits on a wrap. The whole block when the row cannot be measured.
 */
export function visualLineRange(
  view: LineView,
  pos: number,
  y: number,
): [number, number] | null {
  const $pos = view.state.doc.resolve(pos)
  if (!$pos.parent.inlineContent) return null
  const start = $pos.start()
  const end = $pos.end()
  if (start === end) return null
  const whole: [number, number] = [start, end]
  const el = view.nodeDOM($pos.before()) as Element | null
  if (typeof el?.getBoundingClientRect !== 'function') return whole
  const box = el.getBoundingClientRect()
  // The row: the caret rect on the tap's side of a wrap, nearest to the tap.
  const rows = [view.coordsAtPos(pos, -1), view.coordsAtPos(pos, 1)]
  const away = (r: { top: number; bottom: number }) =>
    y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0
  const row = rows.reduce((a, b) => (away(b) < away(a) ? b : a))
  const mid = (row.top + row.bottom) / 2
  const clamp = (p: number) => Math.min(end, Math.max(start, p))
  const left = view.posAtCoords({ left: box.left + 1, top: mid })
  const right = view.posAtCoords({ left: box.right - 1, top: mid })
  if (!left || !right) return whole
  let a = clamp(left.pos)
  let b = clamp(right.pos)
  if (a > b) [a, b] = [b, a]
  return a === b ? whole : [a, b]
}

/**
 * The range a tap count selects at `pos`: 2 = the word, 3 = the visual line
 * (`y` is the tap's screen y), 4 or more = the whole block.
 */
export function rangeForTaps(
  view: LineView,
  pos: number,
  taps: number,
  y = 0,
): [number, number] | null {
  const $pos = view.state.doc.resolve(pos)
  if (!$pos.parent.inlineContent) return null
  if (taps >= 4) {
    return $pos.start() === $pos.end() ? null : [$pos.start(), $pos.end()]
  }
  if (taps === 3) return visualLineRange(view, pos, y)
  const word = wordAround($pos.parent.textContent, $pos.parentOffset)
  return word ? [$pos.start() + word[0], $pos.start() + word[1]] : null
}

/** Counts taps (pure, tested): same spot and quick enough add up. */
export function nextTapCount(
  last: { at: number; x: number; y: number; count: number } | null,
  now: number,
  x: number,
  y: number,
): number {
  if (
    last &&
    now - last.at < TAP_MS &&
    Math.hypot(x - last.x, y - last.y) <= TAP_PX
  ) {
    return last.count + 1
  }
  return 1
}

/** A tap that selects a box is under way: the ink pad must not place a caret. */
let boxTapUntil = 0
export const boxTapPending = (): boolean => Date.now() < boxTapUntil

/** Fired on window when a first tap selects a box: detail {id, add}. */
export const PICK_BOX = 'ln:pick-box'

/**
 * 1 when a tap on this editor's box first selects the box (Lasso, an extra
 * box that is not picked): every count then moves up by one. 0 when the box
 * is active already (Text tool, the page's main box, a picked box).
 */
function boxShift(dom: HTMLElement, tool: string): number {
  const box = dom.closest('[data-paper-box]')
  if (!box || tool === 'text') return 0
  if (box.getAttribute('data-paper-box') === 'main') return 0
  return box.hasAttribute('data-picked') ? 0 : 1
}

/** Is this editor in a paper box that is picked now? */
const isPicked = (dom: HTMLElement): boolean =>
  !!dom.closest('[data-paper-box][data-picked]')

/** The browser's own mouse events of a box-selecting tap are cancelled. */
function swallowCaret(doc: Document) {
  const stop = (ev: Event) => {
    ev.preventDefault()
    ev.stopPropagation()
  }
  const names = ['mousedown', 'mouseup', 'click']
  const off = () => {
    window.clearTimeout(timer)
    for (const n of names) doc.removeEventListener(n, stop, true)
  }
  const done = (ev: Event) => {
    stop(ev)
    off()
  }
  for (const n of names) doc.addEventListener(n, stop, true)
  doc.removeEventListener('click', stop, true)
  doc.addEventListener('click', done, true)
  const timer = window.setTimeout(() => {
    off()
    doc.removeEventListener('click', done, true)
  }, 350)
}

/** Set on the pointerup of a tap that selected: other tap listeners stand back. */
export const TAP_SELECTED = 'lnTapSelected'
export const tapSelected = (e: Event): boolean =>
  (e as Event & { [TAP_SELECTED]?: boolean })[TAP_SELECTED] === true

export function watchTapSelect(
  editor: Editor,
  onSelected: () => void,
): () => void {
  const dom = editor.domElement
  if (!dom) return () => {}
  const doc = dom.ownerDocument
  type Tap = {
    id: number
    x: number
    y: number
    at: number
    count: number
    /** 1 when the first tap of the run found its box not active (it selects the box). */
    shift: number
  }
  let down: Tap | null = null
  let last: Tap | null = null

  const inText = (target: EventTarget | null) =>
    target instanceof Element &&
    dom.contains(target) &&
    !target.closest('a, button, input, textarea, select') &&
    [null, dom].includes(target.closest('[contenteditable="false"]'))

  /** Is this Pencil touch a second (or later) tap on the words? */
  const ours = (target: EventTarget | null, x: number, y: number) =>
    activeTool.get() === 'text' &&
    inText(target) &&
    nextTapCount(last, Date.now(), x, y) >= 2

  const onDown = (e: PointerEvent) => {
    // Finger, Pencil and mouse count alike (owner, 10 Nov, items 11 and 20).
    if (e.button > 0) return
    const tool = activeTool.get()
    if (tool !== 'text' && tool !== 'lasso') {
      down = null
      return
    }
    // Under the Lasso the ink pad covers the words: look through it.
    const pad = padOf(e.target)
    const target = pad
      ? lookThrough(pad, () => doc.elementFromPoint(e.clientX, e.clientY))
      : e.target
    if (!inText(target)) {
      down = null
      return
    }
    // Under the Lasso only paper boxes count taps (item 11); the page's own
    // text keeps the Lasso's table (a double tap selects nothing).
    if (tool === 'lasso' && boxShift(dom, tool) === 0 && !isPicked(dom)) {
      down = null
      return
    }
    const now = Date.now()
    const count = nextTapCount(last, now, e.clientX, e.clientY)
    const shift = count > 1 && last ? last.shift : boxShift(dom, tool)
    down = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      at: now,
      count,
      shift,
    }
    const level = count - shift
    // The tap that selects a box types nothing and shows no keyboard; the
    // taps after the first on the Pencil are held off (R6-18).
    if (level <= 0) {
      boxTapUntil = Date.now() + 500
      swallowCaret(doc)
      if (e.cancelable) e.preventDefault()
    } else if (e.pointerType === 'pen' && count >= 2 && e.cancelable) {
      e.preventDefault()
    }
  }
  // Safari reports the Pencil as a touch of type "stylus": its own double
  // tap (and Scribble's dot) start there, so that touch is cancelled too.
  const onTouchStart = (e: TouchEvent) => {
    if (!e.cancelable) return
    const touch = Array.from(e.changedTouches).find(
      (t) => (t as Touch & { touchType?: string }).touchType === 'stylus',
    )
    if (
      touch &&
      (ours(e.target, touch.clientX, touch.clientY) ||
        (down && down.count - down.shift <= 0))
    ) {
      e.preventDefault()
    }
  }
  const onUp = (e: PointerEvent) => {
    if (!down || e.pointerId !== down.id) return
    const start = down
    down = null
    // A drag or a hold (press-and-hold selects, holdSelect.ts) is not a tap.
    if (
      Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_PX ||
      Date.now() - start.at > TAP_HOLD_MS
    ) {
      last = null
      return
    }
    const count = start.count
    const level = count - start.shift
    last = { ...start, at: Date.now(), x: e.clientX, y: e.clientY }
    const view = editor.prosemirrorView
    if (!view) return
    if (level <= 0) {
      // First tap on a box that is not active: select the BOX (frame, handles,
      // box bar); the caret stays out until the next tap.
      const id = dom.closest('[data-paper-box]')?.getAttribute('data-paper-box')
      if (id) {
        window.dispatchEvent(
          new CustomEvent(PICK_BOX, { detail: { id, add: e.shiftKey } }),
        )
        if (dom.contains(doc.activeElement))
          (doc.activeElement as HTMLElement).blur()
      }
      return
    }
    // The first caret tap is the browser's own (Text tool) or the ink pad's
    // (Lasso); in a paper box under the Lasso it is placed here.
    const inBox = !!dom.closest('[data-paper-box]:not([data-paper-box="main"])')
    if (level === 1 && (activeTool.get() === 'text' || !inBox)) return
    const pos = lookThrough(padOf(e.target), () =>
      posNear(view, e.clientX, e.clientY),
    )
    if (pos === null) return
    if (level === 1) {
      // The caret goes exactly where the tap landed (Lasso, picked box).
      setTimeout(() => {
        if (pos > view.state.doc.content.size) return
        view.dispatch(
          view.state.tr.setSelection(
            TextSelection.near(view.state.doc.resolve(pos)),
          ),
        )
        view.dom.focus({ preventScroll: true })
        keepSelection()
      }, 0)
      return
    }
    const range = rangeForTaps(view, pos, level, e.clientY)
    if (!range) return
    ;(e as PointerEvent & { [TAP_SELECTED]?: boolean })[TAP_SELECTED] = true
    // Grace period: nothing may erase or replace this selection for a moment.
    noteTapSelected()
    // After the browser's own tap handling, so ours is what stays.
    setTimeout(() => {
      const d = view.state.doc
      if (range[1] > d.content.size) return
      noteTapSelected()
      view.dispatch(
        view.state.tr.setSelection(TextSelection.create(d, range[0], range[1])),
      )
      try {
        const a = view.domAtPos(range[0])
        const h = view.domAtPos(range[1])
        doc.getSelection()?.setBaseAndExtent(a.node, a.offset, h.node, h.offset)
      } catch {
        // The editor's own selection is set; the browser copy is cosmetic.
      }
      view.dom.focus({ preventScroll: true })
      // A late collapse (the tap's synthetic click, a focus change) is put back.
      keepSelection()
      onSelected()
    }, 0)
  }
  doc.addEventListener('pointerdown', onDown, true)
  // A cancelled tap (the system took the touch) is not a tap and not a lift
  // to wait for: the count must not carry a dead press into the next tap.
  const onCancel = (e: PointerEvent) => {
    if (down && e.pointerId === down.id) down = null
  }
  doc.addEventListener('pointerup', onUp, true)
  doc.addEventListener('pointercancel', onCancel, true)
  doc.addEventListener('touchstart', onTouchStart, {
    capture: true,
    passive: false,
  })
  // The watchdog (R7-6): a tap whose lift was lost in the background, or a
  // stale count, must not swallow or miscount the next taps.
  const offReset = onGestureReset(() => {
    down = null
    last = null
  })
  const offState = registerToolState('tapSelect', () => ({
    down: down ? `#${down.id} count ${down.count}` : null,
    lastCount: last?.count ?? 0,
    lastShift: last?.shift ?? 0,
    lastAgoMs: last ? Date.now() - last.at : null,
    editable: dom.getAttribute('contenteditable'),
    inert: dom.hasAttribute('inert'),
    focused: dom.contains(doc.activeElement),
  }))
  return () => {
    offReset()
    offState()
    doc.removeEventListener('pointerdown', onDown, true)
    doc.removeEventListener('pointerup', onUp, true)
    doc.removeEventListener('pointercancel', onCancel, true)
    doc.removeEventListener('touchstart', onTouchStart, true)
  }
}
