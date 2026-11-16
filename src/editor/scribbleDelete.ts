import { TextSelection } from 'prosemirror-state'
import { isOn } from '../app/flags'
import { onGestureReset } from '../app/gestureReset'
import { onRouted } from '../app/input/eventRouter'
import { activeTool } from '../app/tools/main/mainTools'
import { wordsInRegion, type Box } from './lassoWords'
import type { AppSchema } from './schema'
import { posNear } from './tapSelect'
import { tokenAround } from './textTokens'

/**
 * Scribble to delete in a text box (C4, owner's combined test 16 Nov; switch
 * textbox.v2). Scribbling over "6" while "Text" was selected deleted "Text",
 * and the scribble's grey ink stayed over the 6.
 *
 * Why: iPadOS reads the scratch-out and then sends a plain delete
 * (`deleteContentBackward`) to the text field. Safari does not move the
 * page's selection to the scribbled spot first, so the delete lands on the
 * selection the page already holds, and our own selection (ownSelection.ts)
 * keeps that selection on purpose. The text under the strokes never changes,
 * so the iPad's grey strokes are left over it.
 *
 * So the app owns the scratch-out: a Text-tool Pencil stroke over the words
 *  1. clears the old selection the moment it moves (unless it starts on it);
 *  2. is remembered (the area it covered) for a moment after it ends;
 *  3. a delete that arrives then, with no key pressed, removes only the
 *     words and symbols under the stroke (one Undo step); a delete aimed
 *     there already (its target range is inside) is left to the browser.
 * No stroke of the Text tool is ever kept as ink: nothing here draws.
 * Only a real iPad can show that Scribble's recogniser fires and its grey
 * strokes fade; the browser tests play what it sends.
 */

type Editor = AppSchema['BlockNoteEditor']

/** A Pencil that moves this far (px) is writing, not tapping. */
const STROKE_PX = 8
/** A delete this soon (ms) after the stroke belongs to it. */
export const SCRIBBLE_MS = 2500
/** The stroke's area is grown by this much (px) to find what it covers. */
const REACH_PX = 0
const KEY_RECENT_MS = 500

/** The stroke area (client px) as a box. */
export function strokeBox(pts: { x: number; y: number }[], grow = 0): Box {
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const x = Math.min(...xs) - grow
  const y = Math.min(...ys) - grow
  return {
    x,
    y,
    w: Math.max(...xs) + grow - x,
    h: Math.max(...ys) + grow - y,
  }
}

/** Is [a, b] inside [from, to] (one position of slack for a space)? */
export const within = (a: number, b: number, span: [number, number]): boolean =>
  a >= span[0] - 1 && b <= span[1] + 1

/** Each editor's delete check, asked by the Pencil guard's beforeinput. */
const inputHooks = new WeakMap<Element, (e: Event, lastKeyAt: number) => void>()

/**
 * Called first by penGuard.ts for every beforeinput of `dom`: a delete right
 * after a scribble is turned into deleting what the scribble covered.
 */
export function scribbleInput(dom: Element, e: Event, lastKeyAt: number): void {
  inputHooks.get(dom)?.(e, lastKeyAt)
}

