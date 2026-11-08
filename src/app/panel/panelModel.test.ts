import { describe, expect, it } from 'vitest'
import type { Block } from '../../core/types'
import {
  outlineFromBlocks,
  outlineItems,
  previewLines,
  visibleOutline,
} from './panelModel'

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

describe('outline view options', () => {
  const b = (
    id: string,
    type: string,
    order: string,
    text: string,
    parentId: string | null,
    level?: number,
  ) => block(id, type, order, text, parentId, level ? { level } : {})
  const blocks = [
    b('a', 'heading', 'a', 'One', null, 1),
    b('b', 'heading', 'b', 'One A', null, 2),
    b('c', 'heading', 'c', 'One B', null, 2),
    b('d', 'heading', 'd', 'Deep', null, 3),
    b('e', 'toggleListItem', 'e', 'Fold me', null),
    b('f', 'toggleListItem', 'f', 'Inner', 'e'),
    b('g', 'heading', 'g', 'Two', null, 1),
  ]
  it('limits headings by depth and leaves toggles out by default', () => {
    expect(
      outlineItems(blocks, { depth: 1, toggles: false, numbered: false }).map(
        (i) => i.text,
      ),
    ).toEqual(['One', 'Two'])
    expect(
      outlineItems(blocks, { depth: 2, toggles: false, numbered: false }).map(
        (i) => i.text,
      ),
    ).toEqual(['One', 'One A', 'One B', 'Two'])
    expect(outlineItems(blocks).map((i) => i.text)).toEqual([
      'One',
      'One A',
      'One B',
      'Deep',
      'Two',
    ])
  })
  it('numbers chapters 1, 1.1, 1.2 and restarts under a new chapter', () => {
    const items = outlineItems(blocks, {
      depth: 3,
      toggles: false,
      numbered: true,
    })
    expect(items.map((i) => i.number)).toEqual([
      '1',
      '1.1',
      '1.2',
      '1.2.1',
      '2',
    ])
  })
  it('shows toggle summaries one level under the heading above, nested ones deeper', () => {
    const items = outlineItems(blocks, {
      depth: 3,
      toggles: true,
      numbered: false,
    })
    const fold = items.find((i) => i.text === 'Fold me')!
    expect(fold).toMatchObject({ kind: 'toggle', level: 4 })
    expect(items.find((i) => i.text === 'Inner')!.level).toBe(5)
  })
  it('folds a line and hides what is deeper under it', () => {
    const items = outlineItems(blocks)
    expect(visibleOutline(items, new Set(['b'])).map((i) => i.text)).toEqual([
      'One',
      'One A',
      'One B',
      'Deep',
      'Two',
    ])
    expect(visibleOutline(items, new Set(['c'])).map((i) => i.text)).toEqual([
      'One',
      'One A',
      'One B',
      'Two',
    ])
    expect(visibleOutline(items, new Set(['a'])).map((i) => i.text)).toEqual([
      'One',
      'Two',
    ])
  })
})
