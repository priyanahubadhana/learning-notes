/**
 * @vitest-environment jsdom
 */
import { BlockNoteEditor } from '@blocknote/core'
import { describe, expect, it } from 'vitest'
import { editorToDrafts, inlineTagIds, toPlainText } from './mapping'
import { schema } from './schema'
import { insertTag, tagMenuShouldOpen } from './tagActions'

/** A real editor with one block of `text`, the cursor at its end. */
function setup(text: string, type: 'paragraph' | 'codeBlock' = 'paragraph') {
  const editor = BlockNoteEditor.create({
    schema,
    initialContent: [{ id: 'b', type, content: text }],
  })
  editor.mount(document.createElement('div'))
  editor.setTextCursorPosition('b', 'end')
  return editor
}

const opens = (text: string, type?: 'paragraph' | 'codeBlock') =>
  tagMenuShouldOpen(setup(text, type).prosemirrorState.tr)

describe('# tag menu', () => {
  it('opens at a line start or after a space, never inside a word or code', () => {
    expect(opens('')).toBe(true)
    expect(opens('S1 is loud ')).toBe(true)
    expect(opens('C')).toBe(false) // "C#" stays text
    expect(opens('x ', 'codeBlock')).toBe(false)
  })

  it('picking inserts a tag chip and a space; the tag adds no text', () => {
    const editor = setup('Mitral ')
    insertTag(editor, { tagId: 't1', label: 'hy' })
    const [draft] = editorToDrafts(editor.document)
    expect(inlineTagIds(draft)).toEqual(['t1'])
    expect(toPlainText(draft.content)).toBe('Mitral  ')
  })
})
