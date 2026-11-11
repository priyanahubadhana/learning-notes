import { describe, expect, it } from 'vitest'
import type { InkChunk, Stroke } from '../../core/inkTypes'
import type { Annotation } from '../../core/types'
import {
  blankSize,
  fateMap,
  identityPlan,
  insertBlank,
  isIdentity,
  mapAnnotations,
  mapInk,
  mapLocator,
  mapSource,
  movePage,
  removePages,
  turnPages,
  turnRects,
  turnStroke,
} from './pageOps'

const note = (id: string, page: number, rects = [0.1, 0.2, 0.3, 0.05]) =>
  ({
    id,
    pageId: 'b',
    kind: 'highlight',
    anchor: { type: 'pdf', page, rects },
    origin: 'user',
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
  }) as Annotation

const stroke = (pts: number[], width = 2): Stroke =>
  ({
    id: 's',
    at: 0,
    kind: 'ink',
    style: { width },
    pts,
    bw: 800,
  }) as unknown as Stroke

const chunk = (id: string, blockId: string | null, strokes: Stroke[] = []) =>
  ({ id, blockId, strokes }) as unknown as InkChunk

describe('page plan', () => {
  it('starts as the identity and notices edits', () => {
    const plan = identityPlan(4)
    expect(isIdentity(plan, 4)).toBe(true)
    expect(isIdentity(movePage(plan, 0, 1), 4)).toBe(false)
    expect(isIdentity(turnPages(plan, [2], 90), 4)).toBe(false)
    expect(isIdentity(removePages(plan, [3]), 4)).toBe(false)
  })

  it('moves, deletes, turns and inserts', () => {
    let plan = movePage(identityPlan(4), 0, 2)
    expect(plan.map((p) => p.from)).toEqual([2, 3, 1, 4])
    plan = removePages(plan, [1])
    expect(plan.map((p) => p.from)).toEqual([2, 1, 4])
    plan = insertBlank(plan, 0)
    expect(plan.map((p) => p.from)).toEqual([2, null, 1, 4])
    plan = turnPages(plan, [0], -90)
    expect(plan[0]!.turn).toBe(270)
    plan = turnPages(plan, [0], 90)
    expect(plan[0]!.turn).toBe(0)
    expect(insertBlank(plan, -1)[0]!.from).toBeNull()
  })

  it('maps old pages to their new numbers', () => {
    const plan = turnPages(
      removePages(movePage(identityPlan(4), 0, 3), [1]),
      [0],
      90,
    )
    // new order: 2, 4, 1 (page 3 deleted, page 2 turned)
    const f = fateMap(plan)
    expect(f.get(2)).toEqual({ to: 1, turn: 90 })
    expect(f.get(4)).toEqual({ to: 2, turn: 0 })
    expect(f.get(1)).toEqual({ to: 3, turn: 0 })
    expect(f.has(3)).toBe(false)
  })
})

describe('anchors follow the pages', () => {
  it('moves highlights and drops the ones on deleted pages', () => {
    const plan = removePages(movePage(identityPlan(3), 0, 2), [1])
    // order: 2, 1 (page 3 gone)
    const changes = mapAnnotations(
      [note('a', 1), note('b', 2), note('c', 3)],
      fateMap(plan),
    )
    const byId = Object.fromEntries(changes.map((c) => [c.id, c.anchor]))
    expect(byId.a).toMatchObject({ page: 2 })
    expect(byId.b).toMatchObject({ page: 1 })
    expect(byId.c).toBeNull()
  })

  it('leaves untouched annotations alone', () => {
    const plan = insertBlank(identityPlan(2), 0)
    // page 1 stays 1, page 2 becomes 3
    const changes = mapAnnotations([note('a', 1), note('b', 2)], fateMap(plan))
    expect(changes.map((c) => c.id)).toEqual(['b'])
  })

  it('ignores block anchors', () => {
    const block = {
      ...note('x', 1),
      anchor: { type: 'block', blockId: 'q' },
    } as Annotation
    expect(
      mapAnnotations([block], fateMap(removePages(identityPlan(2), [0]))),
    ).toEqual([])
  })

  it('turns rectangles with the page and four turns come home', () => {
    const r = [0.1, 0.2, 0.3, 0.05]
    expect(turnRects(r, 90)[0]).toBeCloseTo(1 - 0.2 - 0.05)
    let v = r
    for (let i = 0; i < 4; i++) v = turnRects(v, 90)
    v.forEach((n, i) => expect(n).toBeCloseTo(r[i]!))
    const a = turnRects(turnRects(r, 90), 270)
    a.forEach((n, i) => expect(n).toBeCloseTo(r[i]!))
    const b = turnRects(turnRects(r, 180), 180)
    b.forEach((n, i) => expect(n).toBeCloseTo(r[i]!))
  })

  it('keeps the rect inside the page after a turn', () => {
    for (const turn of [90, 180, 270] as const) {
      const [x, y, w, h] = turnRects([0.7, 0.1, 0.2, 0.05], turn)
      expect(x!).toBeGreaterThanOrEqual(0)
      expect(y!).toBeGreaterThanOrEqual(0)
      expect(x! + w!).toBeLessThanOrEqual(1.0000001)
      expect(y! + h!).toBeLessThanOrEqual(1.0000001)
    }
  })
})

