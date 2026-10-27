import { MARK_STYLE, type MarkLabel } from '../revise/reviseMarks'
import type { AppSchema } from './schema'

type Editor = AppSchema['BlockNoteEditor']

/**
 * Marks the selected words with a Revise label; with the same label
 * already on them, removes it (another label replaces the old one).
 */
export function toggleMark(editor: Editor, label: MarkLabel): void {
  const active = editor.getActiveStyles() as Record<string, unknown>
  if (active[MARK_STYLE] === label) {
    editor.removeStyles({ [MARK_STYLE]: label } as never)
  } else {
    editor.addStyles({ [MARK_STYLE]: label } as never)
  }
}
