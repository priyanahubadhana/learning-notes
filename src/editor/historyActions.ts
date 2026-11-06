import { redo, undo } from 'prosemirror-history'
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
  // Drawings and text share one history: the newest of the two goes first.
  const ink = inkFor(editor)?.controller
  if (ink && (kind === 'undo' ? ink.undo() : ink.redo())) return true
  const view = editor.prosemirrorView
  if (!view) return kind === 'undo' ? editor.undo() : editor.redo()
  const done = (kind === 'undo' ? undo : redo)(view.state, view.dispatch, view)
  // Never focus here: Undo must not open the keyboard.
  return done
}
