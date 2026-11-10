import { onGestureReset, registerToolState } from '../app/gestureReset'
import { activeTool } from '../app/tools/main/mainTools'
import { holdMenuSetting } from '../settings/builtinSettings'
import { readDeviceSetting } from '../settings/settingsService'
import type { AppSchema } from './schema'

/**
 * Press-and-hold menu (bug batch 19, owner 10 Nov): under the Text tool,
 * pressing and holding still on the page (finger, Pencil or a mouse button)
 * for 1.5 s (setting, 0.6-3 s) opens OUR menu at that spot: Paste, Select, Select all,
 * Cut/Copy, Insert. It only opens if the pointer stayed within ~5 px; any
 * movement (a scroll, a drag, a selection handle) cancels it. The system
 * callout never shows (CSS `-webkit-touch-callout`, and the context menu of
 * a touch press is cancelled).
 */

type Editor = AppSchema['BlockNoteEditor']

/** The press may drift this far (px) and still count as still (item 5). */
export const HOLD_STILL_PX = 5

/** The Pencil opens the menu only this close to the caret (px, item 5). */
export const PEN_CARET_PX = 12

/** The filling ring shows after this long (ms, item 6). */
export const RING_AFTER_MS = 400

/** No Pencil hold within this long after text was written (ms, item 5). */
export const PEN_QUIET_MS = 3000

/** Pure rule: has the press moved too far to stay a hold? */
export const movedTooFar = (dx: number, dy: number): boolean =>
  Math.hypot(dx, dy) > HOLD_STILL_PX

/** Pure rule: distance from a point to a rectangle (0 inside). */
export const distToRect = (
  x: number,
  y: number,
  r: { left: number; right: number; top: number; bottom: number },
): number =>
  Math.hypot(
    Math.max(r.left - x, 0, x - r.right),
    Math.max(r.top - y, 0, y - r.bottom),
  )

export interface HoldPoint {
  x: number
  y: number
  pointerType: string
}

/**
 * With the Pencil a hold is also how Scribble starts a word, so it opens the
 * menu only on or right next to the caret, or on a selection. Elsewhere it
 * does nothing (it is writing).
 */
function penOnCaretOrSelection(editor: Editor, x: number, y: number): boolean {
  const view = editor.prosemirrorView
  if (!view || !view.hasFocus()) return false
  const sel = view.state.selection
  try {
    if (!sel.empty) {
      const at = view.posAtCoords({ left: x, top: y })
      return !!at && at.pos >= sel.from && at.pos <= sel.to
    }
    const c = view.coordsAtPos(sel.head)
    return distToRect(x, y, c) <= PEN_CARET_PX
  } catch {
    return false
  }
}

/** The small ring that fills while the hold runs (item 6); lift to cancel. */
function showRing(doc: Document, x: number, y: number, ms: number) {
  const el = doc.createElement('div')
  el.setAttribute('data-hold-ring', '')
  el.setAttribute('aria-hidden', 'true')
  el.style.cssText =
    'position:fixed;z-index:60;pointer-events:none;width:32px;height:32px;' +
    'left:' +
    (x - 16) +
    'px;top:' +
    (y - 16) +
    'px;'
  el.innerHTML =
    '<svg width="32" height="32" viewBox="0 0 32 32" fill="none">' +
    '<circle cx="16" cy="16" r="12" stroke="currentColor" stroke-opacity=".2" stroke-width="3"/>' +
    '<circle cx="16" cy="16" r="12" stroke="currentColor" stroke-width="3" stroke-linecap="round" ' +
    'stroke-dasharray="75.4" stroke-dashoffset="75.4" transform="rotate(-90 16 16)"/></svg>'
  el.style.color = 'var(--color-accent)'
  doc.body.appendChild(el)
  el.querySelectorAll('circle')[1]?.animate?.(
    [{ strokeDashoffset: 75.4 }, { strokeDashoffset: 0 }],
    { duration: Math.max(1, ms), easing: 'linear', fill: 'forwards' },
  )
  return () => el.remove()
}