export function watchScribbleDelete(editor: Editor): () => void {
  const dom = editor.domElement
  if (!dom) return () => {}
  const doc = dom.ownerDocument
  let stroke: {
    id: number
    pts: { x: number; y: number }[]
    moved: boolean
  } | null = null
  let mark: { pts: { x: number; y: number }[]; at: number } | null = null

  const on = () => isOn('textbox.v2') && activeTool.get() === 'text'
  const inText = (t: EventTarget | null) =>
    t instanceof Element &&
    dom.contains(t) &&
    !t.closest('a, button, input, textarea, select') &&
    [null, dom].includes(t.closest('[contenteditable="false"]'))

  /** The words and symbols under the stroke, as one document range. */
  const spanUnder = (pts: { x: number; y: number }[]) => {
    const view = editor.prosemirrorView
    if (!view || pts.length === 0) return null
    const box = strokeBox(pts, REACH_PX)
    const inBox = (x: number, y: number) =>
      x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h
    const found = wordsInRegion(view, inBox, box)
    if (found) return [found.from, found.to] as [number, number]
    // Scribble may take the Pencil after a few points: the token at its start.
    const pos = posNear(view, pts[0].x, pts[0].y, 6)
    if (pos === null) return null
    const $pos = view.state.doc.resolve(pos)
    const text = $pos.parent.textBetween(
      0,
      $pos.parent.content.size,
      undefined,
      ' ',
    )
    const tok = tokenAround(text, $pos.parentOffset, true)
    return tok
      ? ([$pos.start() + tok[0], $pos.start() + tok[1]] as [number, number])
      : null
  }

  /** The stroke started away from the selection: the selection goes. */
  const dropOldSelection = (start: { x: number; y: number }) => {
    const view = editor.prosemirrorView
    if (!view) return
    const sel = view.state.selection
    if (sel.empty) return
    const pos = posNear(view, start.x, start.y)
    if (pos !== null && pos >= sel.from && pos <= sel.to) return
    const at = pos ?? sel.to
    view.dispatch(
      view.state.tr.setSelection(
        TextSelection.near(view.state.doc.resolve(at)),
      ),
    )
    try {
      const d = view.domAtPos(at)
      doc.getSelection()?.setBaseAndExtent(d.node, d.offset, d.node, d.offset)
    } catch {
      // The editor's own selection is collapsed; the browser copy is cosmetic.
    }
  }

  const onDown = (e: PointerEvent) => {
    stroke = null
    if (e.pointerType !== 'pen' || e.button > 0 || !on()) return
    if (!inText(e.target)) return
    stroke = {
      id: e.pointerId,
      pts: [{ x: e.clientX, y: e.clientY }],
      moved: false,
    }
  }
  const onMove = (e: PointerEvent) => {
    if (!stroke || e.pointerId !== stroke.id) return
    stroke.pts.push({ x: e.clientX, y: e.clientY })
    const [a] = stroke.pts
    if (
      !stroke.moved &&
      Math.hypot(e.clientX - a.x, e.clientY - a.y) > STROKE_PX
    ) {
      stroke.moved = true
      dropOldSelection(a)
    }
    if (stroke.moved) mark = { pts: stroke.pts, at: Date.now() }
  }
  const onEnd = (e: PointerEvent) => {
    if (!stroke || e.pointerId !== stroke.id) return
    if (stroke.moved) mark = { pts: stroke.pts, at: Date.now() }
    stroke = null
  }

  const onBeforeInput = (e: Event, lastKeyAt: number) => {
    const input = e as InputEvent
    if (!input.inputType?.startsWith('delete') || !mark || !on()) return
    const now = Date.now()
    const m = mark
    if (now - m.at > SCRIBBLE_MS || now - lastKeyAt <= KEY_RECENT_MS) return
    mark = null
    const view = editor.prosemirrorView
    if (!view) return
    const span = spanUnder(m.pts)
    // Aimed at the scribbled spot already: the browser's own delete is right.
    const targets =
      typeof input.getTargetRanges === 'function' ? input.getTargetRanges() : []
    if (span && targets.length > 0) {
      const ok = targets.every((r) => {
        try {
          const a = view.posAtDOM(r.startContainer, r.startOffset)
          const b = view.posAtDOM(r.endContainer, r.endOffset)
          return a !== b && within(a, b, span)
        } catch {
          return false
        }
      })
      if (ok) return
    }
    e.preventDefault()
    e.stopImmediatePropagation()
    if (!span) return
    // One step (one Undo): the words go, the caret stays where they were.
    const tr = view.state.tr.delete(span[0], span[1])
    tr.setSelection(TextSelection.near(tr.doc.resolve(span[0])))
    view.dispatch(tr.scrollIntoView())
  }

  const offs = [
    onRouted('pointerdown', onDown, { name: 'scribbleDelete' }),
    onRouted('pointermove', onMove, { name: 'scribbleDelete' }),
    onRouted('pointerup', onEnd, { name: 'scribbleDelete' }),
    onRouted('pointercancel', onEnd, { name: 'scribbleDelete' }),
  ]
  // The Pencil guard's beforeinput listener asks here first (penGuard.ts).
  inputHooks.set(dom, onBeforeInput)
  const offReset = onGestureReset(() => {
    stroke = null
    mark = null
  })
  return () => {
    offReset()
    for (const off of offs) off()
    if (inputHooks.get(dom) === onBeforeInput) inputHooks.delete(dom)
  }
}
