import { redo, undo } from 'prosemirror-history'
import type { AppSchema } from './schema'

type Editor = AppSchema['BlockNoteEditor']

/**
 * Undo or Redo from the bar. Runs the history command on the editor's view
 * itself, so it works whether or not the editor has focus (the bar button
 * took it), then puts the cursor back in the page. Returns false when there
 * was nothing to undo or redo.
 */
export function runHistory(editor: Editor, kind: 'undo' | 'redo'): boolean {
  const view = editor.prosemirrorView
  if (!view) return kind === 'undo' ? editor.undo() : editor.redo()
  const done = (kind === 'undo' ? undo : redo)(view.state, view.dispatch, view)
  view.focus()
  return done
}
