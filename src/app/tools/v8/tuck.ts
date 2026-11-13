import { memStore, prefStore } from '../store'
import { isBoolean } from '../../uiPrefs'

/**
 * BUG-003 / TB-74 / TB-75: the tool bar tucks away when you start writing,
 * and one "Show toolbar" pill brings it back. The rules are a pure step
 * function; `useTuck.ts` feeds it the page's events.
 *
 * - `tucked`: the bar is hidden now (the pill shows).
 * - `peeking`: the bar was turned off in Settings and the person tapped
 *   "Show toolbar": it stays only until a tool has been used and writing starts.
 * - `toolUsed`: a tool was picked since the bar was last shown.
 */
export interface TuckState {
  tucked: boolean
  peeking: boolean
  toolUsed: boolean
}

export type TuckEvent =
  { type: 'write' } | { type: 'tool' } | { type: 'show'; wasOff?: boolean }

export interface TuckConfig {
  hideWhileWriting: boolean
}

export const IDLE_TUCK: TuckState = {
  tucked: false,
  peeking: false,
  toolUsed: false,
}

export function nextTuck(
  s: TuckState,
  e: TuckEvent,
  cfg: TuckConfig,
): TuckState {
  switch (e.type) {
    case 'show':
      return { tucked: false, peeking: !!e.wasOff, toolUsed: false }
    case 'tool':
      return s.tucked ? s : { ...s, toolUsed: true }
    case 'write': {
      if (s.tucked) return s
      if (s.peeking) {
        // Turned off in Settings: back to off once a tool was used and writing starts.
        return s.toolUsed
          ? { tucked: true, peeking: false, toolUsed: false }
          : s
      }
      return cfg.hideWhileWriting ? { ...s, tucked: true } : s
    }
  }
}

/** The state now (memory only: a reload shows the bar again). */
export const tuckState = memStore<TuckState>(IDLE_TUCK)

/** "Hide toolbar while writing" (Settings › Tool bar), off by default. */
export const hideWhileWriting = prefStore(
  'toolbar.hideWhileWriting',
  isBoolean,
  false,
)

export const isTucked = (): boolean => tuckState.get().tucked
