import { activeBox, boxEditors } from '../../../paper/activeBox'
import { onRouted, PRIORITY } from '../../input/eventRouter'
import { currentRunner } from '../toolRuntime'
import { nextSize } from './textStyle'

/**
 * "The size for what is written next" (box bar part B, switch textbox.v2): when
 * the person has picked a size in the Text tool, the first letter typed with the
 * caret in a box gets it (a key press comes before the letter, so the letter
 * is the first to carry it and the rest follow). Words already there keep theirs.
 */
export function watchNextSize(): () => void {
  return onRouted(
    'keydown',
    (e) => {
      const want = nextSize.get()
      if (want === null || e.key.length !== 1 || e.ctrlKey || e.metaKey) return
      try {
        const at = activeBox.get()
        const ed =
          (at && boxEditors.get(at.pageId, at.boxId)) ?? currentRunner().editor
        const view = ed?.prosemirrorView
        if (!ed || !view?.hasFocus() || !view.state.selection.empty) return
        const now = (ed.getActiveStyles() as Record<string, unknown>).fontSize
        if (now !== String(want))
          ed.addStyles({ fontSize: String(want) } as never)
      } catch {
        /* no editor: nothing to do */
      }
    },
    { priority: PRIORITY.gesture, name: 'nextSize' },
  )
}

/**
 * The Text tool's size control with textbox.v2 (box bar part B): the SAME size
 * strip as the box bar (number, slider, − / +, any number). Here it sets the
 * size for what is written next: it is kept on this device and put on the
 * caret now (words already selected are left alone; the box bar sizes those).
 */
export function applyNextSize(px: number): void {
  try {
    const ed = currentRunner().editor
    if (ed && ed.getSelectedText() === '')
      ed.addStyles({ fontSize: String(px) } as never)
  } catch {
    /* no editor open: the size waits in the setting */
  }
}
