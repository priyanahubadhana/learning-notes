import { memStore } from '../app/tools/store'
import type { BarLayout } from '../app/tools/barLayout'
import type { BarPlacement } from '../app/deviceMode'

/**
 * The page editor draws the docked tool bar only when the bar is not floating,
 * the page is not read-only and not in reading. PageEditor and the space kept
 * for the bar (below) both read this one rule, so they cannot drift apart.
 */
export const isDocked = (
  placement: BarPlacement,
  readOnly: boolean,
  inReading: boolean,
): boolean => placement !== 'floating' && !readOnly && !inReading

/**
 * Should the bar slot keep the tool bar's height before the page editor
 * (a lazy part) has drawn it? Only for the plain case: docked at the
 * top, no ribbon, not auto-hidden, a page route, not reading. Anything else
 * keeps no room (no blank space where no bar shows).
 */
export function barRoomWanted(p: {
  pageRoute: boolean
  placement: BarPlacement
  layout: BarLayout
  autoHide: boolean
  inReading: boolean
}): boolean {
  return (
    p.pageRoute &&
    isDocked(p.placement, false, p.inReading) &&
    p.layout.short === 'top' &&
    p.layout.ribbon === null &&
    !p.autoHide
  )
}

/**
 * R14: the height the room keeps, in px, or null for the new bar's own token
 * (--v8-bar-h, set in CSS). The old bar is one row of buttons (never under
 * 44 px) in a pill whose frame (border and padding) adds 10 px. Its real
 * height also depends on the screen (a phone wraps to two rows; a row that
 * overflows adds a 22 px scroll handle), so the height measured last time on
 * this screen size and button size, when there is one, wins.
 */
export const barRoomHeight = (
  v8: boolean,
  buttonPx: number,
  remembered: number | null = null,
): number | null => remembered ?? (v8 ? null : Math.max(buttonPx, 44) + 10)

/** Which screen the remembered height belongs to. */
export const roomKey = (buttonPx: number, width: number): string =>
  `${Math.max(buttonPx, 44)}@${Math.round(width)}`

/** The remembered heights: a short map from roomKey to px. */
export type RoomMap = Record<string, number>
export const isRoomMap = (v: unknown): v is RoomMap =>
  typeof v === 'object' &&
  v !== null &&
  !Array.isArray(v) &&
  Object.values(v).every((n) => typeof n === 'number' && n > 0 && n < 600)

/** The map with one height set (only the 8 newest screens are kept). */
export function withRoom(map: RoomMap, key: string, px: number): RoomMap {
  const rest = Object.entries(map).filter(([k]) => k !== key)
  return Object.fromEntries([...rest.slice(-7), [key, px]])
}

/** True while a page editor is mounted: it has decided to draw the bar or not. */
export const editorDecided = memStore<boolean>(false)
