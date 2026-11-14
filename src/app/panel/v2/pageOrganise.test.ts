import { describe, expect, it } from 'vitest'
import {
  canLand,
  canShift,
  copyName,
  flattenPages,
  opsToOrder,
  pageAfterDelete,
  planDelete,
  planDrop,
  planDuplicate,
  planShift,
  rowWindow,
  subtreeOf,
  topPicked,
  type FlatRow,
  type PageLite,
} from './pageOrganise'

const p = (id: string, parentId: string | null = null): PageLite => ({
  id,
  parentId,
})
// A, B(b1, b2(b2x)), C, D
const PAGES = [
  p('A'),
  p('B'),
  p('b1', 'B'),
  p('b2', 'B'),
  p('b2x', 'b2'),
  p('C'),
  p('D'),
]
const rows = flattenPages(PAGES)
const ids = (r: readonly FlatRow[]) => r.map((x) => x.page.id)

/** Applies steps to a flat copy of the tree (like movePage would). */
function apply(
  pages: PageLite[],
  ops: { id: string; parentId: string | null; toIndex: number }[],
) {
  let list = [...pages]
  for (const op of ops) {
    const me = list.find((x) => x.id === op.id)!
    const rest = list.filter((x) => x.id !== op.id)
    const sibs = rest.filter((x) => x.parentId === op.parentId)
    const before = sibs[op.toIndex] // insert before this one, else last
    const moved = { ...me, parentId: op.parentId }
    if (before) rest.splice(rest.indexOf(before), 0, moved)
    else rest.push(moved)
    list = rest
  }
  return ids(flattenPages(list))
}

describe('flatten and picks', () => {
  it('lists each page with its sub-pages under it', () => {
    expect(ids(rows)).toEqual(['A', 'B', 'b1', 'b2', 'b2x', 'C', 'D'])
    expect(rows.map((r) => r.depth)).toEqual([0, 0, 1, 1, 2, 0, 0])
  })
  it('subtree and top picks', () => {
    expect(subtreeOf(rows, 'B')).toEqual(['b1', 'b2', 'b2x'])
    expect(topPicked(rows, new Set(['B', 'b2', 'C']))).toEqual(['B', 'C'])
  })
})

describe('opsToOrder', () => {
  it('gives no step for the same order', () => {
    expect(opsToOrder(null, ['a', 'b'], ['a', 'b'])).toEqual([])
  })
  it('turns one order into the other', () => {
    const ops = opsToOrder(null, ['a', 'b', 'c', 'd'], ['d', 'a', 'c', 'b'])
    const list = ['a', 'b', 'c', 'd']
    for (const o of ops) {
      list.splice(list.indexOf(o.id), 1)
      list.splice(o.toIndex, 0, o.id)
    }
    expect(list).toEqual(['d', 'a', 'c', 'b'])
  })
})

describe('Move earlier / later (NB-B42)', () => {
  it('one page steps past its neighbour, with its sub-pages', () => {
    const plan = planShift(rows, new Set(['C']), -1)
    expect(apply(PAGES, plan.ops)).toEqual([
      'A',
      'C',
      'B',
      'b1',
      'b2',
      'b2x',
      'D',
    ])
    expect(apply(PAGES, [...plan.ops, ...plan.undo])).toEqual(ids(rows))
  })
  it('picked pages that sit together stay together', () => {
    const plan = planShift(rows, new Set(['C', 'D']), -1)
    expect(apply(PAGES, plan.ops)).toEqual([
      'A',
      'C',
      'D',
      'B',
      'b1',
      'b2',
      'b2x',
    ])
  })
  it('the first page cannot go earlier, the last cannot go later', () => {
    expect(canShift(rows, new Set(['A']), -1)).toBe(false)
    expect(canShift(rows, new Set(['A']), 1)).toBe(true)
    expect(canShift(rows, new Set(['D']), 1)).toBe(false)
    expect(canShift(rows, new Set(['A', 'B', 'C', 'D']), 1)).toBe(false)
  })
  it('a sub-page moves only among its own brothers and sisters', () => {
    const plan = planShift(rows, new Set(['b2']), -1)
    expect(apply(PAGES, plan.ops)).toEqual([
      'A',
      'B',
      'b2',
      'b2x',
      'b1',
      'C',
      'D',
    ])
  })
})

