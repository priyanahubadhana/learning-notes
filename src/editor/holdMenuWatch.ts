import { onGestureReset, registerToolState } from '../app/gestureReset'
import { activeTool } from '../app/tools/main/mainTools'
import { holdMenuSetting } from '../settings/builtinSettings'
import { readDeviceSetting } from '../settings/settingsService'
import {
  PEN_QUIET_MS,
  holdMsFor,
  HoldPath,
  noteWritten,
  wroteRecently,
} from '../app/input/penHold'
import type { AppSchema } from './schema'

/**
 * Press-and-hold menu (bug batch 19, owner 10 Nov): under the Text tool,
 * pressing and holding still on the page (finger, Pencil or a mouse button)
 * for 0.5 s (setting, 0.4-3 s) opens OUR menu at that spot: Paste, Select, Select all,
 * Cut/Copy, Insert. It only opens if the pointer stayed within ~10 px; any
 * movement (a scroll, a drag, a selection handle) cancels it. The system
 * callout never shows (CSS `-webkit-touch-callout`, and the context menu of
 * a touch press is cancelled).
 */

type Editor = AppSchema['BlockNoteEditor']

/** The press may drift this far (px) and still count as still (item 5). */
export const HOLD_STILL_PX = 10

/** One letter's reach (px): how far right of a line's end counts as empty. */
export const PEN_CARET_PX = 12

/** The filling ring shows after this long (ms, item 6). */
export const RING_AFTER_MS = 400

/** No Pencil hold within this long after text was written (ms, item 5). */
export { PEN_QUIET_MS }

/** Pure rule: has the press moved too far to stay a hold? */
export const movedTooFar = (
  dx: number,
  dy: number,
  slop = HOLD_STILL_PX,
): boolean => Math.hypot(dx, dy) > slop

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
 * B10 (flag page.menus): a spot with no words under it: an empty line, or
 * further right of the line's last letter than one letter's reach. A Pencil
 * hold there is not Scribble (nothing to write over), so our menu may open.
 */
export function onEmptySpot(editor: Editor, x: number, y: number): boolean {
  const view = editor.prosemirrorView
  if (!view) return false
  try {
    const at = view.posAtCoords({ left: x, top: y })
    if (!at) return false
    const $pos = view.state.doc.resolve(at.pos)
    const text = $pos.parent.textContent
    if (text.trim() === '') return true
    // End of this textblock's line: the caret rectangle at the block's end.
    const end = view.coordsAtPos($pos.end())
    const sameLine = y >= end.top - 4 && y <= end.bottom + 4
    return sameLine && x > end.right + PEN_CARET_PX * 2
  } catch {
    return false
  }
}

/** The small ring that fills while the hold runs (item 6); lift to cancel. */
export function showRing(doc: Document, x: number, y: number, ms: number) {
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
  /** `rightClick`: a mouse right-click opens it too (flag page.menus, PM-20). */
  opts: { rightClick?: boolean; penEmptySpot?: boolean } = {},
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
    path: HoldPath
    timer: number
    ringTimer: number
    ring: (() => void) | null
  } | null = null
  /** When the last menu opened: its press's own context menu is cancelled. */
  let openedAt = 0
  /** When text last went into the page (typing, Scribble). */

  /**
   * C0-7: Apple's magnifier starts at about the same time as our strip. Once
   * our strip opens, the page text takes no selection until the finger lifts
   * (taps, typing and Scribble are not touched: this starts only at the hold).
   */
  const lockSelection = () => {
    dom.setAttribute('data-hold-lock', '')
    window.setTimeout(unlock, 4000)
  }
  const unlock = () => dom.removeAttribute('data-hold-lock')

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
    // C0-7: the Pencil may hold anywhere in the box, but not right after
    // text went in (Scribble rests still before a stroke).
    if (e.pointerType === 'pen' && wroteRecently()) return
    // The Pencil's hold is fixed (0.8 s, 18 px: penHold.ts); the setting is for finger and mouse.
    const hold = holdMsFor(e.pointerType, readDeviceSetting(holdMenuSetting))
    const me = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      type: e.pointerType,
      pressure: e.pressure,
      path: new HoldPath(e.clientX, e.clientY),
      ring: null as (() => void) | null,
      ringTimer: 0,
      timer: window.setTimeout(() => {
        if (!press || press !== me || activeTool.get() !== 'text') return
        const at = { x: press.x, y: press.y, pointerType: press.type }
        stop()
        openedAt = Date.now()
        lockSelection()
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
    // The Pencil also breaks it by travelling a path longer than 36 px (a loop).
    let broke = false
    if (press.type === 'pen') {
      const pts = e.getCoalescedEvents?.() ?? []
      for (const c of pts.length > 0 ? pts : [e])
        if (press.path.add(c.clientX, c.clientY)) broke = true
    } else {
      broke = movedTooFar(e.clientX - press.x, e.clientY - press.y)
    }
    if (broke || (press.type === 'pen' && e.pressure - press.pressure > 0.2))
      stop()
  }
  const onEnd = (e: PointerEvent) => {
    unlock()
    if (press && e.pointerId === press.id) stop()
  }
  // Text going in (keys, Scribble, dictation): note it, and end a hold.
  const onInput = (e: Event) => {
    if (e.target instanceof Node && dom.contains(e.target)) {
      noteWritten()
      stop()
    }
  }
  // The press that opened our menu must not open the system's too.
  const onContext = (e: Event) => {
    const inside = e.target instanceof Node && dom.contains(e.target)
    if (press || Date.now() - openedAt < 1500) {
      if (inside) e.preventDefault()
      return
    }
    // A mouse right-click opens the same menu where it was pressed.
    if (!opts.rightClick || !inside || !(e instanceof MouseEvent)) return
    if (
      e.target instanceof Element &&
      e.target.closest(
        'a, button, input, textarea, select, [data-no-hold-menu], [data-ui]',
      )
    )
      return
    e.preventDefault()
    openedAt = Date.now()
    onOpen({ x: e.clientX, y: e.clientY, pointerType: 'mouse' })
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
    unlock()
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
