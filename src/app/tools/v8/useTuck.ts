import { isBoolean } from '../../uiPrefs'
import { prefStore } from '../store'
import { hideToolBar, isToolBarOn, showToolBar } from '../toolbarVisibility'
import { hideWhileWriting, nextTuck, tuckState, type TuckEvent } from './tuck'

/**
 * TB-75: a peek (bar turned off in Settings, shown by the pill) is saved on
 * this device while it lasts. If the page is reloaded during the peek, the
 * bar goes back to "off" at start instead of staying on for good.
 */
const peekWasOff = prefStore('toolbar.peekWasOff', isBoolean, false)
if (peekWasOff.get()) {
  peekWasOff.set(false)
  hideToolBar()
}

/** Runs one event through the BUG-003 rules and applies the result. */
export function dispatchTuck(e: TuckEvent): void {
  const prev = tuckState.get()
  const next = nextTuck(prev, e, { hideWhileWriting: hideWhileWriting.get() })
  if (
    next.tucked === prev.tucked &&
    next.peeking === prev.peeking &&
    next.toolUsed === prev.toolUsed
  )
    return
  tuckState.set(next)
  // A peek that ends goes back to "turned off" in Settings (TB-75).
  if (prev.peeking && !next.peeking) peekWasOff.set(false)
  if (prev.peeking && !next.peeking && next.tucked) hideToolBar()
}

/** The "Show toolbar" pill: shows the bar, and remembers if it was off. */
export function showFromPill(): void {
  const wasOff = !isToolBarOn()
  showToolBar()
  if (wasOff) peekWasOff.set(true)
  dispatchTuck({ type: 'show', wasOff })
}
