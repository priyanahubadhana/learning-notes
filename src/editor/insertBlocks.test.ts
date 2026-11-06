/**
 * @vitest-environment jsdom
 */
import { BlockNoteEditor } from '@blocknote/core'
import { describe, expect, it } from 'vitest'
import { editorBlockTypes, schema } from './schema'
import {
  editorToDrafts,
  recordsToEditor,
  type EditorBlock,
  type EditorPartialBlock,
} from './mapping'
import { blockText } from '../search/searchText'
import type { Block } from '../core/types'
import { assignOrders } from '../core/order'

const cell = (text: string) => [{ type: 'text', text, styles: {} }]

/** Editor blocks -> records -> editor blocks -> drafts (what a reload does). */
function reload(initial: EditorPartialBlock[]) {
  const editor = BlockNoteEditor.create({ schema, initialContent: initial })
  editor.mount(document.createElement('div'))
  const drafts = editorToDrafts(editor.document as unknown as EditorBlock[])
  const keys = assignOrders(drafts.map(() => null))
  const records: Block[] = drafts.map((d, i) => ({
    ...d,
    pageId: 'p',
    order: keys[i],
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
  }))
  const again = BlockNoteEditor.create({
    schema,
    initialContent: recordsToEditor(records, editorBlockTypes),
  })
  again.mount(document.createElement('div'))
  return {
    drafts,
    after: editorToDrafts(again.document as unknown as EditorBlock[]),
    records,
  }
}

describe('Table, Toggle list and File blocks (G2)', () => {
  it('are in the schema', () => {
    for (const type of ['table', 'toggleListItem', 'file']) {
      expect(editorBlockTypes.has(type), type).toBe(true)
    }
  })

  it('round-trip through our records', () => {
    const { drafts, after, records } = reload([
      {
        type: 'table',
        content: {
          type: 'tableContent',
          rows: [
            { cells: [cell('Term'), cell('Meaning')] },
            { cells: [cell('ATP'), cell('Energy')] },
          ],
        },
      },
      {
        type: 'toggleListItem',
        content: 'Why?',
        children: [{ type: 'paragraph', content: 'Because.' }],
      },
      {
        type: 'file',
        props: {
          url: 'lnfile:0a1b2c3d-0000-4000-8000-123456789abc',
          name: 'a.pdf',
          size: 12,
        },
      },
    ] as unknown as EditorPartialBlock[])
    expect(after).toEqual(drafts)
    expect(drafts.map((d) => d.type)).toEqual([
      'table',
      'toggleListItem',
      'paragraph',
      'file',
    ])
    expect(drafts[2].parentId).toBe(drafts[1].id)
    // Search reads table cells and the toggle's words.
    expect(blockText(records[0].content)).toContain('Energy')
    expect(blockText(records[1].content)).toContain('Why?')
  })
})