export function watchHoldMenu(
  editor: Editor,
  onOpen: (at: HoldPoint) => void,
): () => void {
  const dom = editor.domElement
  if (!dom) return () => {}
  const doc = dom.ownerDocument
  let press: {
    id: number
    x: number
    y: number
    type: string
    pressure: number
    timer: number
    ringTimer: number
    ring: (() => void) | null
  } | null = null
  /** When the last menu opened: its press's own context menu is cancelled. */
  let openedAt = 0
  /** When text last went into the page (typing, Scribble). */
  let wroteAt = 0

  const stop = () => {
    if (press) {
      window.clearTimeout(press.timer)
      window.clearTimeout(press.ringTimer)
      press.ring?.()
    }
    press = null
  }
  const onDown = (e: PointerEvent) => {
    stop()
    if (e.button > 0 || !e.isPrimary) return
    if (activeTool.get() !== 'text') return
    const target = e.target
    if (
      !(target instanceof Element) ||
      !dom.contains(target) ||
      target.closest(
        'a, button, input, textarea, select, [data-no-hold-menu], [data-ui]',
      )
    )
      return
    // Writing: the Pencil rests still before a Scribble stroke. No menu
    // right after text went in, and only on the caret or a selection.
    if (e.pointerType === 'pen') {
      if (Date.now() - wroteAt < PEN_QUIET_MS) return
      if (!penOnCaretOrSelection(editor, e.clientX, e.clientY)) return
    }
    const hold = readDeviceSetting(holdMenuSetting)
    const me = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      type: e.pointerType,
      pressure: e.pressure,
      ring: null as (() => void) | null,
      ringTimer: 0,
      timer: window.setTimeout(() => {
        if (!press || press !== me || activeTool.get() !== 'text') return
        const at = { x: press.x, y: press.y, pointerType: press.type }
        stop()
        openedAt = Date.now()
        onOpen(at)
      }, hold),
    }
    me.ringTimer = window.setTimeout(
      () => {
        if (press === me)
          me.ring = showRing(doc, me.x, me.y, hold - RING_AFTER_MS)
      },
      Math.min(RING_AFTER_MS, hold),
    )
    press = me
  }
  const onMove = (e: PointerEvent) => {
    if (!press || e.pointerId !== press.id) return
    // Any drift beyond the radius, or a harder press, ends this hold for the
    // whole stroke (nothing re-arms until the next pointerdown).
    if (
      movedTooFar(e.clientX - press.x, e.clientY - press.y) ||
      (press.type === 'pen' && e.pressure - press.pressure > 0.2)
    )
      stop()
  }
  const onEnd = (e: PointerEvent) => {
    if (press && e.pointerId === press.id) stop()
  }
  // Text going in (keys, Scribble, dictation): note it, and end a hold.
  const onInput = (e: Event) => {
    if (e.target instanceof Node && dom.contains(e.target)) {
      wroteAt = Date.now()
      stop()
    }
  }
  // The press that opened our menu must not open the system's too.
  const onContext = (e: Event) => {
    if (press || Date.now() - openedAt < 1500) {
      if (e.target instanceof Node && dom.contains(e.target)) e.preventDefault()
    }
  }
  doc.addEventListener('pointerdown', onDown, true)
  doc.addEventListener('pointermove', onMove, true)
  doc.addEventListener('pointerup', onEnd, true)
  doc.addEventListener('pointercancel', onEnd, true)
  doc.addEventListener('contextmenu', onContext, true)
  doc.addEventListener('beforeinput', onInput, true)
  const offReset = onGestureReset(stop)
  const offState = registerToolState('holdMenu', () => ({
    press: press ? `#${press.id} ${press.type}` : null,
    openedAgoMs: openedAt ? Date.now() - openedAt : null,
  }))
  return () => {
    stop()
    offReset()
    offState()
    doc.removeEventListener('pointerdown', onDown, true)
    doc.removeEventListener('pointermove', onMove, true)
    doc.removeEventListener('pointerup', onEnd, true)
    doc.removeEventListener('pointercancel', onEnd, true)
    doc.removeEventListener('contextmenu', onContext, true)
    doc.removeEventListener('beforeinput', onInput, true)
  }
}
