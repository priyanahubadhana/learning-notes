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
    return () => {
      off1?.()
      off2?.()
    }
  }, [editor])
}
