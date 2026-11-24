import {
  createEventRouter,
  PRIORITY,
  type RouterTargets,
} from '../../app/input/eventRouter'
import {
  PICK_BOX,
  nearText,
  tapsCaret,
  textFirstTap,
  touchEndHold,
} from '../../editor/tapSelect'
import { stampOf } from '../../app/tapTiming'
import { activeTool } from '../../app/tools/main/mainTools'
import { selection } from '../../app/selection/store'
import { clearBoxes, inputModeFor, isTap, selectBoxes } from './boxSelection'
import './boxV2.css'
import { sweepEmptyBoxes } from './oneBarBus'

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

/** Block types whose empty part is no "empty paper" (tables, pictures, code...). */
const TEXT_BLOCK =
  /^(paragraph|heading|bulletListItem|numberedListItem|checkListItem|toggleListItem|quote)$/

/**
 * C30b (owner 17 Nov: "Yes, same as every box"): the page's first box
 * ("main") follows the first-tap rule too. A tap in its empty part (not on or
 * near a written line) while no caret is in it gives its box (the page's
 * first box has no other state than "caret in it"), so it is selected
 * without a caret. C34 (18 Nov): that holds on an empty page too.
 */
function mainEmptyPart(
  target: Element | null,
  e: PointerEvent,
): Element | null {
  const main = target?.closest('[data-paper-box="main"]')
  const ed = main?.querySelector<HTMLElement>('.ProseMirror')
  if (!main || !ed) return null
  // C34 (owner 18 Nov): an empty page is no exception: its first box is
  // selected by a tap away from the caret spot (C30b kept the caret there).
  if (nearText(ed, e.clientX, e.clientY)) return null
  const type = target
    ?.closest('[data-content-type]')
    ?.getAttribute('data-content-type')
  if (target?.closest('[contenteditable="false"]')) return null
  if (type && !TEXT_BLOCK.test(type)) return null
  return main
}

/**
 * Re-test 18 Nov (F4): a tap anywhere inside the first box, its frame and
 * border included, is a tap on that box, never on the paper beside it (the
 * Text tool's "+ box"). The frame lies a few px outside the box's own element.
 */
const FRAME_GAP_X = 13
const FRAME_GAP_Y = 7
function mainFrameHit(target: Element | null, e: PointerEvent): Element | null {
  if (
    !target?.closest('[data-paper-wrap]') ||
    target.closest('[data-paper-box], [data-ui]')
  )
    return null
  const main = document.querySelector('[data-paper-box="main"]')
  if (!main) return null
  const m = main.getBoundingClientRect()
  const f = document.querySelector('[data-main-frame]')?.getBoundingClientRect()
  const left = Math.min(m.left - FRAME_GAP_X, f?.left ?? 1e9)
  const right = Math.max(m.right + FRAME_GAP_X, f?.right ?? -1e9)
  const top = Math.min(m.top - FRAME_GAP_Y, f?.top ?? 1e9)
  const bottom = Math.max(m.bottom + FRAME_GAP_Y, f?.bottom ?? -1e9)
  const inside =
    e.clientX >= left &&
    e.clientX <= right &&
    e.clientY >= top &&
    e.clientY <= bottom
  return inside ? main : null
}

