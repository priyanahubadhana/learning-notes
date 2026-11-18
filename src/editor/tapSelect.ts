import { TextSelection } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'
import { onGestureReset, registerToolState } from '../app/gestureReset'
import { isOn } from '../app/flags'
import { gapMs, stampNow, stampOf, withinGap } from '../app/tapTiming'
import { activeTool } from '../app/tools/main/mainTools'
import { keepSelection } from './ownSelection'
import { noteTapSelected } from './penGuard'
import { wordAround } from './penSelect'
import { tokenAround, type Lean } from './textTokens'
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

/** Real iPad timing (owner, 7 Nov): taps up to this far apart add up (switch
 * textbox.v2: the one page timing of tapTiming.ts, C14). */
const TAP_MS = 450
/** Taps this close together (px) count as the same spot. */
const TAP_PX = 12
/**
 * C19 (switch textbox.v2; owner's iPad re-test, 16 Nov): a hand's second tap
 * lands a little off the first. Taps this close (px) are the same spot, and
 * so is any tap on the same word as the one before.
 */
export const TAP_WIDE_PX = 24
/** A Pencil tap this close (px) to the text cursor is "on the cursor" (C19). */
const CARET_NEAR_PX = 24
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
 * posAtCoords at (x, y), looking through anything drawn over the text there
 * (a box's resize handles sit on its edges): WebKit hit-tests the overlay
 * and answers a position near the block start instead of the row's edge.
 * Overlays are made click-through only for the measurement.
 */
function probe(view: LineView, el: Element, x: number, y: number) {
  const hidden: [HTMLElement, string][] = []
  try {
    if (typeof document !== 'undefined') {
      for (let i = 0; i < 4; i++) {
        const hit = document.elementFromPoint(x, y) as HTMLElement | null
        if (!hit || el.contains(hit) || hit.contains(el)) break
        hidden.push([hit, hit.style.pointerEvents])
        hit.style.pointerEvents = 'none'
      }
    }
    return view.posAtCoords({ left: x, top: y })
  } finally {
    for (const [h, pe] of hidden) h.style.pointerEvents = pe
  }
}

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
  // C5 (switch textbox.v2): the tap's own height when it is on the row. A
  // tall glyph (①) makes WebKit's caret box reach into the next row, and its
  // middle there took part of the next line.
  // C27: kept off the row's top and bottom edge: in a box as wide as the line
  // the probes sit far from the text, and a tap at the very edge of the row
  // answered the row above.
  const edge = (row.bottom - row.top) * 0.3
  const mid =
    isOn('textbox.v2') && y >= row.top && y <= row.bottom
      ? Math.min(Math.max(y, row.top + edge), row.bottom - edge)
      : (row.top + row.bottom) / 2
  const clamp = (p: number) => Math.min(end, Math.max(start, p))
  const left = probe(view, el, box.left + 1, mid)
  const right = probe(view, el, box.right - 1, mid)
  if (!left || !right) return whole
  let a = clamp(left.pos)
  let b = clamp(right.pos)
  if (a > b) [a, b] = [b, a]
  if (a === b) return whole
  return isOn('textbox.v2') ? withinBreaks($pos, pos, a, b) : [a, b]
}

/**
 * C5 (switch textbox.v2): a box's lines are one paragraph with line breaks,
 * and WebKit's hit test past a line's end can answer a place on the next
 * line. A visual line never crosses a line break around the tapped spot.
 */
