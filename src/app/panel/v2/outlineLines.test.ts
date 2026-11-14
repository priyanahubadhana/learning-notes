import { describe, expect, it } from 'vitest'
import type { OutlineItem } from '../panelModel'
import { buildOutlineLines, type OutlinePage } from './outlineLines'

const h = (
  id: string,
  text: string,
  level: number,
  hasChildren = false,
): OutlineItem => ({ id, text, level, kind: 'heading', hasChildren })

const pages: OutlinePage[] = [
  { id: 'p1', title: 'Intro', depth: 0 },
  { id: 'p2', title: 'Maths', depth: 0 },
  { id: 'p3', title: 'Algebra', depth: 1 },
]
const items = new Map<string, OutlineItem[]>([
  ['p1', [h('a', 'Overview', 1, true), h('b', 'Key ideas', 2)]],
  ['p2', [h('c', 'Numbers', 1)]],
])
const base = {
  pages,
  open: new Set(['p1']),
  items,
  foldedHeadings: new Set<string>(),
  query: '',
  headingFold: false,
}

describe('outline lines', () => {
  it('open pages list headings, others fold to one line', () => {
    const lines = buildOutlineLines(base)
    expect(lines.map((l) => l.key)).toEqual([
      'p:p1',
      'h:a',
      'h:b',
      'p:p2',
      'p:p3',
    ])
    expect(lines[3].folded).toBe(true)
    expect(lines[4].indent).toBe(1)
  })
  it('a folded heading hides what is under it', () => {
    const lines = buildOutlineLines({
      ...base,
      foldedHeadings: new Set(['a']),
      headingFold: true,
    })
    expect(lines.map((l) => l.key)).toEqual(['p:p1', 'h:a', 'p:p2', 'p:p3'])
    expect(lines[1].foldable).toBe(true)
  })
  it('Beginner has no fold arrow on heading lines', () => {
    const lines = buildOutlineLines(base)
    expect(
      lines.filter((l) => l.kind === 'heading').every((l) => !l.foldable),
    ).toBe(true)
  })
  it('Find keeps matching lines and opens their pages', () => {
    const lines = buildOutlineLines({ ...base, query: 'numb' })
    expect(lines.map((l) => l.key)).toEqual(['p:p2', 'h:c'])
    expect(lines[0].foldable).toBe(false)
  })
  it('a page title that matches stays even with no heading match', () => {
    const lines = buildOutlineLines({ ...base, query: 'algebra' })
    expect(lines.map((l) => l.key)).toEqual(['p:p3'])
  })
  it('2,000 pages stay cheap', () => {
    const many: OutlinePage[] = Array.from({ length: 2000 }, (_, n) => ({
      id: 'q' + n,
      title: 'Page ' + n,
      depth: 0,
    }))
    const t0 = performance.now()
    const lines = buildOutlineLines({ ...base, pages: many, open: new Set() })
    expect(lines).toHaveLength(2000)
    expect(performance.now() - t0).toBeLessThan(300)
  })
})
