import { useEffect, useReducer } from 'react'
import type { Editor } from '../../../editor/barActions'

/**
 * Draws again when the page or the selection changes, so a pill or card that
 * reads the cursor's block (its style, list, alignment) never shows stale
 * answers.
 */
export function useEditorRedraw(editor: Editor | null): void {
  const [, redraw] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    if (!editor) return
    const off1 = editor.onChange(redraw)
    const off2 = editor.onSelectionChange(redraw)
    // A change between the first draw and now was not heard (the listeners
    // come a task after the draw; a lazy part that mounts while the person
    // selects, TB-33 run 46122961075): draw once more with what is there now.
    redraw()
    return () => {
      off1?.()
      off2?.()
    }
  }, [editor])
}
