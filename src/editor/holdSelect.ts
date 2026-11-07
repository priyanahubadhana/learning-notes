import { TextSelection } from 'prosemirror-state'
import { activeTool } from '../app/tools/main/mainTools'
import { readDeviceSetting } from '../settings/settingsService'
import { holdSelectSetting } from '../settings/builtinSettings'
import { autoScrollWhileSelecting } from './dragSelect'
import { beginSelectGesture, endSelectGesture } from './gesture'
import { lookThrough, padOf, posNear } from './tapSelect'
import type { AppSchema } from './schema'

/**
 * Hold-to-select, like the native iOS gesture (owner, real iPad). Under the
 * Text tool the Pencil is free for Scribble, so a quick stroke is handwriting.
 * A Pencil that touches text and stays still (under 6 px) for about 300 ms
 * (Settings > Advanced, 200 to 600 ms) enters SELECTION mode: Scribble is held
 * off for the rest of that stroke (stylus touchmove is cancelled), the caret
 * grows (a cue) and dragging extends the selection, with moderate edge
 * autoscroll. A stroke that moves straight away is left to Scribble.
 */

type Editor = AppSchema['BlockNoteEditor']
const HOLD_MOVE_PX = 6

/** Pure rule: has the press moved too far to become a hold? */
const movedTooFar = (dx: number, dy: number): boolean =>
  Math.hypot(dx, dy) >= HOLD_MOVE_PX

export function watchHoldSelect(
  editor: Editor,
  onSelected: () => void,
): () => void {
  const dom = editor.domElement
  if (!dom) return () => {}
  const doc = dom.ownerDocument
  let press: {
    id: number
    x: number
    y: number
    timer: number
    anchor: number
    /** The ink pad the press landed on (under Lasso with ink it covers the words). */
    pad: HTMLElement | null
  } | null = null
  let holding = false

  const finish = () => {
    if (press) window.clearTimeout(press.timer)
    const was = holding
    press = null
    holding = false
    dom.removeAttribute('data-hold-select')
    if (was) endSelectGesture(dom)
    return was
  }
  const select = (a: number, b: number) => {
    const view = editor.prosemirrorView
    if (!view) return
    const d = view.state.doc
    const sel = TextSelection.between(d.resolve(a), d.resolve(b))
    view.dispatch(view.state.tr.setSelection(sel))
    // Also in the browser (the page may not have the focus).
    try {
      const from = view.domAtPos(sel.anchor)
      const to = view.domAtPos(sel.head)
      doc
        .getSelection()
        ?.setBaseAndExtent(from.node, from.offset, to.node, to.offset)
    } catch {
      // The editor's own selection is set; the browser copy is cosmetic.
    }
  }

  const onDown = (e: PointerEvent) => {
    finish()
    if (
      e.pointerType !== 'pen' ||
      e.button > 0 ||
      // Typing mode only: under the Lasso a press starts a loop (owner, 7 Nov).
      activeTool.get() !== 'text'
    ) {
      return
    }
    const pad = padOf(e.target)
    // Through the pad, the element under the press is the one that counts.
    const target = pad
      ? lookThrough(pad, () => doc.elementFromPoint(e.clientX, e.clientY))
      : e.target
    if (!(target instanceof Element) || !dom.contains(target)) return
    if (
      target.closest('a, button, input, textarea, select') ||
      ![null, dom].includes(target.closest('[contenteditable="false"]'))
    ) {
      return
    }
    const view = editor.prosemirrorView
    if (!view) return
    const pos = lookThrough(pad, () => posNear(view, e.clientX, e.clientY))
    if (pos === null) return
    // Only a block that already has words (an empty block takes the caret at once).
    const block = target.closest('.bn-block-content')
    if ((block?.textContent ?? '').trim() === '') return
    const ms = readDeviceSetting(holdSelectSetting)
    press = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      anchor: pos,
      pad,
      timer: window.setTimeout(() => {
        if (!press) return
        holding = true
        beginSelectGesture(dom)
        dom.setAttribute('data-hold-select', '')
        // The caret lands exactly here, skipping the two-tap step.
        dom
          .querySelectorAll('[data-active-block]')
          .forEach((el) => el.removeAttribute('data-active-block'))
        select(press.anchor, press.anchor)
      }, ms),
    }
  }
  const onMove = (e: PointerEvent) => {
    if (!press || e.pointerId !== press.id) return
    if (!holding) {
      // Moved before the hold time: a quick stroke, left to Scribble.
      if (movedTooFar(e.clientX - press.x, e.clientY - press.y)) finish()
      return
    }
    e.preventDefault()
    const view = editor.prosemirrorView
    if (!view) return
    autoScrollWhileSelecting(dom, e.clientY)
    const pad = press.pad
    const pos = lookThrough(pad, () => posNear(view, e.clientX, e.clientY))
    if (pos !== null) select(press.anchor, pos)
  }
  const onUp = (e: PointerEvent) => {
    if (!press || e.pointerId !== press.id) return
    const was = finish()
    if (!was) return
    if (!editor.prosemirrorView?.state.selection.empty) onSelected()
    else {
      // Lifted without moving: only the caret is placed (no keyboard for a Pencil).
      dom.setAttribute('inputmode', 'none')
      setTimeout(() => dom.focus({ preventScroll: true }), 0)
    }
  }
  // Scribble claims a stylus stroke through touch events: once holding, cancel them.
  const onTouchMove = (e: TouchEvent) => {
    if (holding && e.cancelable) e.preventDefault()
  }
  const onSelectStart = (e: Event) => {
    if (holding) e.preventDefault()
  }
  doc.addEventListener('pointerdown', onDown, true)
  doc.addEventListener('pointermove', onMove, true)
  doc.addEventListener('pointerup', onUp, true)
  doc.addEventListener('pointercancel', onUp, true)
  doc.addEventListener('touchmove', onTouchMove, {
    capture: true,
    passive: false,
  })
  doc.addEventListener('selectstart', onSelectStart)
  return () => {
    finish()
    doc.removeEventListener('pointerdown', onDown, true)
    doc.removeEventListener('pointermove', onMove, true)
    doc.removeEventListener('pointerup', onUp, true)
    doc.removeEventListener('pointercancel', onUp, true)
    doc.removeEventListener('touchmove', onTouchMove, true)
    doc.removeEventListener('selectstart', onSelectStart)
  }
}
