/**
 * @vitest-environment jsdom
 */
import { BlockNoteEditor } from '@blocknote/core'
import { describe, expect, it } from 'vitest'
import {
  addLineAfterCursor,
  focusEndLine,
  isEmptyParagraph,
} from './lineActions'
import { schema } from './schema'

function setup(
  blocks: { id: string; type: 'paragraph' | 'heading'; content: string }[],
) {
  const editor = BlockNoteEditor.create({ schema, initialContent: blocks })
  editor.mount(document.createElement('div'))
  return editor
}

describe('New line', () => {
  it('adds an empty paragraph after the current block and moves there', () => {
    const editor = setup([
      { id: 'a', type: 'paragraph', content: 'first' },
      { id: 'b', type: 'paragraph', content: 'second' },
    ])
    editor.setTextCursorPosition('a', 'end')
    addLineAfterCursor(editor)
    expect(editor.document).toHaveLength(3)
    const added = editor.document[1]
    expect(added.id).not.toBe('b')
    expect(isEmptyParagraph(added)).toBe(true)
    expect(editor.getTextCursorPosition().block.id).toBe(added.id)
  })

  it('works after a heading too', () => {
    const editor = setup([{ id: 'h', type: 'heading', content: 'Title' }])
    editor.setTextCursorPosition('h', 'end')
    addLineAfterCursor(editor)
    expect(editor.document).toHaveLength(2)
    expect(editor.document[1].type).toBe('paragraph')
  })
})

describe('Tap below the last block', () => {
  it('adds an empty last paragraph when the last block has text', () => {
    const editor = setup([{ id: 'a', type: 'paragraph', content: 'text' }])
    focusEndLine(editor)
    expect(editor.document).toHaveLength(2)
    expect(isEmptyParagraph(editor.document[1])).toBe(true)
    expect(editor.getTextCursorPosition().block.id).toBe(editor.document[1].id)
  })

  it('does not add a second empty paragraph', () => {
    const editor = setup([
      { id: 'a', type: 'paragraph', content: 'text' },
      { id: 'b', type: 'paragraph', content: '' },
    ])
    focusEndLine(editor)
    focusEndLine(editor)
    expect(editor.document).toHaveLength(2)
    expect(editor.getTextCursorPosition().block.id).toBe('b')
  })

  it('adds a paragraph after a heading', () => {
    const editor = setup([{ id: 'h', type: 'heading', content: 'Title' }])
    focusEndLine(editor)
    expect(editor.document.map((b) => b.type)).toEqual(['heading', 'paragraph'])
  })
})
