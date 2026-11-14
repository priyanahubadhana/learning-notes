import { PICK_BOX } from '../../editor/tapSelect'
import { activeTool } from '../../app/tools/main/mainTools'
import { selection } from '../../app/selection/store'
import { clearBoxes, inputModeFor, isTap, selectBoxes } from './boxSelection'
import './boxV2.css'

export { rowUnder } from './boxSelection'

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
  let mode: 'none' | 'text' = 'text'
  let tap: Tap | null = null
  let swallowUntil = 0

  const stopMouse = (e: Event) => {
    if (Date.now() >= swallowUntil) return
    e.preventDefault()
    e.stopImmediatePropagation()
  }
  const mouseNames = ['mousedown', 'mouseup', 'click']

  const onDown = (e: PointerEvent) => {
    mode = inputModeFor(e.pointerType)
    setInputMode(mode)
    tap = null
    if (e.button > 0 || activeTool.get() !== 'text') return
    const target = e.target instanceof Element ? e.target : null
    const box = target?.closest(EXTRA)
    if (!box || target?.closest(OWN_TAP)) return
    const picked = box.hasAttribute('data-picked')
    // A tap on the words of a selected box: the editor and tapSelect place the caret.
    if (picked && target?.closest('.ProseMirror')) return
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
  /** A stylus touch of a first tap must not start Scribble's dot. */
  const onTouch = (e: TouchEvent) => {
    if (tap?.pen && e.cancelable) e.preventDefault()
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
    if (ids.length) selectBoxes(selection, ids)
    else clearBoxes(selection)
  })

  window.addEventListener('pointerdown', onDown, true)
  window.addEventListener('pointerup', onUp, true)
  window.addEventListener('pointercancel', onCancel, true)
  window.addEventListener('touchstart', onTouch, {
    capture: true,
    passive: false,
  })
  for (const n of mouseNames) window.addEventListener(n, stopMouse, true)
  watch.observe(document.body, { childList: true, subtree: true })
  mirror.observe(document.body, {
    attributes: true,
    attributeFilter: ['data-picked'],
    subtree: true,
    childList: true,
  })
  return () => {
    window.removeEventListener('pointerdown', onDown, true)
    window.removeEventListener('pointerup', onUp, true)
    window.removeEventListener('pointercancel', onCancel, true)
    window.removeEventListener('touchstart', onTouch, true)
    for (const n of mouseNames) window.removeEventListener(n, stopMouse, true)
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
