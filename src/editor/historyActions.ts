import { redo, undo } from '../core/historySteps'
import {
  padHistoryBound,
  quietly,
  redoPad,
  undoPad,
} from './writePad/padHistory'
import { writePad } from './writePad/padState'
import type { AppSchema } from './schema'

type Editor = AppSchema['BlockNoteEditor']

/**
 * Undo or Redo from the bar or a menu. Everything goes to the page's one
 * history (history/pageHistory.ts): text in every box, drawings, boxes,
 * pictures, tags and the rest, in the order they happened. It works whether
 * or not the editor has focus and never opens the keyboard. The result is
 * true when the request was taken; the history itself tells the person (a
 * short message) when a step cannot be undone.
 */
export function runHistory(editor: Editor, kind: 'undo' | 'redo'): boolean {
  // The open Write pad keeps one list for the pad and the page, in the order
  // things happened (padHistory.ts); it calls runPageHistory for page steps.
  if (
    writePad.get()?.editor === editor &&
    padHistoryBound() &&
    (kind === 'undo' ? undoPad() : redoPad())
  )
    return true
  return quietly(() => runPageHistory(editor, kind))
}

/** The page's own Undo / Redo (the journal), newest step first. */
export function runPageHistory(
  _editor: Editor,
  kind: 'undo' | 'redo',
): boolean {
  void (kind === 'undo' ? undo() : redo())
  return true
}
