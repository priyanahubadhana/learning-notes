import { useKeyboardInset } from '../../settings/deviceModeSettings'
import { KEYBOARD_BAR_PX } from '../toastTiming'

/**
 * BUG-006: the keyboard shrinks only the VISUAL viewport. Returns the pixels
 * the keyboard, and the text bar above it, cover at the foot (0 without a
 * keyboard). Re-draws whenever the viewport changes.
 */
export function useFootLift(): number {
  const keys = useKeyboardInset()
  return keys > 150 ? keys + KEYBOARD_BAR_PX : keys
}
