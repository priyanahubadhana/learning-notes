import { useEffect } from 'react'
import { useFlag } from '../app/flags'
import { prefStore } from '../app/tools/store'
import { useBarSettings } from '../settings/deviceModeSettings'
import { readingView } from '../app/reading/readingState'
import {
  barRoomHeight,
  OLD_BAR_H,
  barRoomWanted,
  editorDecided,
  isRoomMap,
  roomKey,
  withRoom,
} from './barRoomRule'
import { useBarLayout } from './useBarLayout'
import { COMPACT_PAGE_W, PHONE_MAX_W } from '../app/shell/columns'

/** The bar's height last measured per screen (a display convenience, R14). */
const rooms = prefStore('bar.roomPx', isRoomMap, {})

/**
 * Keeps the tool bar's height in the bar slot from the first paint until the
 * page editor has drawn the bar, so the page below does not jump down when
 * the lazy parts arrive (F8). R14: the old bar keeps its room too, as tall as
 * it was last time on this screen (or its plain height the first time).
 * Hidden by CSS the moment the real bar is there (see shell.css), and gone
 * once the editor has decided (no bar = no blank).
 */
export function BarRoom({ pageRoute }: { pageRoute: boolean }) {
  const v8 = useFlag('toolbar.v8')
  // R14: the old bar's room goes live with Phase 1 (foundation.shell), not before.
  const shell = useFlag('foundation.shell')
  const bar = useBarSettings()
  const layout = useBarLayout()
  const reading = readingView.useValue() !== 'off'
  const decided = editorDecided.useValue()
  const remembered = rooms.useValue()
  const key = roomKey(bar.buttonPx, window.innerWidth)
  const buttonPx = bar.buttonPx

  // The old bar's height on this screen, remembered for the next start.
  useEffect(() => {
    if (v8 || !shell) return
    const slot = document.querySelector('[data-bar-slot]')
    if (!slot) return
    const ro = new ResizeObserver(() => {
      // The button rows plus the pill's frame (10 px); a selection's extra row is not part of it.
      const row = slot.querySelector('[data-pill="short"] [data-main-bar]')
      let h = row ? Math.round(row.getBoundingClientRect().height) + 10 : 0
      // Why: a docked side list narrows the page column on an iPad, so the bar
      // overflows and shows its 22 px scroll handle; saved as the screen's height,
      // the room was too tall on the next start (list closed) and the page jumped
      // up (ipad-webkit barRoom R14). A narrowed column's handle is not counted.
      const handle = row?.querySelector('[data-bar-track]')
      if (
        h > 0 &&
        handle &&
        window.innerWidth > PHONE_MAX_W &&
        slot.clientWidth < COMPACT_PAGE_W
      )
        h -= Math.round(handle.getBoundingClientRect().height) + 2
      // The key is read now, so a turned screen saves under its new width.
      const now = roomKey(buttonPx, window.innerWidth)
      if (h > 0 && rooms.get()[now] !== h)
        rooms.set(withRoom(rooms.get(), now, h))
    })
    const watch = () => {
      ro.disconnect()
      ro.observe(slot)
      const row = slot.querySelector('[data-pill="short"] [data-main-bar]')
      if (row) ro.observe(row)
    }
    watch()
    const mo = new MutationObserver(watch)
    mo.observe(slot, { childList: true, subtree: true })
    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [v8, shell, buttonPx])

  if (
    (!v8 && !shell) ||
    decided ||
    !barRoomWanted({
      pageRoute,
      placement: bar.placement,
      layout,
      autoHide: bar.autoHide,
      inReading: reading,
    })
  )
    return null
  const height = barRoomHeight(
    v8,
    bar.buttonPx,
    remembered[key] ?? null,
    shell ? OLD_BAR_H : 0,
  )
  return (
    <div
      aria-hidden
      data-bar-room
      style={height === null ? undefined : { minHeight: height }}
    />
  )
}
