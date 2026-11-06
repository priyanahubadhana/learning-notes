/**
 * Pencil taps on the app's bars, pills, cards and menus.
 *
 * iPadOS Scribble may read a Pencil touch near editable text as handwriting
 * (a comma appears), and Safari can swallow a tap that lands near a button's
 * edge. So on chrome the Pencil's touch is cancelled (the page never sees it)
 * and we click the control ourselves when the Pencil lifts. A finger or a
 * mouse is untouched.
 */

/** Everything that counts as chrome (the app's own controls). */
export const CHROME_SELECTOR =
  '[data-chrome], [data-bar], [data-pill-root], [data-popup], [role="menu"], [role="dialog"]'

/** Where a Pencil touch is left alone (typing, sliders, own pointer code). */
const NATIVE =
  'input, textarea, select, [contenteditable="true"], [data-pen-native]'
const ACTION =
  'button, [role=button], [role=menuitem], [role=tab], [role=option], [role=switch], a, label'

const MAX_MOVE = 12
const MAX_MS = 1000
const SWALLOW_MS = 500

export interface PenTapStats {
  cancelledTouches: number
  clicks: number
  swallowed: number
}
export const penTapStats: PenTapStats = {
  cancelledTouches: 0,
  clicks: 0,
  swallowed: 0,
}

/** Switched off by the Pencil lab to show what the measure does. */
export const penTapOptions = {
  enabled: true,
  /** Is this click the browser's own? (Tests replace it.) */
  trusted: (e: Event) => e.isTrusted,
}

export function installPenTap(doc: Document = document): () => void {
  let down: {
    el: HTMLElement
    x: number
    y: number
    at: number
    id: number
  } | null = null
  let marked: { el: HTMLElement; at: number } | null = null

  const inChrome = (t: EventTarget | null): t is Element =>
    t instanceof Element && !!t.closest(CHROME_SELECTOR) && !t.closest(NATIVE)

  const onTouch = (e: TouchEvent) => {
    if (!penTapOptions.enabled) return
    for (const t of Array.from(e.changedTouches)) {
      const type = (t as Touch & { touchType?: string }).touchType
      if (type === 'stylus' && inChrome(t.target) && e.cancelable) {
        e.preventDefault()
        penTapStats.cancelledTouches++
        return
      }
    }
  }
  const onDown = (e: PointerEvent) => {
    down = null
    if (!penTapOptions.enabled || e.pointerType !== 'pen') return
    if (!inChrome(e.target)) return
    const el = (e.target as Element).closest<HTMLElement>(ACTION)
    if (!el) return
    down = { el, x: e.clientX, y: e.clientY, at: e.timeStamp, id: e.pointerId }
  }
  const onUp = (e: PointerEvent) => {
    const d = down
    down = null
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
    el.click()
  }
  const onClick = (e: MouseEvent) => {
    const m = marked
    if (!m || !penTapOptions.trusted(e)) return
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
  doc.addEventListener('click', onClick, true)
  return () => {
    doc.removeEventListener('touchstart', onTouch, true)
    doc.removeEventListener('pointerdown', onDown, true)
    doc.removeEventListener('pointerup', onUp, true)
    doc.removeEventListener('click', onClick, true)
  }
}
