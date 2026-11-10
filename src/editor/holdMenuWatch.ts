import { onGestureReset, registerToolState } from '../app/gestureReset'
import { activeTool } from '../app/tools/main/mainTools'
import { holdMenuSetting } from '../settings/builtinSettings'
import { readDeviceSetting } from '../settings/settingsService'
import type { AppSchema } from './schema'

/**
 * Press-and-hold menu (bug batch 19, owner 10 Nov): under the Text tool,
 * pressing and holding still on the page (finger, Pencil or a mouse button)
 * for about a second opens OUR menu at that spot: Paste, Select, Select all,
 * Cut/Copy, Insert. It only opens if the pointer stayed within ~6 px; any
 * movement (a scroll, a drag, a selection handle) cancels it. The system
 * callout never shows (CSS `-webkit-touch-callout`, and the context menu of
 * a touch press is cancelled).
 */

type Editor = AppSchema['BlockNoteEditor']

/** The press may drift this far (px) and still count as still. */
export const HOLD_STILL_PX = 6

/** Pure rule: has the press moved too far to stay a hold? */
export const movedTooFar = (dx: number, dy: number): boolean =>
  Math.hypot(dx, dy) > HOLD_STILL_PX

export interface HoldPoint {
  x: number
  y: number
  pointerType: string
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
    timer: number
  } | null = null
  /** When the last menu opened: its press's own context menu is cancelled. */
  let openedAt = 0

  const stop = () => {
    if (press) window.clearTimeout(press.timer)
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
      target.closest('a, button, input, textarea, select, [data-no-hold-menu]')
    )
      return
    press = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      type: e.pointerType,
      timer: window.setTimeout(() => {
        if (!press || activeTool.get() !== 'text') return
        const at = { x: press.x, y: press.y, pointerType: press.type }
        press = null
        openedAt = Date.now()
        onOpen(at)
      }, readDeviceSetting(holdMenuSetting)),
    }
  }
  const onMove = (e: PointerEvent) => {
    if (!press || e.pointerId !== press.id) return
    if (movedTooFar(e.clientX - press.x, e.clientY - press.y)) stop()
  }
  const onEnd = (e: PointerEvent) => {
    if (press && e.pointerId === press.id) stop()
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
  }
}