/** Has this box any words (the empty line of a new box has none)? */
const hasWords = (box: Element) =>
  !!box.querySelector('.ProseMirror')?.textContent?.trim()

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
    if (!dragging()) {
      if (Date.now() >= swallowUntil) return
      // Only that tap's own events in the box text are held back (a link,
      // page link or toggle there too); the bar or a menu answers at once.
      const t = e.target instanceof Element ? e.target : null
      // The box's own area (its text, the empty band under it) too: its click
      // must not reach the paper's "tap on a frame puts the caret at the end".
      if (!t?.closest('[data-paper-box]') || t.closest(OWN_TAP)) return
    }
    e.preventDefault()
    e.stopImmediatePropagation()
  }

  /** Bug 6 (18 Nov): a press on the paper takes away the empty boxes it is not on. */
  const sweepOnPaper = (e: PointerEvent) => {
    const t = e.target instanceof Element ? e.target : null
    if (
      e.button > 0 ||
      !t?.closest('[data-paper-wrap]') ||
      t.closest('[data-ui]')
    )
      return
    const own = t.closest('[data-paper-box]:not([data-paper-box="main"])')
    sweepEmptyBoxes(own?.getAttribute('data-paper-box') ?? null)
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
    sweepOnPaper(e)
    tap = null
    touchEndHold.until = 0
    if (e.button > 0 || activeTool.get() !== 'text') return
    const target = e.target instanceof Element ? e.target : null
    const box =
      target?.closest(EXTRA) ??
      mainEmptyPart(target, e) ??
      mainFrameHit(target, e)
    if (!box || target?.closest(OWN_TAP)) return
    const isMain = box.getAttribute('data-paper-box') === 'main'
    const focused = box.contains(document.activeElement)
    const picked =
      box.hasAttribute('data-picked') || box.hasAttribute('data-main-picked')
    // A tap on the words: tapSelect runs the first-tap rule (textFirstTap),
    // except in the empty part of a box with the caret in it (owner 18 Nov:
    // then it selects the box, or keeps the caret in an empty one, and the
    // iOS edit menu never shows). (The empty trailing block under the text is
    // not words: it counts as padding.)
    const ed = box.querySelector<HTMLElement>('.ProseMirror')
    if (
      !isMain &&
      target?.closest('.ProseMirror') &&
      !target.closest('[contenteditable="false"]') &&
      !(focused && ed && !tapsCaret(ed, e.clientX, e.clientY))
    )
      return
    // Typing in an empty box: a tap away from the caret keeps the caret.
    if (
      focused &&
      !hasWords(box) &&
      !(ed && nearText(ed, e.clientX, e.clientY))
    ) {
      swallowUntil = Date.now() + 600
      touchEndHold.until = Date.now() + 600
      e.stopImmediatePropagation()
      if (e.cancelable) e.preventDefault()
      return
    }
    tap = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      // The event's own time stamp (as tapSelect.ts): a busy page must not
      // turn a short tap into a long press by when the listener ran.
      at: stampOf(e),
      box: box.getAttribute('data-paper-box') ?? '',
      kind: picked && !focused ? 'pad' : 'select',
      pen: e.pointerType === 'pen',
    }
    swallowUntil = Date.now() + 600
    touchEndHold.until = Date.now() + 600
    e.stopImmediatePropagation()
    if (e.cancelable) e.preventDefault()
  }

  const onUp = (e: PointerEvent) => {
    if (!tap || e.pointerId !== tap.id) return
    const t = tap
    tap = null
    e.stopImmediatePropagation()
    const moved = Math.hypot(e.clientX - t.x, e.clientY - t.y)
    if (!isTap(moved, stampOf(e) - t.at)) return
    const box = document.querySelector<HTMLElement>(
      `[data-paper-box="${CSS.escape(t.box)}"]`,
    )
    if (!box) return
    // C30 (owner 17 Nov): a tap in the padding right next to the words puts
    // the caret there, picked or not; anywhere else in the empty part, an
    // unpicked box is selected and a picked one stays selected.
    const ed = box.querySelector<HTMLElement>('.ProseMirror')
    if (ed && tapsCaret(ed, e.clientX, e.clientY))
      return placeCaretNearest(box, e.clientX, e.clientY)
    if (t.kind === 'select') {
      // One selection, one kind: words selected elsewhere stop being selected.
      ;(document.activeElement as HTMLElement | null)?.blur?.()
      window.getSelection()?.removeAllRanges()
      window.dispatchEvent(
        new CustomEvent(PICK_BOX, { detail: { id: t.box, add: e.shiftKey } }),
      )
      return
    }
    // A picked box: its empty part keeps it selected (no caret), unless it
    // is empty: the second tap puts the caret at the start of its line
    // (owner 18 Nov, rule 1).
    if (!hasWords(box)) placeCaretNearest(box, e.clientX, e.clientY)
  }

  /**
   * Owner 18 Nov: while a box is selected (dots showing, no caret) typed
   * letters do nothing: "selected" means adjust the box; typing needs a tap
   * where the words go. Why: Safari keeps the page's selection in the editor
   * that lost focus, so a letter typed with a box selected still landed in the
   * old text. Shortcuts (Cmd/Ctrl), Delete, Backspace, Escape, Enter and keys
   * on a focused button or field are not letters and stay as they are.
   */
  const onKey = (e: KeyboardEvent) => {
    if (e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return
    const at = document.activeElement
    if (
      at &&
      at !== document.body &&
      at.closest(
        '[contenteditable="true"], input, textarea, select, button, a, [role="menuitem"], [role="button"], [tabindex]',
      )
    )
      return
    if (
      !document.querySelector(
        '[data-paper-box][data-picked], [data-main-chrome] [data-box-grip]',
      )
    )
      return
    e.preventDefault()
    e.stopImmediatePropagation()
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
    router.subscribe('keydown', (e) => void onKey(e), first),
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
