import { createExtension } from '@blocknote/core'

/**
 * Text-tool boxes (owner batch 3): one box holds many lines. Enter in a
 * plain paragraph adds a new line inside the same block (a line break), not
 * a new block, so the whole box is one block that moves and resizes as a unit.
 * Lists, headings, quotes, code and any open "/" menu keep BlockNote's own
 * Enter. Pages made earlier (several blocks in a box) are not changed.
 */
export const boxLineKeys = createExtension({
  key: 'learning-notes-box-line-keys',
  keyboardShortcuts: {
    Enter: ({ editor }) => {
      if (document.querySelector('.bn-suggestion-menu, .bn-menu-dropdown'))
        return false
      const { block } = editor.getTextCursorPosition()
      if (block.type !== 'paragraph') return false
      const hard = editor.prosemirrorState.schema.nodes.hardBreak
      if (!hard) return false
      editor.transact((tr) => tr.replaceSelectionWith(hard.create()))
      return true
    },
  },
})
