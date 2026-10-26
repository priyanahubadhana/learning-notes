/**
 * @vitest-environment jsdom
 */
import { BlockNoteEditor } from '@blocknote/core'
import { describe, expect, it } from 'vitest'
import { insertNoteLink, linkTriggerAt } from './linkActions'
import { editorToDrafts, linkTargets, toPlainText } from './mapping'
import { schema } from './schema'

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

const link = { pageId: 'p1', blockId: '', label: 'Heart sounds' }

describe('[[ link trigger', () => {
  it('finds "[[" right before the cursor', () => {
    expect(linkTriggerAt(setup('See [['))).not.toBeNull()
    expect(linkTriggerAt(setup('See ['))).toBeNull()
    expect(linkTriggerAt(setup('See [[x'))).toBeNull() // typed on: no picker
    expect(linkTriggerAt(setup('a[[', 'codeBlock'))).toBeNull()
  })

  it('picking replaces "[[" with the link and a space', () => {
    const editor = setup('See [[')
    insertNoteLink(editor, link, linkTriggerAt(editor))
    const [draft] = editorToDrafts(editor.document)
    expect(toPlainText(draft.content)).toBe('See Heart sounds ')
    expect(linkTargets(draft)).toEqual([{ pageId: 'p1', blockId: '' }])
  })

  it('"/ Link to page" inserts at the cursor without removing text', () => {
    const editor = setup('Text [[')
    insertNoteLink(editor, { ...link, blockId: 'h1' }, null)
    const [draft] = editorToDrafts(editor.document)
    expect(toPlainText(draft.content)).toBe('Text [[Heart sounds ')
    expect(linkTargets(draft)).toEqual([{ pageId: 'p1', blockId: 'h1' }])
  })
})
