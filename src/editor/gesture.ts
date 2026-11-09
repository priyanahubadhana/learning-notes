import { onGestureReset, registerToolState } from '../app/gestureReset'
import { ANY_POINTER, inputMachine } from '../app/inputMachine'
/**
 * A selection gesture that STARTED ON TEXT (finger, Pencil or mouse). While it
 * lasts, pictures, embeds and other non-text blocks let the pointer pass over
 * them (CSS `ln-selgesture`, see index.css), so the browser's own selection
 * crosses them instead of the embed capturing the pointer, starting a drag
 * or scrolling. A press that STARTS on a picture is not a selection gesture
 * (its long press keeps its menu and drag).
 */
export const selectGesture = { active: false }

// The watchdog: a selection gesture whose lift was lost in the background
// would make the Lasso give way to it for ever (controller.lassoMove).
onGestureReset(() => {
  if (!selectGesture.active) return
  selectGesture.active = false
  if (typeof document !== 'undefined') {
    for (const el of document.querySelectorAll('.ln-selgesture')) {
      el.classList.remove('ln-selgesture')
    }
  }
})
registerToolState('selectGesture', () => ({ active: selectGesture.active }))

export function beginSelectGesture(
  dom: HTMLElement,
  pointerId: number = ANY_POINTER,
): void {
  selectGesture.active = true
  dom.classList.add('ln-selgesture')
  // The same 4 s age limit as every pointer: a lift that never came must not
  // make the Lasso give way for ever.
  inputMachine.begin(
    { pointerId },
    'selectGesture',
    () => endSelectGesture(dom),
    'selecting',
  )
}

export function endSelectGesture(dom: HTMLElement): void {
  inputMachine.endOwner('selectGesture')
  selectGesture.active = false
  dom.classList.remove('ln-selgesture')
}
