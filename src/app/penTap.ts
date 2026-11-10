/**
 * Pencil taps on the app's bars, pills, cards and menus.
 *
 * iPadOS Scribble may read a Pencil touch near editable text as handwriting
 * (a comma appears), and Safari can swallow a tap that lands near a button's
 * edge. So on chrome the Pencil's touch is cancelled (the page never sees it)
 * and we click the control ourselves when the Pencil lifts. A finger or a
 * mouse is untouched.
 */
import { onGestureReset, registerToolState } from './gestureReset'
import { inputMachine } from './inputMachine'
import { barPalm } from './palmGuard'

/** Everything that counts as chrome (the app's own controls). */
export const CHROME_SELECTOR =
  '[data-chrome], [data-ui], [data-bar], [data-pill-root], [data-popup], [role="menu"], [role="dialog"], dialog'

/** The bars: the main bar, the ribbon, pills, the mini bar and strips. */
export const BAR_SELECTOR = '[data-bar], [data-pill-root]'

/** Where a Pencil touch is left alone (typing, sliders, own pointer code). */
const NATIVE =
  'input, textarea, select, [contenteditable="true"], [data-pen-native]'
const ACTION =
  'button, [role=button], [role=link], [role=menuitem], [role=tab], [role=option], [role=switch], a, label'

const MAX_MOVE = 12
const MAX_MS = 1000
const SWALLOW_MS = 500

export interface PenTapStats {
  cancelledTouches: number
  clicks: number
  swallowed: number
  /** Touches on a bar that were ignored (a palm, or Pencil with finger only). */
  ignored: number
}
export const penTapStats: PenTapStats = {
  cancelledTouches: 0,
  clicks: 0,
  swallowed: 0,
  ignored: 0,
}

/** Switched off by the Pencil lab to show what the measure does. */
export const penTapOptions = {
  enabled: true,
  /** Settings > Tool bar > "Toolbar: finger only": the Pencil does not tap bars (R6-10). */
  fingerOnly: false,
}

/** A touch on a bar is dropped for this long after, with its late click (ms). */
const IGNORE_MS = 700

