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
 * Should the bar slot keep the new tool bar's height before the page editor
 * (a lazy part) has drawn it? Only for the plain case: bar on, docked at the
 * top, no ribbon, not auto-hidden, a page route, not reading. Anything else
 * keeps no room (no blank space where no bar shows).
 */
export function barRoomWanted(p: {
  v8: boolean
  pageRoute: boolean
  placement: BarPlacement
  layout: BarLayout
  autoHide: boolean
  inReading: boolean
}): boolean {
  return (
    p.v8 &&
    p.pageRoute &&
    isDocked(p.placement, false, p.inReading) &&
    p.layout.short === 'top' &&
    p.layout.ribbon === null &&
    !p.autoHide
  )
}

/** True while a page editor is mounted: it has decided to draw the bar or not. */
export const editorDecided = memStore<boolean>(false)
