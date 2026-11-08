/**
 * @vitest-environment jsdom
 */
import { BlockNoteEditor } from '@blocknote/core'
import { describe, expect, it } from 'vitest'
import { schema } from './schema'

describe('table row heights', () => {
  it('rowHeights is kept on the table block', () => {
    const cell = (text: string) => [{ type: 'text', text, styles: {} }]
    const editor = BlockNoteEditor.create({
      schema,
      initialContent: [
        {
          type: 'table',
          props: { rowHeights: '60,0' },
          content: {
            type: 'tableContent',
            rows: [{ cells: [cell('a')] }, { cells: [cell('b')] }],
          },
        },
      ] as never,
    })
    editor.mount(document.createElement('div'))
    const b = editor.document[0] as { props: Record<string, unknown> }
    expect(b.props.rowHeights).toBe('60,0')
  })
})

describe('table row heights update', () => {
  it('updateBlock with rowHeights returns', () => {
    const cell = (text: string) => [{ type: 'text', text, styles: {} }]
    const editor = BlockNoteEditor.create({
      schema,
      initialContent: [
        {
          type: 'table',
          content: {
            type: 'tableContent',
            rows: [{ cells: [cell('a')] }, { cells: [cell('b')] }],
          },
        },
      ] as never,
    })
    editor.mount(document.createElement('div'))
    const id = editor.document[0].id
    editor.updateBlock(id, { props: { rowHeights: '50' } } as never)
    const b = editor.document[0] as { props: Record<string, unknown> }
    expect(b.props.rowHeights).toBe('50')
  })
})
