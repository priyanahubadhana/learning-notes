import { TextSelection } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'
import { watchPointers } from '../app/input/pointerWatch'
import { isOn } from '../app/flags'
import { activeTool } from '../app/tools/main/mainTools'
import { wroteRecently } from '../app/input/penHold'
import { stampOf } from '../app/tapTiming'
import { keepSelection } from './ownSelection'
import { noteTapSelected } from './penGuard'
import { touchEndHold } from './tapSelect'
import type { AppSchema } from './schema'

/**
 * Pencil circle-select (F5 / F6, owner's iPad re-test 18 Nov). Circling words
 * with the Pencil selects them; the owner likes that. It was iPadOS Scribble's
 * own gesture, which picked the wrong words for a dash word or a date, nothing
 * for letters inside a word, moved the caret to the end, and showed Apple's
 * Paste / Select bar. Now the page reads the circle itself: a closed loop
 * drawn by the Pencil on the words selects exactly the characters whose
 * centre lies inside the loop, and our own strip opens in place of Apple's
 * bar. The lift of the stroke is cancelled so iPadOS adds nothing of its own.
 */

type Editor = AppSchema['BlockNoteEditor']
type P = { x: number; y: number }

/** The smallest loop (px) that counts: smaller strokes are handwriting. */
const MIN_W = 8
const MIN_H = 10
/** The loop must turn this far (rad, about 290 degrees) round its centre. */
const MIN_TURN = 5
/** The two ends of the loop may be this far apart (share of its size). */
const CLOSE_SHARE = 0.4
/** How long (ms) the lift of the loop is held back from iPadOS. */
const LIFT_MS = 600
/** Longest text range scanned (characters). */
const MAX_SCAN = 4000

/** A loop turns round once: its x and y each reverse about twice. */
const MAX_REVERSALS = 4
/** Moves under this (px) are jitter, not a change of direction. */
const JITTER_PX = 3

/** How often the path turns back along one axis (pure, tested). */
function reversals(v: number[]): number {
  let n = 0
  let dir = 0
  let ref = v[0]
  for (const x of v) {
    if (Math.abs(x - ref) < JITTER_PX) continue
    const d = Math.sign(x - ref)
    if (dir !== 0 && d !== dir) n++
    dir = d
    ref = x
  }
  return n
}

/** Is this path a closed loop (pure, tested)? */
export function isLoop(path: P[]): boolean {
  if (path.length < 8) return false
  const xs = path.map((p) => p.x)
  const ys = path.map((p) => p.y)
  const w = Math.max(...xs) - Math.min(...xs)
  const h = Math.max(...ys) - Math.min(...ys)
  if (w < MIN_W || h < MIN_H) return false
  const a = path[0]
  const b = path[path.length - 1]
  if (Math.hypot(a.x - b.x, a.y - b.y) > CLOSE_SHARE * Math.max(w, h))
    return false
  // A scribble-out (a zigzag over a word, C4/C24) coils round its centre as a
  // loop does, but it turns back again and again: it is not a circle.
  if (reversals(xs) > MAX_REVERSALS || reversals(ys) > MAX_REVERSALS)
    return false
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2
  let turn = 0
  for (let i = 1; i < path.length; i++) {
    const a1 = Math.atan2(path[i - 1].y - cy, path[i - 1].x - cx)
    const a2 = Math.atan2(path[i].y - cy, path[i].x - cx)
    let d = a2 - a1
    while (d > Math.PI) d -= 2 * Math.PI
    while (d < -Math.PI) d += 2 * Math.PI
    turn += d
  }
  return Math.abs(turn) >= MIN_TURN
}

/** Is (x, y) inside the polygon `path` (pure, tested)? */
export function inside(path: P[], x: number, y: number): boolean {
  let on = false
  for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
    const a = path[i]
    const b = path[j]
    if (
      a.y > y !== b.y > y &&
      x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    )
      on = !on
  }
  return on
}

/** A character of the page: its position and the centre of its box. */
export type Glyph = {
  pos: number
  x: number
  y: number
  space: boolean
  /** The glyph's box size; without it only the centre counts. */
  w?: number
  h?: number
}

/** Grid of sample points per glyph box (3 x 3) and how many must be inside. */
const GRID = 3
const NEEDED = 4

/**
 * Does this letter count as circled (pure, tested)? Owner rule "Circle select
 * is generous": about half of its box inside the loop is enough, not only its
 * centre. 4 of 9 sample points in the box.
 */
export function glyphInLoop(path: P[], g: Glyph): boolean {
  if (!g.w || !g.h) return inside(path, g.x, g.y)
  let hits = 0
  for (let i = 0; i < GRID; i++)
    for (let j = 0; j < GRID; j++) {
      const x = g.x + ((i + 0.5) / GRID - 0.5) * g.w
      const y = g.y + ((j + 0.5) / GRID - 0.5) * g.h
      if (inside(path, x, y)) hits++
    }
  return hits >= NEEDED
}

