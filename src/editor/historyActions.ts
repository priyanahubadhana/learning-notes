import { pmHistory } from './pm'
import { redoPad, undoPad } from './writePad/padHistory'
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
  // The open Write pad has its own history for the text not yet inserted.
  if (
    writePad.get()?.editor === editor &&
    (kind === 'undo' ? undoPad() : redoPad())
  )
    return true
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
