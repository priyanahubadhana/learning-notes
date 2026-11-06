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

/**
 * The extras of ↵ New line (press and hold): a heading, a checklist line or a
 * divider. An empty line becomes it; otherwise a new one is added after the
 * cursor's block. After a divider the cursor waits on a fresh line.
 */
export function addExtraLine(
  editor: Editor,
  kind: 'heading' | 'checklist' | 'divider',
): void {
  const current = editor.getTextCursorPosition().block
  const empty = isEmptyParagraph(current)
  const spec =
    kind === 'heading'
      ? { type: 'heading', props: { level: 2 } }
      : kind === 'checklist'
        ? { type: 'checkListItem' }
        : { type: 'divider' }
  let made: { id: string }
  if (empty) {
    editor.updateBlock(current, spec as never)
    made = current
  } else {
    ;[made] = editor.insertBlocks([spec as never], current, 'after')
  }
  if (kind === 'divider') {
    const [line] = editor.insertBlocks(
      [{ type: 'paragraph' }],
      made as never,
      'after',
    )
    editor.setTextCursorPosition(line, 'start')
    keepInView(editor, line.id)
  } else {
    editor.setTextCursorPosition(made as never, 'start')
    keepInView(editor, made.id)
  }
  editor.focus()
}

/**
 * ⌫ without a keyboard (Pencil users): deletes the selection, else the
 * character or word before the caret, else (at the start of a block) does
 * what the Backspace key does there (join with the block above). The caret
 * is the editor's own selection, so it works while the page is not focused.
 * Returns false when there was nothing to delete.
 */
export function deleteBackward(
  editor: Editor,
  unit: 'char' | 'word' = 'char',
): boolean {
  const view = editor.prosemirrorView
  if (!view) return false
  const { state } = view
  const sel = state.selection
  if (!sel.empty) {
    view.dispatch(state.tr.deleteSelection().scrollIntoView())
    return true
  }
  const $pos = sel.$from
  if ($pos.parent.inlineContent && $pos.parentOffset > 0) {
    const before = $pos.parent.textBetween(0, $pos.parentOffset, undefined, '￼')
    const keep = keepLength(before, unit)
    const from = $pos.pos - (before.length - keep)
    if (from < $pos.pos) {
      view.dispatch(state.tr.delete(from, $pos.pos))
      return true
    }
  }
  // Start of a block: the key's own behaviour (join, lift, remove a picture).
  const event = new KeyboardEvent('keydown', {
    key: 'Backspace',
    code: 'Backspace',
    keyCode: 8,
    bubbles: true,
    cancelable: true,
  })
  return !!view.someProp('handleKeyDown', (f) => f(view, event))
}

/** How much of `before` stays after deleting its last character or word. */
export function keepLength(before: string, unit: 'char' | 'word'): number {
  if (before.length === 0) return 0
  if (unit === 'char') {
    const chars = Array.from(before)
    chars.pop()
    return chars.join('').length
  }
  let end = before.length
  while (end > 0 && /\s/.test(before[end - 1])) end--
  while (end > 0 && !/\s/.test(before[end - 1])) end--
  return end
}
