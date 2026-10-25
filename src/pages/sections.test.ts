import { describe, expect, it } from 'vitest'
import type { Block } from '../core/types'
import { plainText } from '../editor/mapping'
import { pageSections } from './sections'

let n = 0
const block = (
  type: string,
  text: string,
  extra: { level?: number; parentId?: string } = {},
): Block => ({
  id: `b${++n}`,
  pageId: 'p',
  parentId: extra.parentId ?? null,
  type,
  content: {
    text: plainText(text),
    ...(extra.level && { level: extra.level }),
  },
  order: 'a0',
  createdAt: 0,
  updatedAt: 0,
  deletedAt: null,
})

describe('pageSections', () => {
  it('uses the largest top-level headings, needs at least three', () => {
    const blocks = [
      block('heading', 'Notes', { level: 2 }),
      block('heading', 'Detail', { level: 3 }),
      block('paragraph', 'text'),
      block('heading', 'Summary', { level: 2 }),
      block('heading', 'Cards', { level: 2 }),
    ]
    expect(pageSections(blocks).map((s) => s.title)).toEqual([
      'Notes',
      'Summary',
      'Cards',
    ])
    expect(pageSections(blocks.slice(0, 4))).toEqual([]) // only two
  })

  it('skips empty and nested headings', () => {
    const parent = block('bulletListItem', 'item')
    const blocks = [
      block('heading', 'A', { level: 1 }),
      block('heading', '  ', { level: 1 }),
      parent,
      block('heading', 'Nested', { level: 1, parentId: parent.id }),
      block('heading', 'B', { level: 1 }),
    ]
    expect(pageSections(blocks)).toEqual([])
    expect(pageSections([])).toEqual([])
  })
})