export function installPenTap(doc: Document = document): () => void {
  let down: {
    el: HTMLElement
    x: number
    y: number
    at: number
    id: number
  } | null = null
  let marked: { el: HTMLElement; at: number } | null = null
  let clicking = false
  // True only while a PEN pointer is down. Any other pointer (a finger)
  // resets it, so a finger can never be treated as the stylus.
  let penDown = false

  // A touch on a bar that was ignored: its late click is swallowed too.
  let ignoredAt = 0
  let ignoredId = -1
  const inBar = (t: EventTarget | null): t is Element =>
    t instanceof Element && !!t.closest(BAR_SELECTOR)

  const inChrome = (t: EventTarget | null): t is Element =>
    t instanceof Element && !!t.closest(CHROME_SELECTOR) && !t.closest(NATIVE)

  const onTouch = (e: TouchEvent) => {
    if (!penTapOptions.enabled) return
    for (const t of Array.from(e.changedTouches)) {
      const type = (t as Touch & { touchType?: string }).touchType
      if (type === 'stylus' && penDown && inChrome(t.target) && e.cancelable) {
        e.preventDefault()
        penTapStats.cancelledTouches++
        return
      }
    }
  }
  const onDown = (e: PointerEvent) => {
    down = null
    // Bars (R6-10): the palm is ignored (a touch while the Pencil is down or
    // has just lifted), and with "finger only" so is the Pencil itself.
    if (
      inBar(e.target) &&
      ((e.pointerType === 'pen' && penTapOptions.fingerOnly) || barPalm(e))
    ) {
      if (e.pointerType === 'pen') penDown = true
      e.preventDefault()
      e.stopImmediatePropagation()
      ignoredId = e.pointerId
      ignoredAt = performance.now()
      penTapStats.ignored++
      return
    }
    penDown = e.pointerType === 'pen'
    // Our own in-page buttons: the Pencil presses them and the page behind
    // (caret, Scribble) never sees the touch (items 2, 3).
    if (
      penDown &&
      e.target instanceof Element &&
      e.target.closest('[data-ui]') &&
      !e.target.closest(NATIVE) &&
      e.cancelable
    )
      e.preventDefault()
    // A Pencil lift that never comes is dropped after 4 s without movement.
    if (penDown) {
      inputMachine.begin(e, 'penTap', () => {
        penDown = false
        down = null
      })
    }
    // A finger or mouse touch ends any pending Pencil click or swallow.
    if (e.pointerType === 'touch') marked = null
    if (!penTapOptions.enabled || e.pointerType !== 'pen') return
    if (!inChrome(e.target)) return
    const el = (e.target as Element).closest<HTMLElement>(ACTION)
    if (!el) return
    down = { el, x: e.clientX, y: e.clientY, at: e.timeStamp, id: e.pointerId }
  }
  const onUp = (e: PointerEvent) => {
    const d = down
    down = null
    if (e.pointerType === 'pen') penDown = false
    // The lift of an ignored touch must not act as a tap either.
    if (e.pointerId === ignoredId) {
      ignoredId = -1
      e.preventDefault()
      e.stopImmediatePropagation()
      return
    }
    if (!d || e.pointerType !== 'pen' || e.pointerId !== d.id) return
    if (!penTapOptions.enabled) return
    const target = e.target instanceof Element ? e.target : null
    const el = target?.closest<HTMLElement>(ACTION)
    if (el !== d.el) return
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) >= MAX_MOVE) return
    if (e.timeStamp - d.at >= MAX_MS) return
    if (
      (el as HTMLButtonElement).disabled ||
      el.getAttribute('aria-disabled') === 'true' ||
      el.closest('[data-pen-own]')
    )
      return
    marked = { el, at: performance.now() }
    penTapStats.clicks++
    clicking = true
    try {
      el.click()
    } finally {
      clicking = false
    }
  }
  const onClick = (e: MouseEvent) => {
    if (
      !clicking &&
      performance.now() - ignoredAt < IGNORE_MS &&
      inBar(e.target)
    ) {
      e.stopImmediatePropagation()
      e.preventDefault()
      return
    }
    const m = marked
    if (!m || clicking) return // ours goes through
    if (performance.now() - m.at > SWALLOW_MS) {
      marked = null
      return
    }
    if (e.target instanceof Node && m.el.contains(e.target)) {
      penTapStats.swallowed++
      e.stopImmediatePropagation()
      e.preventDefault()
    }
  }

  doc.addEventListener('touchstart', onTouch, { capture: true, passive: false })
  doc.addEventListener('pointerdown', onDown, true)
  doc.addEventListener('pointerup', onUp, true)
  const onCancel = (e: PointerEvent) => {
    if (e.pointerType === 'pen') penDown = false
    if (e.pointerId === ignoredId) ignoredId = -1
  }
  doc.addEventListener('pointercancel', onCancel, true)
  doc.addEventListener('click', onClick, true)
  // R6-4: a long press on our own bars and menus opens no system menu.
  const onMenu = (e: Event) => {
    if (inChrome(e.target) && e.cancelable) e.preventDefault()
  }
  doc.addEventListener('contextmenu', onMenu, true)
  // The watchdog: a Pencil left "down" (its lift was lost in the background)
  // would cancel every later stylus touch on the bars.
  const offReset = onGestureReset(() => {
    penDown = false
    down = null
    marked = null
    ignoredId = -1
  })
  const offState = registerToolState('penTap', () => ({
    penDown,
    pending: down?.el.tagName ?? null,
    ignoredId,
    ...penTapStats,
  }))
  return () => {
    offReset()
    offState()
    doc.removeEventListener('touchstart', onTouch, true)
    doc.removeEventListener('pointerdown', onDown, true)
    doc.removeEventListener('pointerup', onUp, true)
    doc.removeEventListener('pointercancel', onCancel, true)
    doc.removeEventListener('click', onClick, true)
    doc.removeEventListener('contextmenu', onMenu, true)
  }
}