function withinBreaks(
  $pos: ReturnType<EditorView['state']['doc']['resolve']>,
  pos: number,
  a: number,
  b: number,
): [number, number] {
  let from = a
  let to = b
  const start = $pos.start()
  $pos.parent.forEach((child, offset) => {
    if (child.isText) return
    const at = start + offset
    if (at < pos && at + child.nodeSize > from) from = at + child.nodeSize
    if (at >= pos && at < to) to = at
  })
  return from < to ? [from, to] : [a, b]
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
  x?: number,
): [number, number] | null {
  const $pos = view.state.doc.resolve(pos)
  if (!$pos.parent.inlineContent) return null
  if (taps >= 4) {
    return $pos.start() === $pos.end() ? null : [$pos.start(), $pos.end()]
  }
  if (taps === 3) return visualLineRange(view, pos, y)
  // A line break (or any inline leaf) counts one position but no text: it is
  // given one blank character, or every word after it would be found early.
  const text = $pos.parent.textBetween(
    0,
    $pos.parent.content.size,
    undefined,
    ' ',
  )
  // C5 (switch textbox.v2): symbols count too, and the character on the
  // tap's side of the caret is the one tapped ("6," tapped on the comma
  // picks the comma, not the 6).
  const symbols = isOn('textbox.v2')
  const word = symbols
    ? tokenAround(text, $pos.parentOffset, true, leanAt(view, pos, x, y))
    : wordAround(text, $pos.parentOffset)
  return word ? [$pos.start() + word[0], $pos.start() + word[1]] : null
}

/**
 * The character the tap at (x, y) is on, near caret `pos` (C5). WebKit's
 * hit test is off by one around a wide glyph (an arrow, ①): a tap on the
 * right half of ① gave the caret before it. The characters' own boxes
 * decide: the caret goes to the nearer side of the tapped character, and
 * `lean` says on which side of the caret that character is.
 */
export function snapToChar(
  view: Pick<EditorView, 'state' | 'domAtPos'>,
  pos: number,
  x: number,
  y: number,
): { caret: number; lean: Lean } {
  const none = { caret: pos, lean: 'any' as Lean }
  if (typeof document === 'undefined') return none
  try {
    const $pos = view.state.doc.resolve(pos)
    if (!$pos.parent.inlineContent) return none
    const start = $pos.start()
    const end = $pos.end()
    for (const p of [pos, pos - 1, pos + 1, pos - 2]) {
      if (p < start || p + 1 > end) continue
      const a = view.domAtPos(p, 1)
      const b = view.domAtPos(p + 1, -1)
      const r = document.createRange()
      r.setStart(a.node, a.offset)
      r.setEnd(b.node, b.offset)
      const box = r.getBoundingClientRect()
      if (box.width === 0) continue
      if (x < box.left || x > box.right) continue
      if (y < box.top - 2 || y > box.bottom + 2) continue
      const el = a.node.nodeType === 1 ? a.node : a.node.parentElement
      const rtl =
        el instanceof Element && getComputedStyle(el).direction === 'rtl'
      const firstHalf = x < box.left + box.width / 2 !== rtl
      return firstHalf
        ? { caret: p, lean: 'after' }
        : { caret: p + 1, lean: 'before' }
    }
  } catch {
    // The hit test's own position stands.
  }
  return none
}

/** Which side of caret `pos` the tap at (x, y) was on (none known: 'any'). */
function leanAt(view: LineView, pos: number, x?: number, y?: number): Lean {
  if (x === undefined || y === undefined) return 'any'
  return snapToChar(view as unknown as EditorView, pos, x, y).lean
}

/** Counts taps (pure, tested): same spot and quick enough add up. */
export function nextTapCount(
  last: { at: number; x: number; y: number; count: number } | null,
  now: number,
  x: number,
  y: number,
  /** The tap is on the same word as the one before (C19). */
  sameWord = false,
): number {
  if (
    last &&
    withinGap(now - last.at, TAP_MS) &&
    (sameWord ||
      Math.hypot(x - last.x, y - last.y) <=
        (isOn('textbox.v2') ? TAP_WIDE_PX : TAP_PX))
  ) {
    return last.count + 1
  }
  return 1
}

/**
 * Set on the pointerdown of a press on a selection handle that is really the
 * next tap of a run on the words (sweep 2B, switch textbox.v2): on a short
 * word the handles sit over the row's top and bottom edge, and a fast third
 * tap landed on one, so the line was never selected. The handle stands back.
 */
const HANDLE_TAP = 'lnHandleTap'
/** The selection handle under a press (switch textbox.v2), else null. */
const handleOf = (target: EventTarget | null): HTMLElement | null =>
  isOn('textbox.v2') && target instanceof HTMLElement
    ? target.closest<HTMLElement>('[data-sel-handle]')
    : null
