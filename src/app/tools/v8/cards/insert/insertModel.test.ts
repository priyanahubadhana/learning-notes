import { describe, expect, it } from 'vitest'
import { findTool } from '../../../toolRegistry'
import { insertGroups, allToolsGroups } from './insertModel'

const all = (g: ReturnType<typeof insertGroups>) =>
  g.flatMap((x) => x.tools.map((tl) => tl.id))

describe('Insert card (1f)', () => {
  it('has grouped tiles, every one a real tool, none twice', () => {
    const g = insertGroups({ insertMore: true })
    expect(g.length).toBeGreaterThanOrEqual(3)
    for (const id of all(g)) expect(findTool(id), id).toBeTruthy()
    expect(new Set(all(g)).size).toBe(all(g).length)
  })
  it('Beginner keeps the basics; Professional switches add more', () => {
    const b = all(insertGroups({ insertMore: false }))
    const p = all(insertGroups({ insertMore: true }))
    for (const id of ['picture', 'table', 'callout', 'divider', 'link'])
      expect(b).toContain(id)
    expect(b).not.toContain('mindMap')
    expect(p).toContain('mindMap')
    expect(p.length).toBeGreaterThan(b.length)
  })
})

describe('All tools card (TB-63)', () => {
  it('lists every ribbon group of every tab, nothing dropped', () => {
    const g = allToolsGroups()
    const ids = g.flatMap((x) => x.tools.map((tl) => tl.id))
    for (const id of ['bold', 'picture', 'ballPen', 'readingMode', 'card'])
      expect(ids).toContain(id)
    expect(g.every((x) => x.tools.length > 0)).toBe(true)
  })
})