describe('Drag (NB-B43, NB-P42)', () => {
  const byId = new Map(rows.map((r) => [r.page.id, r]))
  const order = ids(rows)
  it('dropping a top page lower gives the new order of its brothers', () => {
    // A dropped after C (slot 5 of the list without A).
    const plan = planDrop(rows, 0, order, 'A', 5)
    expect(plan).not.toBeNull()
    expect(plan?.parentId).toBeNull()
    expect(apply(PAGES, plan!.ops)).toEqual([
      'B',
      'b1',
      'b2',
      'b2x',
      'C',
      'A',
      'D',
    ])
  })
  it('a drop that changes nothing gives no plan', () => {
    expect(planDrop(rows, 0, order, 'A', 0)).toBeNull()
  })
  it('works on a slice that starts in the middle of a long list', () => {
    const plan = planDrop(rows, 5, ['C', 'D'], 'D', 0)
    expect(apply(PAGES, plan!.ops)).toEqual([
      'A',
      'B',
      'b1',
      'b2',
      'b2x',
      'D',
      'C',
    ])
  })
  it('refuses a slot inside another page’s sub-pages or its own', () => {
    // A between b1 and b2: inside B.
    const inB = ['B', 'b1', 'A', 'b2', 'b2x', 'C', 'D']
    expect(canLand(byId, 'A', inB, order, 0)).toBe(false)
    // B into its own sub-page.
    const inOwn = ['A', 'b1', 'B', 'b2', 'b2x', 'C', 'D']
    expect(canLand(byId, 'B', inOwn, order, 0)).toBe(false)
  })
  it('allows a slot between brothers and sisters, and the start slot', () => {
    expect(
      canLand(byId, 'A', ['B', 'b1', 'b2', 'b2x', 'A', 'C', 'D'], order, 0),
    ).toBe(true)
    expect(canLand(byId, 'A', order, order, 0)).toBe(true)
    expect(
      canLand(byId, 'b1', ['A', 'B', 'b2', 'b2x', 'b1', 'C', 'D'], order, 0),
    ).toBe(true)
    expect(
      canLand(byId, 'b1', ['A', 'b1', 'B', 'b2', 'b2x', 'C', 'D'], order, 0),
    ).toBe(false)
  })
  it('a slot that only swaps a page with its own sub-pages is skipped', () => {
    const swap = ['A', 'b1', 'B', 'b2', 'b2x', 'C', 'D'].filter(Boolean)
    expect(canLand(byId, 'B', swap, order, 0)).toBe(false)
  })
})

describe('Delete (NB-B44)', () => {
  it('counts sub-pages and takes each picked top page once', () => {
    const plan = planDelete(rows, new Set(['B', 'b2', 'D']))
    expect(plan.roots).toEqual(['B', 'D'])
    expect(plan.total).toBe(5)
    expect(plan.blocked).toBe(false)
  })
  it('never takes the last page of the notebook', () => {
    expect(planDelete(rows, new Set(ids(rows))).blocked).toBe(true)
    expect(
      planDelete(flattenPages([p('only')]), new Set(['only'])).blocked,
    ).toBe(true)
    expect(
      planDelete(flattenPages([p('x'), p('y')]), new Set(['x'])).blocked,
    ).toBe(false)
  })
  it('opens the next page, else the one before, after the open page goes', () => {
    expect(pageAfterDelete(rows, new Set(['B', 'b1', 'b2', 'b2x']), 'B')).toBe(
      'C',
    )
    expect(pageAfterDelete(rows, new Set(['C', 'D']), 'C')).toBe('b2x')
    expect(pageAfterDelete(rows, new Set(ids(rows)), 'A')).toBeNull()
  })
})

describe('Duplicate (NB-B45)', () => {
  it('puts each copy right after its original, last to first', () => {
    const steps = planDuplicate(rows, new Set(['A', 'C']))
    expect(steps).toEqual([
      { sourceId: 'C', parentId: null, toIndex: 3 },
      { sourceId: 'A', parentId: null, toIndex: 1 },
    ])
  })
  it('names the copy', () => {
    expect(copyName('Notes', 'copy')).toBe('Notes copy')
    expect(copyName('Notas', 'copia')).toBe('Notas copia')
  })
})

describe('A long list shows only a screenful (scale)', () => {
  const many = Array.from({ length: 2000 }, (_, i) => p('p' + i))
  const big = flattenPages(many)
  it('flattens 2,000 pages in order', () => {
    expect(big).toHaveLength(2000)
    expect(big[1999].page.id).toBe('p1999')
  })
  it('draws well under 40 rows at any scroll place', () => {
    for (const top of [0, 5000, 70000, 143900]) {
      const w = rowWindow(2000, 72, top, 640)
      expect(w.to - w.from).toBeLessThan(40)
      expect(w.from).toBeGreaterThanOrEqual(0)
      expect(w.to).toBeLessThanOrEqual(2000)
    }
    expect(rowWindow(2000, 72, 143900, 640).to).toBe(2000)
  })
  it('a drop in the middle plans a single step', () => {
    const w = rowWindow(2000, 72, 70000, 640)
    const slice = big.slice(w.from, w.to).map((r) => r.page.id)
    const plan = planDrop(big, w.from, slice, slice[0], 3)
    expect(plan?.ops).toHaveLength(1)
  })
  it('plans stay fast', () => {
    const t0 = performance.now()
    planShift(big, new Set(['p1000']), -1)
    planDelete(big, new Set(['p5', 'p6']))
    expect(performance.now() - t0).toBeLessThan(500)
  })
})
