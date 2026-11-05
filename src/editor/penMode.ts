import { activeTool } from '../app/tools/main/mainTools'
import { pencilWritesSetting } from '../settings/builtinSettings'
import { readDeviceSetting } from '../settings/settingsService'
import {
  deviceModeSetting,
  pencilTapTwiceSetting,
} from '../settings/builtinSettings'

/**
 * What the Pencil does depends on the active tool (owner, after trying 3a on
 * an iPad):
 *  - Text: the Pencil is free for Scribble handwriting into the text. Only a
 *    big scratch-out (20+ characters) is held back or offered an Undo.
 *  - Lasso: a Pencil drag selects (penSelect.ts).
 *  - Pen, Highlighter, Eraser: ink (step 3); until then a drag only selects.
 *  - Read: a tap places the cursor; a drag only selects.
 * Settings › Advanced › "Pencil writes text (Scribble)" stays as an override:
 * when it is on, Scribble is free whatever the tool.
 */
export const scribbleFree = (): boolean =>
  readDeviceSetting(pencilWritesSetting) === 'on' || activeTool.get() === 'text'

/**
 * Does a Pencil drag over the page get taken over to select text (penSelect)?
 * Only under the Lasso tool (owner: the Pencil was smooth before 3a, so there
 * is no global interception). Under the ink tools the Pencil is left alone
 * for ink; under Text it is free for Scribble; under Read it only taps.
 */
export const penSelectsText = (): boolean =>
  readDeviceSetting(pencilWritesSetting) !== 'on' &&
  activeTool.get() === 'lasso'

/** Is "Pencil: tap twice to start typing" on (Auto = Pencil mode)? */
export function tapTwiceActive(): boolean {
  const v = readDeviceSetting(pencilTapTwiceSetting)
  return (
    v === 'on' ||
    (v === 'auto' && readDeviceSetting(deviceModeSetting) === 'pencil')
  )
}
