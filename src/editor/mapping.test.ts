import { describe, expect, it } from 'vitest'
import { assignOrders } from '../core/order'
import type { Block, JsonObject } from '../core/types'
import { editorToDrafts, recordsToEditor, type EditorBlock } from './mapping'

const T = 1_700_000_000_000
const supported = new Set(['paragraph', 'heading', 'image', 'checkListItem'])
const text = (t: string) => [{ type: 'text', text: t, styles: {} }]

/** BlockNote-shaped test data (only the fields mapping reads). */
const editorDoc = [
  {
    id: 'h',
    type: 'heading',
    props: { level: 2, textColor: 'default' },
    content: text('Title'),
    children: [
      {
        id: 'todo',
        type: 'checkListItem',
        props: { checked: true },
        content: text('Nested to-do'),
        children: [],
      },
    ],
  },
  {
    id: 'img',
    type: 'image',
    props: { url: 'pic.png', caption: '' },
    children: [],
  },
] as unknown as EditorBlock[]

function record(
  id: string,
  type: string,
  content: JsonObject,
  parentId: string | null,
  order: string,
): Block {
  return {
    id,
    pageId: 'p1',
    parentId,
    type,
    content,
    order,
    createdAt: T,
    updatedAt: T,
    deletedAt: null,
  }
}

describe('editorToDrafts', () => {
  it('flattens nested blocks to parentId, keeping props and rich text', () => {
    expect(editorToDrafts(editorDoc)).toEqual([
      {
        id: 'h',
        parentId: null,
        type: 'heading',
        content: { level: 2, textColor: 'default', text: text('Title') },
      },
      {
        id: 'todo',
        parentId: 'h',
        type: 'checkListItem',
        content: { checked: true, text: text('Nested to-do') },
      },
      {
        id: 'img',
        parentId: null,
        type: 'image',
        content: { url: 'pic.png', caption: '' },
      },
    ])
  })
})

describe('recordsToEditor', () => {
  it('round-trips: editor → records → editor gives the same blocks', () => {
    const drafts = editorToDrafts(editorDoc)
    const keys = assignOrders(drafts.map(() => null))
    const records = drafts.map((d, i) =>
      record(d.id, d.type, d.content, d.parentId, keys[i]),
    )
    // Shuffled input must not matter: order comes from `order` keys.
    const rebuilt = recordsToEditor([...records].reverse(), supported)
    expect(editorToDrafts(rebuilt as unknown as EditorBlock[])).toEqual(drafts)
  })

  it('puts blocks with a missing parent at the top level', () => {
    const rebuilt = recordsToEditor(
      [record('orphan', 'paragraph', { text: [] }, 'gone', 'a0')],
      supported,
    )
    expect(rebuilt.map((b) => b.id)).toEqual(['orphan'])
  })

  it('leaves out unknown block types and everything inside them', () => {
    const rebuilt = recordsToEditor(
      [
        record('a', 'paragraph', { text: [] }, null, 'a0'),
        record('m', 'mystery', { data: 1 }, null, 'a1'),
        record('mChild', 'paragraph', { text: [] }, 'm', 'a0'),
      ],
      supported,
    )
    expect(rebuilt.map((b) => b.id)).toEqual(['a'])
  })
})
