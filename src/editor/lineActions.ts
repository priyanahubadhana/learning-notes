import type { EditorBlock } from './mapping'
import type { AppSchema } from './schema'

/**
 * Lines without a keyboard: "New line" on the formatting bar and the tap
 * area below the last block. Both only add an empty paragraph and put the
 * cursor in it; the editor's normal change tracking saves it.
 */

type Editor = AppSchema['BlockNoteEditor']

/** A paragraph with no text at all. */
export const isEmptyParagraph = (
  block: Pick<EditorBlock, 'type' | 'content'>,
): boolean =>
  block.type === 'paragraph' &&
  (!Array.isArray(block.content) ||
    block.content.every((c) => c.type === 'text' && c.text === ''))

/** Adds an empty paragraph after the block with the cursor and moves there. */
export function addLineAfterCursor(editor: Editor): void {
  const current = editor.getTextCursorPosition().block
  const [line] = editor.insertBlocks([{ type: 'paragraph' }], current, 'after')
  editor.setTextCursorPosition(line, 'start')
  editor.focus()
  keepInView(editor, line.id)
}

/**
 * Scrolls the new line into view without moving the bar: a bar button that
 * is tapped again and again must stay where it is, and the cursor stays in
 * the new line.
 */
function keepInView(editor: Editor, blockId: string): void {
  requestAnimationFrame(() => {
    const el = editor.domElement?.querySelector(`[data-id="${blockId}"]`)
    el?.scrollIntoView?.({ block: 'nearest' })
  })
}

/**
 * Puts the cursor on an empty last line: the last block itself when it is
 * already an empty paragraph (never a second empty one), else a new one.
 */
export function focusEndLine(editor: Editor): void {
  const last = editor.document[editor.document.length - 1]
  if (!last) return // BlockNote always keeps one block; nothing to do
  if (isEmptyParagraph(last)) {
    editor.setTextCursorPosition(last, 'start')
  } else {
    const [line] = editor.insertBlocks([{ type: 'paragraph' }], last, 'after')
    editor.setTextCursorPosition(line, 'start')
  }
  editor.focus()
}

/** Collapses a selection to its end and leaves the editor (hides the keyboard). */
export function clearSelection(editor: Editor): void {
  const doc = editor.domElement?.ownerDocument
  const selection = doc?.getSelection()
  if (selection && !selection.isCollapsed) selection.collapseToEnd()
  const active = doc?.activeElement
  if (active instanceof HTMLElement && editor.domElement?.contains(active)) {
    active.blur()
  }
}
