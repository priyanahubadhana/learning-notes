import { PRIORITY, onRouted } from '../app/input/eventRouter'
import type { AppSchema } from './schema'

type Editor = AppSchema['BlockNoteEditor']

/**
 * Shift+Enter on an iPad (and on the iPad stand-in of the tests).
 *
 * ProseMirror never runs its key bindings for an Enter keydown there: it
 * waits for the browser's own change and, 200 ms later, runs a plain Enter
 * unless the change looked like a new paragraph. The browser's own Shift+Enter
 * is a line break, not a paragraph, so a hard break came in AND the plain
 * Enter ran after it: an extra empty block with the caret (C33, CI run
 * 45578586071, traced with a transaction log).
 *
 * So Shift+Enter goes to the editor's key bindings first, as on a desktop
 * (the hard break of a text block, or what the block asks for); when one
 * takes it, the browser and ProseMirror's own handler never see the key.
 */
export function watchShiftEnter(editor: Editor): () => void {
  const dom = editor.domElement
  if (!dom) return () => {}
  return onRouted(
    'keydown',
    (e) => {
      if (e.key !== 'Enter' || !e.shiftKey) return
      if (e.ctrlKey || e.altKey || e.metaKey || e.isComposing) return
      const view = editor.prosemirrorView
      if (!view) return
      if (!view.someProp('handleKeyDown', (f) => f(view, e))) return
      e.preventDefault()
      e.stopImmediatePropagation()
      return true
    },
    { scope: dom, priority: PRIORITY.editor, name: 'editor-shift-enter' },
  )
}
