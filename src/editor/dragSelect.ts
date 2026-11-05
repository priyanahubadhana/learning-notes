import { Selection, SelectionRange } from 'prosemirror-state'
import type { Mappable } from 'prosemirror-transform'
import type { Node as PMNode, ResolvedPos } from 'prosemirror-model'
import { beginSelectGesture, endSelectGesture, selectGesture } from './gesture'
import type { AppSchema } from './schema'

/**
 * Selecting across pictures. A drag that starts on a picture, ends on one or
 * passes over one selects whole blocks, pictures included, so Copy, Delete and
 * Move act on the whole range. Text-only drags are left to the browser.
 *
 * How: BlockNote's own selection is a text selection, which cannot start or
 * end in a picture (a block with no text). So when a pen or mouse drag
 * involves a picture, we set our own selection, `BlockRangeSelection`, that
 * covers whole blocks from the first to the last (the blocks at the level they
 * share, with their children). It copies, deletes and moves like any other
 * ProseMirror selection. Pictures inside any selection get a visible mark.
 */

type Editor = AppSchema['BlockNoteEditor']

/** Block types without text: the picture-like ones. */
export const MEDIA_TYPES = new Set(['image', 'video', 'audio', 'file'])

/** A selection of whole blocks (from before the first to after the last). */
export class BlockRangeSelection extends Selection {
  constructor($anchor: ResolvedPos, $head: ResolvedPos) {
    super($anchor, $head, [
      new SelectionRange($anchor.min($head), $anchor.max($head)),
    ])
  }
  map(doc: PMNode, mapping: Mappable): Selection {
    const from = mapping.mapResult(this.from)
    const to = mapping.mapResult(this.to)
    if (to.deleted || from.deleted) {
      return Selection.near(doc.resolve(Math.min(from.pos, doc.content.size)))
    }
    return new BlockRangeSelection(doc.resolve(from.pos), doc.resolve(to.pos))
  }
  eq(other: Selection): boolean {
    return (
      other instanceof BlockRangeSelection &&
      other.anchor === this.anchor &&
      other.head === this.head
    )
  }
  toJSON() {
    return { type: 'lnBlockRange', anchor: this.anchor, head: this.head }
  }
  static fromJSON(doc: PMNode, json: { anchor: number; head: number }) {
    return new BlockRangeSelection(
      doc.resolve(json.anchor),
      doc.resolve(json.head),
    )
  }
}
// No text cursor is drawn for it (ProseMirror's NodeSelection does the same).
Object.defineProperty(BlockRangeSelection.prototype, 'visible', {
  get: () => false,
})
Selection.jsonID('lnBlockRange', BlockRangeSelection)

/** Where the block container with this id starts (null if there is none). */
export function blockPos(doc: PMNode, id: string): number | null {
  let found: number | null = null
  doc.descendants((node, pos) => {
    if (found !== null) return false
    if (node.type.name === 'blockContainer' && node.attrs.id === id) {
      found = pos
      return false
    }
    return true
  })
  return found
}

/**
 * The range of whole blocks from block `a` to block `b` (either order): the
 * blocks at the level both share, children included. Null if one is missing.
 */
export function blockRange(
  doc: PMNode,
  a: string,
  b: string,
): { from: number; to: number } | null {
  const pa = blockPos(doc, a)
  const pb = blockPos(doc, b)
  if (pa === null || pb === null) return null
  const [first, last] = pa <= pb ? [pa, pb] : [pb, pa]
  const $first = doc.resolve(first)
  const $last = doc.resolve(last)
  const depth = $first.sharedDepth(last)
  const startIndex = $first.index(depth)
  const endIndex = $last.index(depth)
  const parent = $first.node(depth)
  return {
    from: $first.posAtIndex(startIndex, depth),
    to: $last.posAtIndex(endIndex, depth) + parent.child(endIndex).nodeSize,
  }
}

/** Is this block container a picture-like block? */
export const isMediaBlock = (node: PMNode): boolean =>
  node.type.name === 'blockContainer' &&
  MEDIA_TYPES.has(node.firstChild?.type.name ?? '')

