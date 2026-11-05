import { TextSelection } from 'prosemirror-state'
import { penSelectsText } from './penMode'
import { autoScrollWhileSelecting } from './dragSelect'
import { activeBlock } from './keyboardPolicy'
import { blockIdAt, rangeHasMedia } from './dragSelect'
import type { AppSchema } from './schema'

/**
 * The Apple Pencil selects text, and only that (batch 3a). On an iPad, a
 * Pencil stroke over editable text is read by iPadOS Scribble as handwriting
 * or "scratch out", which can delete or overwrite the text. So, unless the
 * setting "Pencil writes text (Scribble)" is on, a Pencil drag that starts on
 * text is handled entirely here:
 *  - the browser never sees the pointer-down (preventDefault), and on Safari
 *    the stylus touch is cancelled too (touchstart/touchmove with touchType
 *    "stylus"), so a finger still scrolls;
 *  - while the stroke lasts the page is made not editable, so Scribble has
 *    nothing to write in; the selection is set from the Pencil's position
 *    (posAtCoords) in both ProseMirror and the browser;
 *  - when the Pencil lifts the page is editable again, the selection is kept
 *    and the page gets the focus.
 * A stroke that reaches a picture is left to dragSelect.ts (whole blocks).
 * A double tap selects a word. penGuard.ts is the safety net behind this.
 */

type Editor = AppSchema['BlockNoteEditor']

const DOUBLE_TAP_MS = 350
const DOUBLE_TAP_PX = 24
const MOVE_PX = 4

