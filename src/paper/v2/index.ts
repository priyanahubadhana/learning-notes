import {
  createEventRouter,
  PRIORITY,
  type RouterTargets,
} from '../../app/input/eventRouter'
import { PICK_BOX, textFirstTap } from '../../editor/tapSelect'
import { activeTool } from '../../app/tools/main/mainTools'
import { selection } from '../../app/selection/store'
import { clearBoxes, inputModeFor, isTap, selectBoxes } from './boxSelection'
import './boxV2.css'

export { rowUnder } from './boxSelection'
export { HOLD_MS, floorFor, minWidthPx, nearestHandle } from './boxResize'
export {
  GLIDE_MS,
  createDragClock,
  glideFrom,
  playGlide,
  liftAt,
  tabOnly,
  watchFinger,
  dropWithUndo,
} from './boxDrag'

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
/** Parts of a box with their own tap (the tab, the menu, dots, frame strips). */
const OWN_TAP =
  '[data-box-grip], [data-box-menu], [data-resize-handle], [data-box-band], [data-chrome], [data-layout-cover], a, button'

const editors = (root: ParentNode = document) =>
  root.querySelectorAll<HTMLElement>('[data-paper-box] .ProseMirror')

/** The keyboard rule: every box editor follows the last pointer (Pencil: none). */
function setInputMode(mode: 'none' | 'text', root?: ParentNode) {
  for (const ed of editors(root)) {
    if (mode === 'none') ed.setAttribute('inputmode', 'none')
    else ed.removeAttribute('inputmode')
  }
}

type Tap = {
  id: number
  x: number
  y: number
  at: number
  box: string
  /** select: first tap on a box that is not selected; pad: padding of a selected box. */
  kind: 'select' | 'pad'
  pen: boolean
}

/**
 * Text box v2: what happens when a box is tapped (TB-01, 02, 03, 05) and the
 * keyboard rule. Window level, capture phase, so a first tap on a box that is
 * not selected never reaches the editor: it selects the box and nothing else.
 * Returns the function that removes it all.
 */
export function installBoxV2(): () => void {
  textFirstTap.on = true
  let mode: 'none' | 'text' = 'text'
  let tap: Tap | null = null
  let swallowUntil = 0
  /** The tap that only selected a box makes no click on the text under it. */
  const stopClick = (e: Event) => {
    if (dragging() ? false : Date.now() >= swallowUntil) return
    e.preventDefault()
    e.stopImmediatePropagation()
  }

  /** TB-12, the drag lock: while a box is dragged no other press, lift or click reaches anything. */
  const dragging = () => document.documentElement.hasAttribute('data-box-drag')
  const onDown = (e: PointerEvent) => {
    if (dragging()) {
      tap = null
      e.stopImmediatePropagation()
      if (e.cancelable) e.preventDefault()
      return
    }
    mode = inputModeFor(e.pointerType)
    setInputMode(mode)
    tap = null
    if (e.button > 0 || activeTool.get() !== 'text') return
    const target = e.target instanceof Element ? e.target : null
    const box = target?.closest(EXTRA)
    if (!box || target?.closest(OWN_TAP)) return
    const picked = box.hasAttribute('data-picked')
    // A tap on the words: tapSelect runs the first-tap rule (textFirstTap).
    // (The empty trailing block under the text is not words: it counts as padding.)
    if (
      target?.closest('.ProseMirror') &&
      !target.closest('[contenteditable="false"]')
    )
      return
    tap = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      at: Date.now(),
      box: box.getAttribute('data-paper-box') ?? '',
      kind: picked ? 'pad' : 'select',
      pen: e.pointerType === 'pen',
    }
    swallowUntil = Date.now() + 600
    e.stopImmediatePropagation()
    if (e.cancelable) e.preventDefault()
  }

  const onUp = (e: PointerEvent) => {
    if (!tap || e.pointerId !== tap.id) return
    const t = tap
    tap = null
    e.stopImmediatePropagation()
    const moved = Math.hypot(e.clientX - t.x, e.clientY - t.y)
    if (!isTap(moved, Date.now() - t.at)) return
    const box = document.querySelector<HTMLElement>(
      `[data-paper-box="${CSS.escape(t.box)}"]`,
    )
    if (!box) return
    if (t.kind === 'select') {
      // One selection, one kind: words selected elsewhere stop being selected.
      ;(document.activeElement as HTMLElement | null)?.blur?.()
      window.getSelection()?.removeAllRanges()
      window.dispatchEvent(
        new CustomEvent(PICK_BOX, { detail: { id: t.box, add: e.shiftKey } }),
      )
      return
    }
    placeCaretNearest(box, e.clientX, e.clientY)
  }

  const onCancel = (e: PointerEvent) => {
    if (tap && e.pointerId === tap.id) tap = null
  }
  /** A new editor (a new box) starts with the keyboard rule already set. */
  const watch = new MutationObserver((list) => {
    if (mode !== 'none') return
    for (const m of list)
      for (const n of m.addedNodes)
        if (n instanceof Element) setInputMode('none', n)
  })
  // Mirror the picked boxes into the selection store (one kind at a time).
  const mirror = new MutationObserver(() => {
    const ids = [...document.querySelectorAll(EXTRA + '[data-picked]')].map(
      (b) => b.getAttribute('data-paper-box') ?? '',
    )
    // A selected box with no caret in it keeps no selection anywhere (TB-03),
    // not even stale words in its own editor: the next tap places the caret.
    if (ids.length && !document.activeElement?.closest(EXTRA + '[data-picked]'))
      window.getSelection()?.removeAllRanges()
    if (ids.length) selectBoxes(selection, ids)
    else clearBoxes(selection)
  })

  // Window level, before the editors (the router is bound to the window, so
  // it hears an event before the document listeners do).
  const router = createEventRouter({
    doc: window as unknown as RouterTargets['doc'],
    win: window,
  })
  const first = { priority: PRIORITY.gesture, name: 'textbox.v2' }
  const offs = [
    router.subscribe('pointerdown', (e) => void onDown(e), first),
    router.subscribe('pointerup', (e) => void onUp(e), first),
    router.subscribe('pointercancel', (e) => void onCancel(e), first),
    router.subscribe('click', (e) => void stopClick(e), first),
  ]
  watch.observe(document.body, { childList: true, subtree: true })
  mirror.observe(document.body, {
    attributes: true,
    attributeFilter: ['data-picked'],
    subtree: true,
    childList: true,
  })
  return () => {
    for (const off of offs) off()
    router.destroy()
    textFirstTap.on = false
    watch.disconnect()
    mirror.disconnect()
    clearBoxes(selection)
    setInputMode('text')
  }
}

/** The caret on the line of the box nearest to a tap in its padding. */
function placeCaretNearest(box: HTMLElement, x: number, y: number) {
  const dom = box.querySelector<HTMLElement>('.ProseMirror')
  if (!dom) return
  const r = dom.getBoundingClientRect()
  const cx = Math.min(Math.max(x, r.left + 1), r.right - 1)
  const cy = Math.min(Math.max(y, r.top + 1), r.bottom - 1)
  dom.focus({ preventScroll: true })
  const range = document.caretRangeFromPoint?.(cx, cy)
  const sel = window.getSelection()
  if (sel && range && dom.contains(range.startContainer)) {
    sel.removeAllRanges()
    sel.addRange(range)
  }
}
