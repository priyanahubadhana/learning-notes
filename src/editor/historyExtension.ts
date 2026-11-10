import { createExtension } from '@blocknote/core'
import { history } from 'prosemirror-history'
import { redo, undo } from '../core/historySteps'

/**
 * The text editor's own history, deeper (300 steps instead of 100) and with
 * a typing pause of 800 ms. It is registered under the key `yUndo`, which
 * `editor.undo()` / `editor.redo()` look up first, so the keyboard shortcuts
 * and every `editor.undo()` call go to the page's one history (the journal
 * in history/pageHistory.ts), not to this box alone. The journal runs the
 * box's own steps through `prosemirror-history` directly.
 */
const plugin = (() => {
  const plugin = history({ depth: 300, newGroupDelay: 800 })
  // The system's own Undo (shake to undo, the edit menu) arrives as an input
  // event that the plugin would handle by itself: send it to the journal.
  const events = (plugin.props.handleDOMEvents ?? {}) as Record<
    string,
    (view: unknown, e: InputEvent) => boolean
  >
  events.beforeinput = (_view, e) => {
    if (e.inputType !== 'historyUndo' && e.inputType !== 'historyRedo')
      return false
    e.preventDefault()
    void (e.inputType === 'historyUndo' ? undo() : redo())
    return true
  }
  ;(plugin.props as { handleDOMEvents: unknown }).handleDOMEvents = events
  return plugin
})()

export const pageHistoryExtension = createExtension({
  key: 'yUndo',
  prosemirrorPlugins: [plugin],
  undoCommand: () => {
    void undo()
    return true
  },
  redoCommand: () => {
    void redo()
    return true
  },
})
