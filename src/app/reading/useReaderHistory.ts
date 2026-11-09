import { useEffect, useState } from 'react'
import { redoDepth, undoDepth } from 'prosemirror-history'
import { inkFor } from '../../ink/inkRuntime'
import { currentRunner } from '../tools/toolRuntime'

/**
 * Whether the reader bar's Undo and Redo have anything to do: the page's
 * history (highlights) and the drawings' history share one stack.
 */
export function useReaderHistory(): { canUndo: boolean; canRedo: boolean } {
  const read = () => {
    const editor = currentRunner().editor
    const state = editor?.prosemirrorView?.state
    if (!editor || !state) return { canUndo: false, canRedo: false }
    const ink = inkFor(editor as never)?.history
    return {
      canUndo: undoDepth(state) > 0 || !!ink?.canUndo,
      canRedo: redoDepth(state) > 0 || !!ink?.canRedo,
    }
  }
  const [value, setValue] = useState(read)
  useEffect(() => {
    const update = () => {
      const next = read()
      setValue((old) =>
        old.canUndo === next.canUndo && old.canRedo === next.canRedo
          ? old
          : next,
      )
    }
    update()
    const timer = window.setInterval(update, 400)
    return () => window.clearInterval(timer)
  }, [])
  return value
}
