import type { Editor } from '../../../editor/barActions'

type Block = ReturnType<Editor['getTextCursorPosition']>['block']

/** The selection as blocks (several), the cursor block, or null (no selection). */
export function selected(
  editor: Editor,
): { blocks: Block[]; text: boolean } | null {
  const range = editor.getSelection()
  const text = editor.getSelectedText().length > 0
  // Several blocks: the whole blocks.
  if (range && range.blocks.length > 1) {
    return { blocks: range.blocks as Block[], text: false }
  }
  // Words inside one block: just the words.
  if (text)
    return { blocks: [editor.getTextCursorPosition().block], text: true }
  // A picture (or another block with no text): the block.
  if (range) return { blocks: range.blocks as Block[], text: false }
  return null
}

/** A copy of a block without ids, so the editor gives the copy its own. */
type Plain = {
  type: string
  props: unknown
  content: unknown
  children: Plain[]
}
export const strip = (b: Block): Plain => ({
  type: b.type,
  props: b.props,
  content: b.content,
  children: (b.children as Block[]).map(strip),
})
