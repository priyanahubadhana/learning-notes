import { TextSelection } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'
import { activeTool } from '../app/tools/main/mainTools'
import { wordAround } from './penSelect'
import type { AppSchema } from './schema'

/**
 * Tap selection, GoodNotes style (owner, after trying 3a on an iPad): a
 * Pencil or finger DOUBLE-TAP selects the word under it, a TRIPLE-TAP the
 * line (the text block) at that spot. Hit-testing is tolerant: when the tap
 * lands between lines or in a margin, the nearest text within a few pixels is
 * used. After a tap selection the caller shows the mini toolbar.
 *
 * This is the ONE tap counter of the page (penSelect and the ink engine do
 * not count taps). It works under Lasso, Pen and Highlighter, also when the
 * ink pad lies over the words: the pad is looked through for the position,
 * and the ink engine drops the tap's dot (ink/tapFilter.ts).
 */

type Editor = AppSchema['BlockNoteEditor']

const TAP_MS = 350
/** Taps this close together (px) count as the same spot. */
const TAP_PX = 12
const MOVE_PX = 10
const TAP_TOOLS = ['lasso', 'pen', 'highlighter']

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

/** The range a tap count selects at `pos`: 2 = the word, 3 = the whole block. */
export function rangeForTaps(
  view: Pick<EditorView, 'state'>,
  pos: number,
  taps: number,
): [number, number] | null {
  const $pos = view.state.doc.resolve(pos)
  if (!$pos.parent.inlineContent) return null
  if (taps >= 3) {
    return $pos.start() === $pos.end() ? null : [$pos.start(), $pos.end()]
  }
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

export function watchTapSelect(
  editor: Editor,
  onSelected: () => void,
): () => void {
  const dom = editor.domElement
  if (!dom) return () => {}
  const doc = dom.ownerDocument
  let down: {
    id: number
    x: number
    y: number
    type: string
    pad: HTMLElement | null
  } | null = null
  let last: { at: number; x: number; y: number; count: number } | null = null

  const inText = (target: EventTarget | null) =>
    target instanceof Element &&
    dom.contains(target) &&
    !target.closest('a, button, input, textarea, select') &&
    // The page itself is briefly not editable during a Lasso stroke.
    [null, dom].includes(target.closest('[contenteditable="false"]'))

  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' || e.button > 0) return
    if (!TAP_TOOLS.includes(activeTool.get())) return
    const pad = padOf(e.target)
    down =
      pad || inText(e.target)
        ? {
            id: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            type: e.pointerType,
            pad,
          }
        : null
  }
  /** A finger's single tap through the pad still places the caret (keyboard). */
  const fingerCaret = (view: EditorView, pos: number) => {
    view.dispatch(
      view.state.tr.setSelection(TextSelection.create(view.state.doc, pos)),
    )
    dom.setAttribute('inputmode', 'text')
    view.dom.focus({ preventScroll: true })
  }
  const onUp = (e: PointerEvent) => {
    if (!down || e.pointerId !== down.id) return
    const start = down
    down = null
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_PX) {
      last = null
      return
    }
    const count = nextTapCount(last, Date.now(), e.clientX, e.clientY)
    last = { at: Date.now(), x: e.clientX, y: e.clientY, count }
    const view = editor.prosemirrorView
    if (!view) return
    const pos = lookThrough(start.pad, () =>
      posNear(view, e.clientX, e.clientY),
    )
    if (pos === null) return
    if (count < 2) {
      if (start.pad && start.type === 'touch' && activeTool.get() === 'lasso')
        fingerCaret(view, pos)
      return
    }
    const range = rangeForTaps(view, pos, count)
    if (!range) return
    // After the browser's own double-tap handling, so ours is what stays.
    setTimeout(() => {
      const d = view.state.doc
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
      onSelected()
    }, 0)
  }
  doc.addEventListener('pointerdown', onDown, true)
  doc.addEventListener('pointerup', onUp, true)
  return () => {
    doc.removeEventListener('pointerdown', onDown, true)
    doc.removeEventListener('pointerup', onUp, true)
  }
}
