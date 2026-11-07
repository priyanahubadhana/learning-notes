import { useEffect, useReducer } from 'react'
import type { Editor } from './barActions'

/**
 * The text styles at the cursor (bold, colours, ...), drawn again when the
 * page or the selection changes. Our own copy of BlockNote's hook so the bars
 * (which load on the first screen) do not pull the whole editor library into
 * the first download.
 */
export function useActiveStyles(editor: Editor): Record<string, unknown> {
  const [, redraw] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    const off1 = editor.onChange(redraw)
    const off2 = editor.onSelectionChange(redraw)
    return () => {
      off1?.()
      off2?.()
    }
  }, [editor])
  return editor.getActiveStyles() as Record<string, unknown>
}
