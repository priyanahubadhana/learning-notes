import { allBoxEditors } from './activeBox'
import type { Editor } from '../editor/barActions'

/**
 * Cut and Delete for a page-wide selection (Ctrl+A, third step): the browser
 * selection runs from the first box's start to the last box's end, so no
 * single editor owns it. Copy already works; these two clear every box.
 */

/** The editors of the open page, in the order they are on screen. */
function openEditors(): { editor: Editor; el: HTMLElement }[] {
  return allBoxEditors()
    .map((editor) => ({
      editor,
      el: editor.domElement as HTMLElement | undefined,
    }))
    .filter(
      (x): x is { editor: Editor; el: HTMLElement } => !!x.el?.isConnected,
    )
    .sort((a, b) =>
      a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1,
    )
}

/** The page-wide selection, when it holds every box of the page entirely. */
export function pageWideRange(): Range | null {
  const s = window.getSelection()
  if (!s || s.rangeCount === 0 || s.isCollapsed) return null
  const range = s.getRangeAt(0)
  const editors = openEditors()
  if (editors.length < 2) return null
  const whole = editors.every(({ el }) => {
    try {
      return (
        range.comparePoint(el, 0) <= 0 &&
        range.comparePoint(el, el.childNodes.length) >= 0
      )
    } catch {
      return false
    }
  })
  return whole ? range : null
}

/** The selection as plain text and HTML, for the clipboard. */
export function pageWideClip(range: Range): { text: string; html: string } {
  const box = document.createElement('div')
  box.append(range.cloneContents())
  return { text: range.toString(), html: box.innerHTML }
}

/**
 * Empties every box of the page (each keeps one empty line). Returns a
 * function that puts everything back (for the Undo in the toast).
 */
export function clearPageWide(): () => void {
  const done: { editor: Editor; blocks: Editor['document'] }[] = []
  for (const { editor } of openEditors()) {
    done.push({ editor, blocks: editor.document })
    editor.replaceBlocks(editor.document, [{ type: 'paragraph' }] as never)
  }
  window.getSelection()?.removeAllRanges()
  return () => {
    for (const { editor, blocks } of done) {
      editor.replaceBlocks(editor.document, blocks as never)
    }
  }
}
