import { describe, expect, it } from 'vitest'
import type { Block } from '../../core/types'
import { outlineFromBlocks, previewLines } from './panelModel'

const block = (
  id: string,
  type: string,
  order: string,
  text: string,
  parentId: string | null = null,
  extra: Record<string, unknown> = {},
): Block =>
  ({
    id,
    pageId: 'p',
    parentId,
    type,
    order,
    deletedAt: null,
    content: { text: [{ type: 'text', text }], ...extra },
  }) as unknown as Block

describe('left panel model', () => {
  const blocks = [
    block('c', 'paragraph', 'c', 'Last line'),
    block('a', 'heading', 'a', 'Intro', null, { level: 1 }),
    block('b', 'paragraph', 'b', 'Body  text\nhere'),
    block('d', 'heading', 'd', 'Deep', 'c', { level: 2 }),
    block('e', 'heading', 'e', '', null, { level: 1 }),
  ]

  it('lists the headings in reading order with their levels', () => {
    expect(outlineFromBlocks(blocks)).toEqual([
      { id: 'a', text: 'Intro', level: 1 },
      { id: 'd', text: 'Deep', level: 2 },
    ])
  })

  it('previews the first lines of text, not the headings', () => {
    expect(previewLines(blocks, 2)).toEqual(['Body text here', 'Last line'])
  })

  it('ignores deleted blocks', () => {
    const gone = { ...blocks[1], deletedAt: 5 } as Block
    expect(outlineFromBlocks([gone])).toEqual([])
  })
})