/** The word around `offset` in `text`, as [from, to) (null on a gap). */
export function wordAround(
  text: string,
  offset: number,
): [number, number] | null {
  const isWord = (ch: string | undefined) =>
    !!ch && /[\p{L}\p{N}_’'-]/u.test(ch)
  let from = offset
  let to = offset
  while (from > 0 && isWord(text[from - 1])) from--
  while (to < text.length && isWord(text[to])) to++
  return from === to ? null : [from, to]
}

export function watchPenSelect(editor: Editor): () => void {
  const dom = editor.domElement
  if (!dom) return () => {}
  const doc = dom.ownerDocument

  let drag: {
    pointerId: number
    anchor: number
    startId: string | null
    x: number
    y: number
    wasEditable: string
  } | null = null
  let lastTap = { at: -1e9, x: 0, y: 0 }

  const scribbleOn = () => !penSelectsText()

  /** Where in the text a Pencil touch lands (null: a picture, a link, a button). */
  const textPos = (target: EventTarget | null, x: number, y: number) => {
    const view = editor.prosemirrorView
    if (!view || !(target instanceof Element) || !dom.contains(target)) {
      return null
    }
    if (dom.getAttribute('contenteditable') !== 'true') return null
    if (target.closest('a, button, input, textarea, select')) return null
    // Non-editable islands inside the page (tags, note links, pictures).
    if (target.closest('[contenteditable="false"]')) return null
    const found = view.posAtCoords({ left: x, top: y })
    if (!found) return null
    const $pos = view.state.doc.resolve(found.pos)
    return $pos.parent.inlineContent ? found.pos : null
  }

  const restore = () => {
    if (!drag) return
    if (drag.wasEditable === 'true') dom.contentEditable = 'true'
    else dom.removeAttribute('contenteditable')
    drag = null
  }

  const select = (anchor: number, head: number) => {
    const view = editor.prosemirrorView
    if (!view) return
    const d = view.state.doc
    const selection = TextSelection.between(d.resolve(anchor), d.resolve(head))
    view.dispatch(view.state.tr.setSelection(selection))
    // Show it in the browser as well (the page has no focus during the stroke).
    try {
      const a = view.domAtPos(selection.anchor)
      const h = view.domAtPos(selection.head)
      doc.getSelection()?.setBaseAndExtent(a.node, a.offset, h.node, h.offset)
    } catch {
      // The selection is set in the editor; the browser copy is cosmetic.
    }
  }

  const onDown = (e: PointerEvent) => {
    restore()
    if (e.pointerType !== 'pen' || e.button > 0 || scribbleOn()) return
    const pos = textPos(e.target, e.clientX, e.clientY)
    if (pos === null) return
    // The second tap in an already marked block places the caret (keyboardPolicy).
    const tapped = (e.target as Element).closest<HTMLElement>(
      '.bn-block[data-id]',
    )
    if (tapped && tapped.dataset.id === activeBlock()) return
    const view = editor.prosemirrorView!
    e.preventDefault()
    const now = Date.now()
    const double =
      now - lastTap.at < DOUBLE_TAP_MS &&
      Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < DOUBLE_TAP_PX
    lastTap = { at: now, x: e.clientX, y: e.clientY }
    drag = {
      pointerId: e.pointerId,
      anchor: pos,
      startId: blockIdAt(dom, e.clientX, e.clientY),
      x: e.clientX,
      y: e.clientY,
      wasEditable: dom.getAttribute('contenteditable') ?? 'true',
    }
    // Not editable for the length of the stroke: Scribble has nothing to write in.
    dom.contentEditable = 'false'
    if (double) {
      const $pos = view.state.doc.resolve(pos)
      const word = wordAround($pos.parent.textContent, $pos.parentOffset)
      if (word) {
        const start = $pos.start()
        drag.anchor = start + word[0]
        select(start + word[0], start + word[1])
        return
      }
    }
    select(pos, pos)
  }

  const onMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return
    const view = editor.prosemirrorView
    if (!view) return
    e.preventDefault()
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < MOVE_PX) return
    const here = blockIdAt(dom, e.clientX, e.clientY)
    if (
      drag.startId &&
      here &&
      rangeHasMedia(view.state.doc, drag.startId, here)
    ) {
      restore() // a picture is involved: dragSelect.ts selects whole blocks
      return
    }
    // Only while extending a selection: moderate edge autoscroll.
    autoScrollWhileSelecting(dom, e.clientY)
    const found = view.posAtCoords({ left: e.clientX, top: e.clientY })
    if (!found) return
    if (!view.state.doc.resolve(found.pos).parent.inlineContent) return
    select(drag.anchor, found.pos)
  }

  const onUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return
    // Editable again; the selection stays. The page is not focused: under
    // Lasso a Pencil never opens the keyboard (keyboardPolicy.ts).
    restore()
  }

  // Safari reports the Pencil as a touch of type "stylus": stop its scrolling.
  const isStylus = (e: TouchEvent) =>
    Array.from(e.changedTouches).some(
      (touch) =>
        (touch as Touch & { touchType?: string }).touchType === 'stylus',
    )
  const onTouchStart = (e: TouchEvent) => {
    if (scribbleOn() || !e.cancelable || !isStylus(e)) return
    const touch = e.changedTouches[0]
    if (textPos(e.target, touch.clientX, touch.clientY) !== null) {
      e.preventDefault()
    }
  }
  const onTouchMove = (e: TouchEvent) => {
    if (drag && e.cancelable && isStylus(e)) e.preventDefault()
  }
  const onSelectStart = (e: Event) => {
    if (drag) e.preventDefault()
  }
  const onBlur = () => restore()
  const passive = { capture: true, passive: false }

  doc.addEventListener('pointerdown', onDown, true)
  doc.addEventListener('pointermove', onMove, true)
  doc.addEventListener('pointerup', onUp, true)
  doc.addEventListener('pointercancel', onUp, true)
  doc.addEventListener('touchstart', onTouchStart, passive)
  doc.addEventListener('touchmove', onTouchMove, passive)
  doc.addEventListener('selectstart', onSelectStart)
  doc.defaultView?.addEventListener('blur', onBlur)
  return () => {
    restore()
    doc.removeEventListener('pointerdown', onDown, true)
    doc.removeEventListener('pointermove', onMove, true)
    doc.removeEventListener('pointerup', onUp, true)
    doc.removeEventListener('pointercancel', onUp, true)
    doc.removeEventListener('touchstart', onTouchStart, true)
    doc.removeEventListener('touchmove', onTouchMove, true)
    doc.removeEventListener('selectstart', onSelectStart)
    doc.defaultView?.removeEventListener('blur', onBlur)
  }
}
