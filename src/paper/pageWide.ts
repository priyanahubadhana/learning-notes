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

/**
 * Set by Ctrl+A's third step. ProseMirror or the browser can shrink the
 * browser selection back to one box a moment later (the race behind a flaky
 * Delete), so Cut/Delete trust this intent, not the live selection, until
 * the user clicks, types or moves the caret.
 */
let intent = false
let restores = 0

function whole(): Range | null {
  const editors = openEditors()
  if (editors.length < 2) return null
  const range = document.createRange()
  const last = editors[editors.length - 1].el
  range.setStart(editors[0].el, 0)
  range.setEnd(last, last.childNodes.length)
  return range
}

function onSelectionChange() {
  if (!intent || restores >= 5) return
  const s = window.getSelection()
  const r = whole()
  if (!s || !r) return
  const cur = s.rangeCount ? s.getRangeAt(0) : null
  if (
    cur &&
    cur.compareBoundaryPoints(Range.START_TO_START, r) === 0 &&
    cur.compareBoundaryPoints(Range.END_TO_END, r) === 0
  )
    return
  restores++
  s.setBaseAndExtent(
    r.startContainer,
    r.startOffset,
    r.endContainer,
    r.endOffset,
  )
}

function endIntent(e?: Event) {
  if (e instanceof KeyboardEvent) {
    const k = e.key.toLowerCase()
    const keep =
      ['control', 'meta', 'shift', 'alt', 'delete', 'backspace'].includes(k) ||
      ((e.ctrlKey || e.metaKey) && ['a', 'c', 'x'].includes(k))
    if (keep) return
  }
  intent = false
  document.removeEventListener('pointerdown', endIntent, true)
  document.removeEventListener('keydown', endIntent, true)
  document.removeEventListener('selectionchange', onSelectionChange)
}

/** Ctrl+A's third step selected the whole page. */
export function markPageWide(): void {
  endIntent()
  intent = true
  restores = 0
  document.addEventListener('pointerdown', endIntent, true)
  document.addEventListener('keydown', endIntent, true)
  document.addEventListener('selectionchange', onSelectionChange)
}

/** The page-wide selection, when it holds every box of the page entirely. */
export function pageWideRange(): Range | null {
  if (intent) {
    const r = whole()
    if (r) return r
  }
  const s = window.getSelection()
  if (!s || s.rangeCount === 0 || s.isCollapsed) return null
  const range = s.getRangeAt(0)
  const editors = openEditors()
  if (editors.length < 2) return null
  const all = editors.every(({ el }) => {
    try {
      return (
        range.comparePoint(el, 0) <= 0 &&
        range.comparePoint(el, el.childNodes.length) >= 0
      )
    } catch {
      return false
    }
  })
  return all ? range : null
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
  endIntent()
  window.getSelection()?.removeAllRanges()
  return () => {
    for (const { editor, blocks } of done) {
      editor.replaceBlocks(editor.document, blocks as never)
    }
  }
}
