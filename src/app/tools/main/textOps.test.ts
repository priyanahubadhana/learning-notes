/**
 * @vitest-environment jsdom
 */
import { BlockNoteEditor } from '@blocknote/core'
import { describe, expect, it } from 'vitest'
import { schema } from '../../../editor/schema'
import {
  alignOf,
  listOf,
  setAlign,
  setList,
  setStyle,
  styleOf,
} from './textOps'

function setup() {
  const editor = BlockNoteEditor.create({
    schema,
    initialContent: [{ id: 'a', type: 'paragraph', content: 'hello world' }],
  })
  editor.mount(document.createElement('div'))
  editor.setTextCursorPosition('a', 'end')
  return editor
}
const block = (editor: ReturnType<typeof setup>) =>
  editor.getTextCursorPosition().block as unknown as {
    type: string
    props: Record<string, unknown>
  }

describe('Aa pill actions', () => {
  it('sets Title, Heading 1-3 and Body (Title is a centred big heading)', () => {
    const editor = setup()
    setStyle(editor, 'h2')
    expect(styleOf(block(editor))).toBe('h2')
    setStyle(editor, 'title')
    expect(styleOf(block(editor))).toBe('title')
    setStyle(editor, 'h1')
    expect(styleOf(block(editor))).toBe('h1')
    setStyle(editor, 'body')
    expect(styleOf(block(editor))).toBe('body')
  })

  it('sets a list kind; the same kind again turns it off', () => {
    const editor = setup()
    setList(editor, 'checklist')
    expect(listOf(block(editor).type)).toBe('checklist')
    setList(editor, 'numbers')
    expect(listOf(block(editor).type)).toBe('numbers')
    setList(editor, 'numbers')
    expect(listOf(block(editor).type)).toBeNull()
  })

  it('sets the alignment', () => {
    const editor = setup()
    expect(alignOf(block(editor))).toBe('left')
    setAlign(editor, 'justify')
    expect(alignOf(block(editor))).toBe('justify')
    setAlign(editor, 'center')
    expect(alignOf(block(editor))).toBe('center')
  })
})