/** Ids of the picture-like blocks inside a position range. */
export function mediaIdsBetween(
  doc: PMNode,
  from: number,
  to: number,
): string[] {
  const ids: string[] = []
  doc.nodesBetween(from, to, (node, pos) => {
    if (isMediaBlock(node) && pos < to && pos + node.nodeSize > from) {
      ids.push(String(node.attrs.id))
    }
    return true
  })
  return ids
}

/** Does the range from block a to block b hold a picture-like block? */
export function rangeHasMedia(doc: PMNode, a: string, b: string): boolean {
  const range = blockRange(doc, a, b)
  return !!range && mediaIdsBetween(doc, range.from, range.to).length > 0
}

/** Selects whole blocks from `a` to `b`; false if a block is missing. */
export function selectBlocks(editor: Editor, a: string, b: string): boolean {
  const view = editor.prosemirrorView
  if (!view) return false
  const { state } = view
  const range = blockRange(state.doc, a, b)
  if (!range) return false
  const forward = (blockPos(state.doc, a) ?? 0) <= (blockPos(state.doc, b) ?? 0)
  const from = state.doc.resolve(range.from)
  const to = state.doc.resolve(range.to)
  view.dispatch(
    state.tr.setSelection(
      forward
        ? new BlockRangeSelection(from, to)
        : new BlockRangeSelection(to, from),
    ),
  )
  return true
}

/** The block id under a point (or the nearest block above or below it). */
export function blockIdAt(
  dom: HTMLElement,
  x: number,
  y: number,
): string | null {
  const hit = dom.ownerDocument.elementFromPoint(x, y)
  const own = hit?.closest<HTMLElement>('.bn-block[data-id]')
  if (own && dom.contains(own)) return own.dataset.id ?? null
  // Between blocks or beside them: the block whose row is nearest.
  let best: { id: string; dist: number } | null = null
  for (const el of dom.querySelectorAll<HTMLElement>('.bn-block[data-id]')) {
    const content = el.querySelector<HTMLElement>(':scope > .bn-block-content')
    const r = (content ?? el).getBoundingClientRect()
    const dist = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0
    if (!best || dist < best.dist) best = { id: el.dataset.id!, dist }
  }
  return best?.id ?? null
}

/** Marks the pictures inside the selection (and clears old marks). */
export function markSelectedMedia(editor: Editor): void {
  const dom = editor.domElement
  const view = editor.prosemirrorView
  if (!dom || !view) return
  for (const el of dom.querySelectorAll('[data-ln-selected]')) {
    el.removeAttribute('data-ln-selected')
  }
  const { from, to, empty } = view.state.selection
  if (empty) return
  for (const id of mediaIdsBetween(view.state.doc, from, to)) {
    dom
      .querySelector(`.bn-block[data-id="${CSS.escape(id)}"]`)
      ?.setAttribute('data-ln-selected', '')
  }
}

/**
 * Watches pen and mouse drags in the editor. A drag that involves a picture
 * selects whole blocks (see the top of this file). A finger keeps scrolling.
 * Returns a function that stops watching.
 */
/** Autoscroll only near the edge of the visible page, at a capped speed. */
export const EDGE_PX = 40
export const MAX_SCROLL_PX = 14
export function edgeScroll(y: number, top: number, bottom: number): number {
  if (y < top + EDGE_PX) {
    return -Math.min(
      MAX_SCROLL_PX,
      Math.ceil(((top + EDGE_PX - y) / EDGE_PX) * MAX_SCROLL_PX),
    )
  }
  if (y > bottom - EDGE_PX) {
    return Math.min(
      MAX_SCROLL_PX,
      Math.ceil(((y - (bottom - EDGE_PX)) / EDGE_PX) * MAX_SCROLL_PX),
    )
  }
  return 0
}

export function autoScrollWhileSelecting(dom: HTMLElement, y: number): void {
  const box = dom.closest('main')
  if (!box) return
  const r = box.getBoundingClientRect()
  box.scrollTop += edgeScroll(y, r.top, r.bottom)
}