export const handleTapped = (e: Event): boolean =>
  (e as Event & { [HANDLE_TAP]?: boolean })[HANDLE_TAP] === true

/** A tap that selects a box is under way: the ink pad must not place a caret. */
let boxTapUntil = 0
export const boxTapPending = (): boolean => Date.now() < boxTapUntil

/**
 * Owner 18 Nov: until this time (ms) the lift of a touch is cancelled. Set by
 * the box tap rules (paper/v2) for a tap that only selects a box or keeps the
 * caret: iOS reads a lift on the text as "show Paste / Select / AutoFill".
 */
export const touchEndHold = { until: 0 }

/** Fired on window when a first tap selects a box: detail {id, add}. */
export const PICK_BOX = 'ln:pick-box'

/** Text box v2 (2B.3): with the Text tool too, the first tap selects the box. */
export const textFirstTap = { on: false }

/**
 * 1 when a tap on this editor's box first selects the box (Lasso, an extra
 * box that is not picked): every count then moves up by one. 0 when the box
 * is active already (Text tool, the page's main box, a picked box).
 */
export function boxShift(dom: HTMLElement, tool: string): number {
  const box = dom.closest('[data-paper-box]')
  if (!box || (tool === 'text' && !textFirstTap.on)) return 0
  if (box.getAttribute('data-paper-box') === 'main') return 0
  // C30 (owner 17 Nov): a box with the caret in it (or its words selected
  // by taps, which keep the typing look) is active already.
  if (
    tool === 'text' &&
    isOn('textbox.v2') &&
    (dom.contains(dom.ownerDocument.activeElement) ||
      box.hasAttribute('data-typing'))
  )
    return 0
  return box.hasAttribute('data-picked') ? 0 : 1
}

/**
 * What the Nth quick tap of a run does: 0 selects the box, 1 the caret, 2 the
 * word, 3 the line, 4 the paragraph. With text box v2 on (`strict`, Text
 * tool) the first tap that selects a box is not counted: the count starts
 * with the next tap, so a double tap on an unselected box never selects a
 * word (TB-04). Otherwise the count moves up by one, as before.
 */
export function tapLevel(
  count: number,
  shift: number,
  strict: boolean,
): number {
  if (strict) return Math.max(0, count - shift)
  return count === 1 ? 1 - shift : count
}

/**
 * Owner 18 Nov: "near the words" is about one letter's width (a letter is
 * about 0.6 em wide) sideways from the nearest word of a line. Further out in
 * the empty part, a tap selects the box.
 */
export const NEAR_REACH_EM = 0.6

/** A tap this close to a box's right edge (or outside it) is on its border (px). */
const BORDER_PX = 6

/**
 * C30 (owner 17 Nov): is (x, y) on a written line of the editor, or up to one
 * letter's width (NEAR_REACH_EM, in that line's font size) before or past its words?
 */
export function nearText(dom: HTMLElement, x: number, y: number): boolean {
  // Owner 18 Nov, rule 3: a tap on or next to the box's border (side edges)
  // selects the box, even where the words run to that edge.
  const boxEl = dom.closest('[data-paper-box]')
  if (boxEl) {
    const b = boxEl.getBoundingClientRect()
    if (b.width > 0 && (x < b.left || x > b.right - BORDER_PX)) return false
  }
  const range = dom.ownerDocument.createRange()
  // Owner 18 Nov: on an empty page the grey hint line counts as text, so a tap
  // on or near it gives the caret; only a tap clearly away selects the box.
  const hint = dom.closest('[data-paper-box="main"]')
    ? dom.ownerDocument.querySelector<HTMLElement>('[data-paper-hint]')
    : null
  if (hint && !dom.textContent?.trim()) {
    const h = hint.getBoundingClientRect()
    const hs = getComputedStyle(hint)
    const hf = parseFloat(hs.fontSize) || 14
    const hl = parseFloat(hs.lineHeight) || hf * 1.5
    if (
      h.width > 0 &&
      Math.abs(y - (h.top + h.bottom) / 2) <= hl / 2 &&
      x >= h.left - NEAR_REACH_EM * hf &&
      x <= h.right + NEAR_REACH_EM * hf
    )
      return true
  }
  for (const el of dom.querySelectorAll<HTMLElement>('.bn-inline-content')) {
    const st = getComputedStyle(el)
    const fs = parseFloat(st.fontSize) || 16
    const lh = parseFloat(st.lineHeight) || fs * 1.5
    const reach = NEAR_REACH_EM * fs
    range.selectNodeContents(el)
    const rects = [...range.getClientRects()].filter(
      (r) => r.width > 0 && r.height > 0,
    )
    // C34 (owner 18 Nov): an empty line has no words to be near. Its own box
    // counts: from its left edge (where the caret stands) to one letter
    // past it, on its own row. The rest of the box is empty part.
    if (!rects.length && !el.textContent) {
      const b = el.getBoundingClientRect()
      if (b.height === 0) continue
      if (Math.abs(y - (b.top + b.bottom) / 2) > Math.max(lh, b.height) / 2)
        continue
      if (x >= b.left && x <= b.left + reach) return true
      continue
    }
    for (const r of rects) {
      if (r.width === 0 || r.height === 0) continue
      if (Math.abs(y - (r.top + r.bottom) / 2) > lh / 2) continue
      if (x >= r.left - reach && x <= r.right + reach) return true
    }
  }
  return false
}

