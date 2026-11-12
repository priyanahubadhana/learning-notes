import { describe, expect, it } from 'vitest'
import type { Annotation, Page, Tag } from '../../core/types'
import { cleanPrefs } from './libraryPrefs'
import { tagTree, themeItems } from './themeLogic'

const tag = (id: string, name: string, parentId: string | null = null) =>
  ({ id, name, parentId }) as Tag
const book = (id: string, tagIds: string[]) =>
  ({ id, title: id, tagIds }) as unknown as Page
const note = (id: string, pageId: string) => ({ id, pageId }) as Annotation

const tags = [
  tag('a', 'psychology'),
  tag('b', 'habits', 'a'),
  tag('c', 'money'),
]
const pages = [
  book('p1', ['b']),
  book('p2', ['c']),
  book('p3', ['a']),
  book('p4', []),
]
const anns = [note('n1', 'p1'), note('n2', 'p2'), note('n3', 'p3')]

describe('themes', () => {
  it('gathers books and highlights of a tag and its sub-tags', () => {
    const t = themeItems('a', tags, pages, anns)
    expect(t.books.map((b) => b.id)).toEqual(['p1', 'p3'])
    expect(t.highlights.map((h) => h.id)).toEqual(['n1', 'n3'])
    expect(t.family).toEqual(['a', 'b'])
    expect(themeItems('c', tags, pages, anns).books.map((b) => b.id)).toEqual([
      'p2',
    ])
    expect(themeItems('zzz', tags, pages, anns).books).toEqual([])
  })
  it('builds the Category > Tag > Sub-tag map with counts', () => {
    const tree = tagTree(tags, pages)
    expect(tree.map((n) => n.tag.name)).toEqual(['money', 'psychology'])
    const psych = tree[1]
    expect(psych.count).toBe(2)
    expect(psych.children[0].tag.name).toBe('habits')
    expect(psych.children[0].count).toBe(1)
  })
  it('does not loop on a tag that is its own ancestor', () => {
    const loop = [tag('x', 'x', 'y'), tag('y', 'y', 'x')]
    expect(() => tagTree(loop, [])).not.toThrow()
  })
  it('keeps valid themes and journal entries only', () => {
    const p = cleanPrefs({
      themes: ['a', 'a', 5, 'b'],
      journal: [
        { id: 'j1', book: 'p1', read: 'r', struck: 's', question: 'q', at: 5 },
        { id: '' },
      ],
    })
    expect(p.themes).toEqual(['a', 'b'])
    expect(p.journal).toHaveLength(1)
    expect(p.journal[0].read).toBe('r')
  })
})