describe('ink follows the pages', () => {
  const sizes = [
    { w: 600, h: 800 },
    { w: 600, h: 800 },
    { w: 600, h: 800 },
  ]

  it('renumbers ink blocks and deletes the ink of removed pages', () => {
    const plan = removePages(movePage(identityPlan(3), 0, 2), [1])
    const ch = mapInk(
      [
        chunk('a', 'pdf:1'),
        chunk('b', 'pdf:2'),
        chunk('c', 'pdf:3'),
        chunk('d', 'p-block-id'),
        chunk('e', null),
      ],
      fateMap(plan),
      sizes,
    )
    const by = Object.fromEntries(ch.map((c) => [c.id, c.blockId]))
    expect(by).toEqual({ a: 'pdf:2', b: 'pdf:1', c: null })
  })

  it('turns strokes: a point at the top-left corner goes to the top-right after a clockwise turn', () => {
    const s = turnStroke(stroke([0, 0, 1, 0, 0, 0]), 90, 800 / 600)
    expect(s.pts[0]).toBeCloseTo(1) // x
    expect(s.pts[1]).toBeCloseTo(0) // y
  })

  it('turning four times returns the stroke', () => {
    const start = stroke([0.2, 0.5, 1, 0, 0, 0, 0.7, 0.9, 1, 0, 0, 10], 3)
    let s = start
    let aspect = 800 / 600
    for (let i = 0; i < 4; i++) {
      s = turnStroke(s, 90, aspect)
      aspect = 1 / aspect
    }
    s.pts.forEach((n, i) => expect(n).toBeCloseTo(start.pts[i]!, 6))
    expect(s.style.width).toBeCloseTo(3, 6)
  })

  it('a stroke that was inside the page stays inside it', () => {
    const aspect = 800 / 600
    for (const turn of [90, 180, 270] as const) {
      const s = turnStroke(
        stroke([0.9, aspect - 0.1, 1, 0, 0, 0]),
        turn,
        aspect,
      )
      const newAspect = turn === 180 ? aspect : 1 / aspect
      expect(s.pts[0]!).toBeGreaterThanOrEqual(0)
      expect(s.pts[0]!).toBeLessThanOrEqual(1)
      expect(s.pts[1]!).toBeGreaterThanOrEqual(0)
      expect(s.pts[1]!).toBeLessThanOrEqual(newAspect)
    }
  })

  it('turns the strokes of a turned page and renumbers it', () => {
    const plan = turnPages(movePage(identityPlan(2), 1, 0), [0], 90)
    const ch = mapInk(
      [chunk('a', 'pdf:2', [stroke([0, 0, 1, 0, 0, 0])])],
      fateMap(plan),
      sizes,
    )
    expect(ch[0]!.blockId).toBe('pdf:1')
    expect(ch[0]!.strokes![0]!.pts[0]).toBeCloseTo(1)
  })
})

describe('reading place and blank pages', () => {
  it('moves the reading place with its page', () => {
    const plan = movePage(identityPlan(3), 0, 2)
    expect(mapLocator('pdf:1:0.5000', fateMap(plan), 3)).toBe('pdf:3:0.5000')
    expect(mapLocator('epub:abc', fateMap(plan), 3)).toBe('epub:abc')
  })

  it('falls back to the nearest page when the page was deleted', () => {
    const plan = removePages(identityPlan(3), [2])
    expect(mapLocator('pdf:3:0.9', fateMap(plan), 2)).toBe('pdf:2:0')
  })

  it('updates the page count and both places of a book', () => {
    const plan = removePages(identityPlan(5), [0])
    const src = mapSource(
      {
        kind: 'book',
        capturedAt: 1,
        pageCount: 5,
        at: 'pdf:3:0.2',
        furthestAt: 'pdf:5:0.1',
      } as never,
      fateMap(plan),
      4,
    )
    expect(src).toMatchObject({
      pageCount: 4,
      at: 'pdf:2:0.2',
      furthestAt: 'pdf:4:0.1',
    })
  })

  it('makes a blank page the size of its neighbour', () => {
    const sizes = [
      { w: 300, h: 500 },
      { w: 400, h: 400 },
    ]
    const plan = insertBlank(identityPlan(2), 0)
    expect(blankSize(plan, 1, sizes)).toEqual({ w: 300, h: 500 })
    expect(blankSize([{ from: null, turn: 0 }], 0, [])).toEqual({
      w: 595.28,
      h: 841.89,
    })
    const turned = turnPages(identityPlan(2), [0], 90)
    expect(blankSize([...turned, { from: null, turn: 0 }], 2, sizes)).toEqual({
      w: 400,
      h: 400,
    })
  })
})