/**
 * C30 (switch textbox.v2, Text tool): will a first tap here put the caret in
 * the box at once? On or near the words of a box (not the page's first) that
 * is not selected, and not on a link (a link tap selects the box, as before).
 */
export function firstTapCaret(
  target: Element | null,
  x: number,
  y: number,
): boolean {
  if (!isOn('textbox.v2') || activeTool.get() !== 'text') return false
  const dom = target?.closest<HTMLElement>('.ProseMirror')
  return (
    !!dom &&
    !!dom.closest('[data-paper-box]:not([data-paper-box="main"])') &&
    !target?.closest('a') &&
    nearText(dom, x, y)
  )
}

/** Is this editor in a paper box that is picked now? */
const isPicked = (dom: HTMLElement): boolean =>
  !!dom.closest('[data-paper-box][data-picked]')

/** The browser's own mouse events of a box-selecting tap are cancelled. */
function swallowCaret(
  dom: HTMLElement,
  hit: EventTarget | null,
  /** C30: only the lift and click on a link are held (the caret is placed). */
  linksOnly = false,
) {
  const doc = dom.ownerDocument
  const stop = (ev: Event) => {
    // Why: the tap's own mouse events land in this editor (Safari may move
    // them onto a link, page link or toggle next to the words) or on the ink
    // pad it hit: all are held back. Only a tap elsewhere right after (the box
    // bar, its ⋯ list) answers at once.
    const to = ev.target instanceof Node ? ev.target : null
    if (to && !dom.contains(to) && to !== hit) return
    if (linksOnly && !(to instanceof Element && to.closest('a'))) return
    ev.preventDefault()
    ev.stopPropagation()
  }
  const names = linksOnly
    ? ['mouseup', 'click']
    : ['mousedown', 'mouseup', 'click']
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

const TOUCH_NAMES = ['touchstart', 'touchend'] as const

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
    tool: string
    /** Sweep 2B: the press landed on a selection handle. */
    handle?: boolean
    /** C30: what the first tap does, by where it landed. */
    first?: 'caret' | 'box'
  }
  const strictFor = (tool: string) => tool === 'text' && textFirstTap.on
  let down: Tap | null = null
  let last: Tap | null = null
  // WebKit runs its own triple-click paragraph select on the third mousedown,
  // and ProseMirror selects the whole paragraph on the third mouseup/click;
  // both land around our selection and win. From the second tap of a run,
  // until its click has passed, the mouse events of the tap never reach them:
  // the tap counter here is the only one.
  let ownMouseUntil = 0
  // Counts caret taps and presses: a late caret fix-up stands back for a newer tap.
  let caretTap = 0
  const mouseNames = ['mousedown', 'mouseup', 'click', 'dblclick']
  const onMouse = (e: Event) => {
    if (stampOf(e) >= ownMouseUntil) return
    if (!inText(e.target)) return
    e.preventDefault()
    e.stopImmediatePropagation()
  }

  const inText = (target: EventTarget | null) =>
    target instanceof Element &&
    dom.contains(target) &&
    !target.closest('a, button, input, textarea, select') &&
    [null, dom].includes(target.closest('[contenteditable="false"]'))

  /** The word or symbol run at (x, y), as a document range (C19). */
  const wordAt = (x: number, y: number, pad: HTMLElement | null) => {
    const view = editor.prosemirrorView
    if (!view) return null
    try {
      return lookThrough(pad, () => {
        const hit = posNear(view, x, y)
        if (hit === null) return null
        const pos = snapToChar(view, hit, x, y).caret
        return rangeForTaps(view, pos, 2, y, x)
      })
    } catch {
      return null
    }
  }
  /**
   * Which tap of a run this is (C19, switch textbox.v2): a tap further than
   * 24 px from the one before still adds up when it is on the same word.
   */
  const countAt = (
    at: number,
    x: number,
    y: number,
    pad: HTMLElement | null,
  ): number => {
    const near = nextTapCount(last, at, x, y)
    if (near > 1 || !last || !isOn('textbox.v2')) return near
    if (!withinGap(at - last.at, TAP_MS)) return 1
    const a = wordAt(last.x, last.y, pad)
    const b = a && wordAt(x, y, pad)
    return nextTapCount(last, at, x, y, !!b && a[0] === b[0] && a[1] === b[1])
  }
  /**
   * Is the Pencil tap at (x, y) on or next to the text cursor (or an end of
   * the selection) of this editor, while it has the focus (C19)?
   */
  const onCaret = (x: number, y: number): boolean => {
    const view = editor.prosemirrorView
    if (!view || !isOn('textbox.v2') || !view.hasFocus()) return false
    try {
      const sel = view.state.selection
      return [sel.head, sel.anchor].some((p) => {
        const c = view.coordsAtPos(p)
        return (
          Math.abs(x - c.left) <= CARET_NEAR_PX &&
          y >= c.top - 8 &&
          y <= c.bottom + 8
        )
      })
    } catch {
      return false
    }
  }
  // C19: until this time stamp, the lift of a Pencil tap on the cursor is ours.
  let ownTouchEndUntil = 0

  /** Is this Pencil touch a second (or later) tap on the words? */
  const ours = (target: EventTarget | null, at: number, x: number, y: number) =>
    activeTool.get() === 'text' &&
    inText(target) &&
    countAt(at, x, y, null) >= 2

  const onDown = (e: PointerEvent) => {
    caretTap++
    // Finger, Pencil and mouse count alike (owner, 10 Nov, items 11 and 20).
    if (e.button > 0) return
    const tool = activeTool.get()
    if (tool !== 'text' && tool !== 'lasso') {
      down = null
      return
    }
    // Under the Lasso the ink pad covers the words: look through it.
    const pad = padOf(e.target)
    // Sweep 2B: a press on a selection handle may be the next tap on the words.
    const handle = handleOf(e.target)
    const target =
      pad || handle
        ? lookThrough(pad ?? handle, () =>
            doc.elementFromPoint(e.clientX, e.clientY),
          )
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
    // C14: the event's own time stamp, not when this listener ran.
    const now = stampOf(e)
    const count = countAt(now, e.clientX, e.clientY, pad ?? handle)
    // A handle press that adds to a run is a tap: the handle stands back. A
    // first press stays the handle's (a drag); lifted where it began, it is
    // a tap on the words under it, like any other.
    if (handle && count >= 2)
      (e as PointerEvent & { [HANDLE_TAP]?: boolean })[HANDLE_TAP] = true
    let shift = count > 1 && last ? last.shift : boxShift(dom, tool)
    // C30 (owner 17 Nov, switch textbox.v2, Text tool): the first tap in a
    // box goes by where it lands. On or near the words of a box that is not
    // selected: the caret, at once. In the empty part of a selected box: it
    // stays selected. The word/line count still starts with the next tap.
    let first: 'caret' | 'box' | undefined
    if (
      isOn('textbox.v2') &&
      tool === 'text' &&
      count === 1 &&
      dom.closest('[data-paper-box]:not([data-paper-box="main"])')
    ) {
      const near = nearText(dom, e.clientX, e.clientY)
      // A tap on a link keeps the old way (it selects the box and opens no
      // link; the caret and the link follow with the next tap).
      const onLink = target instanceof Element && !!target.closest('a')
      if (shift >= 1 && near && !onLink) first = 'caret'
      else if (
        shift === 0 &&
        !near &&
        isPicked(dom) &&
        !dom.contains(doc.activeElement)
      ) {
        first = 'box'
        shift = 1
      }
    }
    down = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      at: now,
      count,
      shift,
      tool,
      handle: !!handle,
      first,
    }
    const level =
      first === 'caret'
        ? 1
        : first === 'box'
          ? 0
          : tapLevel(count, shift, strictFor(tool))
    // C5 (switch textbox.v2): a Pencil caret tap in a box is placed here
    // (onUp); WebKit's own mousedown would put it on the wrong side of a wide
    // glyph, so the tap's mouse events are held back too.
    const ownCaret =
      level === 1 &&
      e.pointerType === 'pen' &&
      isOn('textbox.v2') &&
      !!dom.closest('[data-paper-box]:not([data-paper-box="main"])')
    ownMouseUntil = level >= 2 || ownCaret ? now + 700 : 0
    // The tap that selects a box types nothing and shows no keyboard; the
    // taps after the first on the Pencil are held off (R6-18).
    if (level <= 0) {
      boxTapUntil = Date.now() + 500
      swallowCaret(dom, e.target)
      if (e.cancelable) e.preventDefault()
    } else if (e.pointerType === 'pen' && count >= 2 && e.cancelable) {
      e.preventDefault()
    }
    // C30: a first tap that puts the caret in a box opens no link: Safari may
    // send the tap's click to a link next to the words.
    if (first === 'caret') swallowCaret(dom, e.target, true)
  }
  // Safari reports the Pencil as a touch of type "stylus": its own double
  // tap (and Scribble's dot) start there, so that touch is cancelled too.
  const onTouchStart = (e: TouchEvent) => {
    if (!e.cancelable) return
    if (e.type === 'touchend') {
      if (Date.now() < touchEndHold.until) {
        e.preventDefault()
        return
      }
      // C19: the lift of a Pencil tap on the text cursor. iPadOS reads a tap
      // on the cursor as "show the edit menu" (Paste, Select): the menu
      // flashed, and it took the next tap of a double tap. Only the lift is
      // cancelled, and only for a tap: a touch that starts a Scribble stroke
      // at the cursor is never held back. The cursor is placed here (onUp).
      if (stampOf(e) >= ownTouchEndUntil) return
      ownTouchEndUntil = 0
      if (
        Array.from(e.changedTouches).some(
          (t) => (t as Touch & { touchType?: string }).touchType === 'stylus',
        )
      )
        e.preventDefault()
      return
    }
    const touch = Array.from(e.changedTouches).find(
      (t) => (t as Touch & { touchType?: string }).touchType === 'stylus',
    )
    if (
      touch &&
      (ours(e.target, stampOf(e), touch.clientX, touch.clientY) ||
        (down && down.count === 1 && down.shift >= 1))
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
      stampOf(e) - start.at > TAP_HOLD_MS
    ) {
      last = null
      return
    }
    const count = start.count
    const level =
      start.first === 'caret'
        ? 1
        : start.first === 'box'
          ? 0
          : tapLevel(count, start.shift, strictFor(start.tool))
    last = { ...start, at: stampOf(e), x: e.clientX, y: e.clientY }
    // A lone tap on a handle starts a run but moves no caret (as before).
    if (start.handle && level === 1) return
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
    // C19: a Pencil tap on the cursor is placed here too, and its lift and
    // its mouse events are kept from the browser (no edit menu).
    const caretTapped =
      level === 1 &&
      e.pointerType === 'pen' &&
      start.tool === 'text' &&
      onCaret(start.x, start.y)
    if (caretTapped) {
      ownTouchEndUntil = stampOf(e) + 300
      ownMouseUntil = stampOf(e) + 700
    }
    if (level === 1 && !inBox && !caretTapped) return
    // Under the Lasso the ink pad covers the words: every hit test (the tap's
    // spot and the line's edges) looks through it, or WebKit finds no text at
    // the edges and a triple tap selects the whole paragraph. The same for a
    // selection handle the tap landed on (sweep 2B).
    const pad = padOf(e.target) ?? handleOf(e.target)
    // C14 (switch textbox.v2): where the tip touched down; a Pencil drifts a
    // few px before it lifts, onto the next character.
    const tip = isOn('textbox.v2')
      ? { x: start.x, y: start.y }
      : { x: e.clientX, y: e.clientY }
    const hit = lookThrough(pad, () => posNear(view, tip.x, tip.y))
    if (hit === null) return
    // C5 (switch textbox.v2): next to the character actually tapped.
    const pos = isOn('textbox.v2')
      ? lookThrough(pad, () => snapToChar(view, hit, tip.x, tip.y)).caret
      : hit
    if (level === 1) {
      // The caret goes exactly where the tap landed (Lasso, picked box).
      // B7: keys can come before this timer runs (input beats timers on a busy
      // page, e.g. the first letters on a blank page). A caret put back at the
      // tap spot then would land before the typed letters, so it is skipped
      // once the text has changed since the tap.
      const docAtTap = view.state.doc
      setTimeout(() => {
        if (view.state.doc !== docAtTap) return
        if (pos > view.state.doc.content.size) return
        view.dispatch(
          view.state.tr.setSelection(
            TextSelection.near(view.state.doc.resolve(pos)),
          ),
        )
        view.dom.focus({ preventScroll: true })
        // C5 (switch textbox.v2): WebKit's focus puts back the browser's last
        // selection (the previous tap's caret) over the one set here; the
        // browser's copy is set again after the focus.
        keepSelection()
        // The browser's copy is put right once the tap run is over (no next
        // tap within the tap gap), unless another
        // tap began meanwhile (its own selection wins).
        const mine = ++caretTap
        if (isOn('textbox.v2'))
          setTimeout(
            () => {
              if (mine !== caretTap) return
              const sel = view.state.selection
              if (!sel.empty || sel.head !== pos) return
              try {
                const d = view.domAtPos(pos)
                const s = doc.getSelection()
                if (
                  !s ||
                  (s.anchorNode === d.node && s.anchorOffset === d.offset)
                )
                  return
                s.collapse(d.node, d.offset)
              } catch {
                // The editor's own selection is set; the browser copy is cosmetic.
              }
            },
            gapMs(450) + 20,
          )
      }, 0)
      return
    }
    const range = lookThrough(pad, () =>
      rangeForTaps(view, pos, level, tip.y, tip.x),
    )
    if (!range) return
    ;(e as PointerEvent & { [TAP_SELECTED]?: boolean })[TAP_SELECTED] = true
    // Grace period: nothing may erase or replace this selection for a moment.
    noteTapSelected(stampOf(e))
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
  for (const n of mouseNames) doc.addEventListener(n, onMouse, true)
  // A cancelled tap (the system took the touch) is not a tap and not a lift
  // to wait for: the count must not carry a dead press into the next tap.
  const onCancel = (e: PointerEvent) => {
    if (down && e.pointerId === down.id) down = null
  }
  doc.addEventListener('pointerup', onUp, true)
  doc.addEventListener('pointercancel', onCancel, true)
  // touchend too (C19): the lift of a Pencil tap on the cursor.
  for (const n of TOUCH_NAMES)
    doc.addEventListener(n, onTouchStart, { capture: true, passive: false })
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
    lastAgoMs: last ? Math.round(stampNow() - last.at) : null,
    editable: dom.getAttribute('contenteditable'),
    inert: dom.hasAttribute('inert'),
    focused: dom.contains(doc.activeElement),
  }))
  return () => {
    offReset()
    offState()
    doc.removeEventListener('pointerdown', onDown, true)
    for (const n of mouseNames) doc.removeEventListener(n, onMouse, true)
    doc.removeEventListener('pointerup', onUp, true)
    doc.removeEventListener('pointercancel', onCancel, true)
    for (const n of TOUCH_NAMES) doc.removeEventListener(n, onTouchStart, true)
  }
}
