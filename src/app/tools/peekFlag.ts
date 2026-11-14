import { isBoolean } from '../uiPrefs'
import { prefStore } from './store'

/**
 * TB-75: a peek (bar turned off in Settings, shown by the pill) is saved on
 * this device while it lasts. Any other change to the bar's place or on/off
 * (Settings, the top-bar button, the toggle) ends the peek: the flag is
 * cleared there, so a reload keeps what the person chose.
 */
export const peekWasOff = prefStore('toolbar.peekWasOff', isBoolean, false)
