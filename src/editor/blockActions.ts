import type { EditorBlock, EditorPartialBlock } from './mapping'
import type { AppSchema } from './schema'

type Editor = AppSchema['BlockNoteEditor']

/**
 * A copy of a block and everything nested in it, without ids, so the
 * editor gives each copied block a new id. A copied Card or blank is then
 * a new card with its own (fresh) schedule.
 */
export function copyWithoutIds(block: EditorBlock): EditorPartialBlock {
  const { type, props, content, children } = block
  return {
    type,
    props,
    content,
    children: children.map(copyWithoutIds),
  } as EditorPartialBlock
}

/** Inserts a copy right below the block and puts the cursor at its end. */
export function duplicateBlock(editor: Editor, block: EditorBlock): void {
  const [copy] = editor.insertBlocks([copyWithoutIds(block)], block, 'after')
  if (copy && Array.isArray(copy.content)) {
    editor.setTextCursorPosition(copy, 'end')
  }
  editor.focus() // the block menu had focus
}
