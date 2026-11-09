import { useEffect } from 'react'
import { setContextActive } from '../app/tools/context/contextStore'
import { useInk } from '../ink/inkRuntime'

/** What the watcher needs from the editor. */
interface Host {
  getTextCursorPosition: () => { block: { type: string } }
  onSelectionChange: (cb: () => void) => (() => void) | void
  prosemirrorState: { selection: { empty: boolean } }
}

/**
 * Tells the tool bar what is selected (video or embed, table, drawing, words)
 * so it can offer that strip. A selected picture is reported by
 * `PictureHandles`. Words only count while the selection is not empty.
 */
export function ContextWatcher({ editor }: { editor: Host }) {
  useEffect(() => {
    const update = () => {
      let type = ''
      try {
        type = editor.getTextCursorPosition().block.type
      } catch {
        // No block yet.
      }
      setContextActive('video', type === 'embed')
      setContextActive('table', type === 'table')
      setContextActive(
        'text',
        type !== 'embed' &&
          type !== 'image' &&
          !editor.prosemirrorState.selection.empty,
      )
    }
    update()
    const off = editor.onSelectionChange(update)
    return () => {
      if (typeof off === 'function') off()
      for (const k of ['video', 'table', 'text'] as const)
        setContextActive(k, false)
    }
  }, [editor])

  // A drawing selection (Lasso on ink).
  const ink = useInk()
  const inkCount =
    ink && ink.editor === editor ? ink.controller.selectionCount() : 0
  useEffect(() => {
    setContextActive('ink', inkCount > 0)
    return () => setContextActive('ink', false)
  }, [inkCount])
  return null
}
