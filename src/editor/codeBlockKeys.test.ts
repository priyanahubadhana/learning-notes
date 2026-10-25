/**
 * @vitest-environment jsdom
 */
import { BlockNoteEditor } from '@blocknote/core'
import { describe, expect, it } from 'vitest'
import { codeBlockKeys } from './codeBlockKeys'
import { schema } from './schema'

/** A real editor with one code block and the cursor at `pos`. */
function setup(code: string, pos: 'start' | 'end' = 'end') {
  const editor = BlockNoteEditor.create({
    schema,
    extensions: [codeBlockKeys],
    initialContent: [{ id: 'code', type: 'codeBlock', content: code }],
  })
  editor.mount(document.createElement('div'))
  editor.setTextCursorPosition('code', pos)

  const press = (init: KeyboardEventInit) => {
    const view = editor.prosemirrorView
    const event = new KeyboardEvent('keydown', init)
    view.someProp('handleKeyDown', (f) => f(view, event))
  }
  const summary = () =>
    editor.document.map((b) => {
      const text = Array.isArray(b.content)
        ? b.content.map((c) => ('text' in c ? c.text : '')).join('')
        : ''
      return `${b.type}:${text}`
    })
  const cursorType = () => editor.getTextCursorPosition().block.type
  return { press, summary, cursorType }
}

describe('code block keys', () => {
  it('Enter adds a new line inside code', () => {
    const { press, summary } = setup('abc')
    press({ key: 'Enter' })
    expect(summary()).toEqual(['codeBlock:abc\n'])
  })

  it('Enter on an empty last line leaves the code block', () => {
    const { press, summary, cursorType } = setup('abc\n')
    press({ key: 'Enter' })
    expect(summary()).toEqual(['codeBlock:abc', 'paragraph:'])
    expect(cursorType()).toBe('paragraph')
  })

  it('Ctrl+Enter leaves the code block from anywhere', () => {
    const { press, summary, cursorType } = setup('line 1\nline 2', 'start')
    press({ key: 'Enter', ctrlKey: true })
    expect(summary()).toEqual(['codeBlock:line 1\nline 2', 'paragraph:'])
    expect(cursorType()).toBe('paragraph')
  })

  it('Shift+Enter adds a new line and never changes the block type', () => {
    const { press, summary } = setup('# not a heading')
    press({ key: 'Enter', shiftKey: true })
    expect(summary()).toEqual(['codeBlock:# not a heading\n'])
  })
})
