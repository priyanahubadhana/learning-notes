import {
  createExtension,
  type BlockNoteEditor,
  type BlockSchema,
  type InlineContentSchema,
  type StyleSchema,
} from '@blocknote/core'

/**
 * Keyboard behaviour inside code blocks (overrides BlockNote's defaults):
 * - Enter on an empty last line: leave the code block (blank line removed).
 * - Ctrl+Enter (Cmd+Enter on Mac): leave the code block from anywhere.
 * - Shift+Enter: a new line, like Enter. Never changes the block type.
 * Leaving inserts an empty paragraph below and moves the cursor there.
 */

type Editor = BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>

const inCodeBlock = (editor: Editor) =>
  editor.getTextCursorPosition().block.type === 'codeBlock'

function leaveCodeBlock(editor: Editor): void {
  const { block } = editor.getTextCursorPosition()
  const [paragraph] = editor.insertBlocks(
    [{ type: 'paragraph' }],
    block,
    'after',
  )
  editor.setTextCursorPosition(paragraph, 'start')
}

export const codeBlockKeys = createExtension({
  key: 'learning-notes-code-block-keys',
  // Run before BlockNote's own code-block shortcuts so ours take effect.
  runsBefore: ['code-block-keyboard-shortcuts'],
  keyboardShortcuts: {
    Enter: ({ editor }) => {
      if (!inCodeBlock(editor)) return false
      const { $from, empty } = editor.prosemirrorState.selection
      const text = $from.parent.textContent
      const onEmptyLastLine =
        empty && $from.parentOffset === text.length && text.endsWith('\n')
      if (!onEmptyLastLine) return false // BlockNote adds a new line

      editor.transact((tr) => tr.delete($from.pos - 1, $from.pos))
      leaveCodeBlock(editor)
      return true
    },
    'Mod-Enter': ({ editor }) => {
      if (!inCodeBlock(editor)) return false
      leaveCodeBlock(editor)
      return true
    },
    'Shift-Enter': ({ editor }) => {
      if (!inCodeBlock(editor)) return false
      editor.transact((tr) => tr.insertText('\n'))
      return true
    },
  },
})