/**
 * The document range of the characters inside the loop (pure, tested): from
 * the first to the last glyph that is about half inside (glyphInLoop), spaces at the ends
 * left out. Null when none.
 */
export function rangeInLoop(
  path: P[],
  glyphs: Glyph[],
): [number, number] | null {
  const hit = glyphs.filter((g) => !g.space && glyphInLoop(path, g))
  if (hit.length === 0) return null
  const from = Math.min(...hit.map((g) => g.pos))
  const to = Math.max(...hit.map((g) => g.pos)) + 1
  return [from, to]
}

/** The glyphs of the text blocks that touch the loop's box. */
function glyphsNear(view: EditorView, path: P[]): Glyph[] {
  const xs = path.map((p) => p.x)
  const ys = path.map((p) => p.y)
  const box = {
    l: Math.min(...xs),
    r: Math.max(...xs),
    t: Math.min(...ys),
    b: Math.max(...ys),
  }
  const out: Glyph[] = []
  let scanned = 0
  view.state.doc.descendants((node, pos) => {
    if (!node.isTextblock || scanned > MAX_SCAN) return true
    const dom = view.nodeDOM(pos)
    if (dom instanceof HTMLElement) {
      const r = dom.getBoundingClientRect()
      if (r.bottom < box.t || r.top > box.b) return false
    }
    node.forEach((child, offset) => {
      if (!child.isText || !child.text) return
      const start = pos + 1 + offset
      for (let i = 0; i < child.text.length; i++) {
        scanned++
        try {
          const a = view.coordsAtPos(start + i, 1)
          const c = view.coordsAtPos(start + i + 1, -1)
          const sameLine = Math.abs(a.top - c.top) < 4 && c.left >= a.left
          const x = sameLine ? (a.left + c.left) / 2 : a.left + 3
          const w = sameLine ? c.left - a.left : 6
          const h = Math.max(a.bottom, c.bottom) - Math.min(a.top, c.top)
          const y = (a.top + a.bottom) / 2
          if (
            x + w / 2 < box.l ||
            x - w / 2 > box.r ||
            y + h / 2 < box.t ||
            y - h / 2 > box.b
          )
            continue
          out.push({
            pos: start + i,
            x,
            y,
            space: /\s/.test(child.text[i]),
          })
        } catch {
          // A position the view cannot measure is left out.
        }
      }
    })
    return false
  })
  return out
}

export function watchCircleSelect(
  editor: Editor,
  onSelected: () => void,
): () => void {
  const dom = editor.domElement
  if (!dom) return () => {}
  const doc = dom.ownerDocument
  let stroke: { id: number; path: P[] } | null = null
  const onDown = (e: PointerEvent) => {
    stroke = null
    if (e.pointerType !== 'pen' || e.button > 0) return
    if (!isOn('textbox.v2') || activeTool.get() !== 'text') return
    if (wroteRecently()) return
    if (!(e.target instanceof Node) || !dom.contains(e.target)) return
    if (e.target instanceof Element && e.target.closest('a, button, input'))
      return
    stroke = { id: e.pointerId, path: [{ x: e.clientX, y: e.clientY }] }
  }
  const onMove = (e: PointerEvent) => {
    if (!stroke || e.pointerId !== stroke.id) return
    if (dom.hasAttribute('data-hold-select')) {
      stroke = null
      return
    }
    // Safari delivers several points in one event (coalesced): all are used.
    const more = e.getCoalescedEvents?.() ?? []
    for (const c of more.length > 0 ? more : [e])
      stroke.path.push({ x: c.clientX, y: c.clientY })
  }
  const onEnd = (e: PointerEvent) => {
    if (!stroke || e.pointerId !== stroke.id) return
    const path = stroke.path
    stroke = null
    path.push({ x: e.clientX, y: e.clientY })
    const loop = isLoop(path)
    const view = editor.prosemirrorView
    if (!loop || !view) {
      return
    }
    const gl = glyphsNear(view, path)
    const range = rangeInLoop(path, gl)
    if (!range) return
    // The lift of the loop is ours: iPadOS adds no Paste / Select bar.
    touchEndHold.until = Date.now() + LIFT_MS
    noteTapSelected(stampOf(e))
    const apply = () => {
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
      // A late collapse (Scribble, a focus change) is put back.
      keepSelection()
      onSelected()
    }
    // After the browser's own handling of the stroke, so ours is what stays.
    setTimeout(apply, 0)
  }
  const stopWatch = watchPointers(doc.defaultView ?? window, {
    down: onDown,
    move: onMove,
    end: onEnd,
  })
  return () => {
    stopWatch()
  }
}