export function watchDragSelect(editor: Editor): () => void {
  const dom = editor.domElement
  if (!dom) return () => {}
  const doc = dom.ownerDocument
  const MOVE_PX = 6
  let start: { id: string; x: number; y: number; pointerId: number } | null =
    null
  let active = false
  const scroller = () => dom.closest('main') as HTMLElement | null

  const stop = () => {
    endSelectGesture(dom)
    start = null
    if (active) dom.classList.remove('ln-selecting')
    active = false
  }

  const onDown = (e: PointerEvent) => {
    stop()
    if (
      e.button > 0 ||
      !(e.target instanceof Node) ||
      !dom.contains(e.target)
    ) {
      return
    }
    // A press that starts on text is a selection gesture (finger, Pencil or
    // mouse): pictures let the pointer pass for its length. A press that
    // starts on a picture is not (its long press keeps its menu and drag).
    const el = e.target instanceof Element ? e.target : null
    if (
      el &&
      !el.closest('img, iframe, video, [contenteditable="false"]') &&
      el.closest('.bn-inline-content')
    ) {
      beginSelectGesture(dom)
    }
    if (e.pointerType === 'touch') return // a finger keeps scrolling
    const id = blockIdAt(dom, e.clientX, e.clientY)
    if (id) start = { id, x: e.clientX, y: e.clientY, pointerId: e.pointerId }
  }

  const onMove = (e: PointerEvent) => {
    if (!start || e.pointerId !== start.pointerId) return
    if (e.pointerType === 'mouse' && e.buttons === 0) return stop()
    if (
      !active &&
      Math.hypot(e.clientX - start.x, e.clientY - start.y) < MOVE_PX
    ) {
      return
    }
    const view = editor.prosemirrorView
    const here = blockIdAt(dom, e.clientX, e.clientY)
    if (!view || !here) return
    if (!active) {
      const media = rangeHasMedia(view.state.doc, start.id, here)
      if (!media) return // text only: the browser selects, as always
      active = true
      dom.classList.add('ln-selecting')
      view.dom.focus({ preventScroll: true })
    }
    e.preventDefault()
    // Near the edge of the visible page only, and slowly: never a jump.
    const box = scroller()
    if (box) {
      const r = box.getBoundingClientRect()
      box.scrollTop += edgeScroll(e.clientY, r.top, r.bottom)
    }
    selectBlocks(editor, start.id, here)
    markSelectedMedia(editor)
  }

  const onUp = () => {
    if (active) editor.prosemirrorView?.dom.focus({ preventScroll: true })
    stop()
  }

  // A picture is not dragged away by the pointer (the ⠿ handle moves blocks).
  // Once a selection gesture has started on text, crossing a picture never
  // starts a drag or a drop. A long press that starts on a picture keeps its
  // menu and drag as before.
  const onDragStart = (e: DragEvent) => {
    if (active || selectGesture.active) e.preventDefault()
  }
  // A drop is never produced by a selection gesture.
  const onDrop = (e: DragEvent) => {
    if (active || selectGesture.active) {
      e.preventDefault()
      e.stopPropagation()
    }
  }
  const onSelectStart = (e: Event) => {
    if (active) e.preventDefault()
  }

  doc.addEventListener('pointerdown', onDown, true)
  doc.addEventListener('pointermove', onMove, true)
  doc.addEventListener('pointerup', onUp, true)
  doc.addEventListener('pointercancel', onUp, true)
  dom.addEventListener('dragstart', onDragStart, true)
  dom.addEventListener('drop', onDrop, true)
  doc.addEventListener('selectstart', onSelectStart)
  const unselect = editor.onSelectionChange(() => markSelectedMedia(editor))
  return () => {
    doc.removeEventListener('pointerdown', onDown, true)
    doc.removeEventListener('pointermove', onMove, true)
    doc.removeEventListener('pointerup', onUp, true)
    doc.removeEventListener('pointercancel', onUp, true)
    dom.removeEventListener('dragstart', onDragStart, true)
    dom.removeEventListener('drop', onDrop, true)
    doc.removeEventListener('selectstart', onSelectStart)
    unselect?.()
    stop()
  }
}
