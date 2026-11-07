import { pmHistory } from './pm'
import {
  padHistoryBound,
  quietly,
  redoPad,
  undoPad,
} from './writePad/padHistory'
import { writePad } from './writePad/padState'
import { inkFor } from '../ink/inkRuntime'
import type { AppSchema } from './schema'

type Editor = AppSchema['BlockNoteEditor']

/**
 * Undo or Redo from the bar. Runs the history command on the editor's view
 * itself, so it works whether or not the editor has focus (the bar button
 * took it), then puts the cursor back in the page. Returns false when there
 * was nothing to undo or redo. Drawings share the history: the newest step
 * of text and ink is undone first (see ink/inkHistory.ts).
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

/** The page's own Undo / Redo: text and drawings, newest first. */
export function runPageHistory(editor: Editor, kind: 'undo' | 'redo'): boolean {
  // Drawings and text share one history: the newest of the two goes first.
  const ink = inkFor(editor)?.controller
  const view = editor.prosemirrorView
  const { undo, redo } = pmHistory()
  const text = kind === 'undo' ? undo : redo
  // A delete of drawings and text together (the Lasso) is one step.
  if (ink && view && kind === 'undo' && ink.undoIsChained()) {
    text(view.state, view.dispatch, view)
    return ink.undo()
  }
  const chainedRedo = !!ink && kind === 'redo' && ink.redoIsChained()
  if (ink && (kind === 'undo' ? ink.undo() : ink.redo())) {
    if (chainedRedo && view) text(view.state, view.dispatch, view)
    return true
  }
  if (!view) return kind === 'undo' ? editor.undo() : editor.redo()
  const done = text(view.state, view.dispatch, view)
  // Never focus here: Undo must not open the keyboard.
  return done
}
