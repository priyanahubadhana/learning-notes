import { describe, expect, it } from 'vitest'
import type { Block } from '../../../core/types'
import {
  effectiveScope,
  filterResources,
  resourceOfBlock,
  resourcesOfBlocks,
  scopesOn,
} from './resourcesModel'

const block = (
  id: string,
  type: string,
  content: Block['content'],
  deletedAt: number | null = null,
): Block => ({
  id,
  pageId: 'p',
  parentId: null,
  type,
  content,
  order: 'a',
  createdAt: 1,
  updatedAt: 1,
  deletedAt,
})

describe('resources from blocks', () => {
  it('reads pictures, links, files, references and notes', () => {
    const list = resourcesOfBlocks([
      block('1', 'image', { url: 'image:1', caption: 'A cell' }),
      block('2', 'embed', { url: 'https://x.org/a', caption: '' }),
      block('3', 'file', { url: 'f', name: 'sheet.pdf' }),
      block('4', 'quote', { text: [{ type: 'text', text: 'Smith (2020)' }] }),
      block('5', 'callout', { text: [{ type: 'text', text: 'Remember me' }] }),
      block('6', 'paragraph', { text: [{ type: 'text', text: 'plain' }] }),
    ])
    expect(list.map((r) => r.kind)).toEqual([
      'image',
      'link',
      'file',
      'ref',
      'note',
    ])
    expect(list[1].title).toBe('https://x.org/a')
    expect(list[3].copy).toBe('Smith (2020)')
  })
  it('leaves out empty slots and deleted blocks', () => {
    expect(resourceOfBlock(block('1', 'image', { url: '' }))).toBeNull()
    expect(resourceOfBlock(block('2', 'quote', { text: [] }))).toBeNull()
    expect(
      resourcesOfBlocks([block('3', 'embed', { url: 'https://a.b' }, 5)]),
    ).toEqual([])
  })
})

describe('filters and scopes', () => {
  const items = resourcesOfBlocks([
    block('1', 'embed', { url: 'https://alpha.org' }),
    block('2', 'embed', { url: 'https://beta.org' }),
    block('3', 'callout', { text: [{ type: 'text', text: 'Alpha note' }] }),
  ])
  it('kind chip and Find', () => {
    expect(filterResources(items, 'all', '')).toHaveLength(3)
    expect(filterResources(items, 'link', '')).toHaveLength(2)
    expect(filterResources(items, 'all', 'ALPHA')).toHaveLength(2)
    expect(filterResources(items, 'audio', '')).toHaveLength(0)
  })
  it('Beginner has two scopes, the switch adds Everywhere', () => {
    expect(scopesOn(false)).toEqual(['page', 'notebook'])
    expect(scopesOn(true)).toEqual(['page', 'notebook', 'all'])
    expect(effectiveScope('all', false)).toBe('notebook')
    expect(effectiveScope('all', true)).toBe('all')
  })
})
