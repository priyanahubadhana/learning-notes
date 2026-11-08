import { describe, expect, it } from 'vitest'
import {
  boxesOf,
  groupBlocksByBox,
  MAIN_BOX,
  mainBox,
  inPaperOrder,
  placeInOrder,
  readingOrder,
} from './boxes'
import { checkedRow } from '../share/checkRows'

const blk = (id: string, parentId: string | null = null, boxId?: string) => ({
  id,
  parentId,
  boxId,
})

describe('paper boxes', () => {
  it('a page made before Phase Q is one full-width box with every block', () => {
    const page = {}
    expect(boxesOf(page)).toEqual([mainBox(page)])
    expect(mainBox(page)).toEqual({ id: MAIN_BOX, x: 15, y: 8, w: 180 })
    const blocks = [blk('a'), blk('b'), blk('c', 'b'), blk('d')]
    const groups = groupBlocksByBox(page, blocks)
    expect([...groups.keys()]).toEqual([MAIN_BOX])
    expect(groups.get(MAIN_BOX)).toEqual(blocks)
  })

  it('groups top-level blocks by box; nested blocks follow their parent', () => {
    const page = { boxes: [{ id: 'x', x: 20, y: 100, w: 80 }] }
    const groups = groupBlocksByBox(page, [
      blk('a'),
      blk('b', null, 'x'),
      blk('c', 'b'),
      blk('d', null, 'gone'),
    ])
    expect(groups.get(MAIN_BOX)!.map((b) => b.id)).toEqual(['a', 'd'])
    expect(groups.get('x')!.map((b) => b.id)).toEqual(['b', 'c'])
  })

  it('Letter sheets give a wider default box; a moved default box is kept', () => {
    expect(mainBox({ sheet: 'Letter' }).w).toBeCloseTo(185.9)
    const moved = { id: MAIN_BOX, x: 30, y: 40, w: 100 }
    expect(boxesOf({ boxes: [moved] })).toEqual([moved])
  })

  it('reading order: top to bottom, then left to right in a row', () => {
    const order = readingOrder([
      { id: 'c', x: 10, y: 200, w: 50 },
      { id: 'b', x: 120, y: 52, w: 50 },
      { id: 'a', x: 10, y: 50, w: 50 },
    ]).map((b) => b.id)
    expect(order).toEqual(['a', 'b', 'c'])
  })
})

describe('paper boxes in backups and sync rows', () => {
  const base = {
    id: 'p',
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
    notebookId: 'n',
    parentId: null,
    title: 'T',
    order: 'a0',
  }
  it('keeps valid boxes and the box id of a block', () => {
    const boxes = [{ id: 'x', x: 20, y: 30, w: 80, locked: true }]
    expect(checkedRow('pages', { ...base, boxes, sheet: 'Letter' })).toEqual({
      ...base,
      boxes,
      sheet: 'Letter',
    })
    const block = {
      id: 'b',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      pageId: 'p',
      parentId: null,
      type: 'paragraph',
      content: {},
      order: 'a0',
      boxId: 'x',
    }
    expect(checkedRow('blocks', block)?.boxId).toBe('x')
  })
  it('refuses bad boxes', () => {
    for (const bad of [
      [{ id: 'x', x: Infinity, y: 0, w: 10 }],
      [{ id: 'x', x: 0, y: 0, w: 0 }],
      [{ x: 0, y: 0, w: 10 }],
      'boxes',
    ]) {
      expect(checkedRow('pages', { ...base, boxes: bad })).toBeNull()
    }
  })
})

describe('paper reading order of blocks', () => {
  const inOrder = <T>(b: T[]) => b
  it('a page with no boxes keeps its own order', () => {
    const blocks = [blk('a'), blk('b')]
    expect(inPaperOrder({}, blocks, inOrder)).toEqual(blocks)
  })
  it('box by box: top to bottom, then left to right', () => {
    const page = {
      boxes: [
        { id: 'right', x: 120, y: 100, w: 60 },
        { id: 'left', x: 10, y: 101, w: 60 },
        { id: 'low', x: 10, y: 250, w: 60 },
      ],
    }
    const order = inPaperOrder(
      page,
      [
        blk('m1'),
        blk('l1', null, 'low'),
        blk('r1', null, 'right'),
        blk('x1', null, 'left'),
        blk('m2'),
      ],
      inOrder,
    ).map((b) => b.id)
    expect(order).toEqual(['m1', 'm2', 'x1', 'r1', 'l1'])
  })
})

describe('placeInOrder (phones)', () => {
  const box = (id: string, y: number, x = 15, locked?: true) => ({
    id,
    x,
    y,
    w: 90,
    ...(locked ? { locked } : {}),
  })
  const order = (boxes: ReturnType<typeof box>[], after: string) => {
    const p = placeInOrder(boxes, after)
    const moved = boxes.map((b) =>
      p.shifted.includes(b.id) ? { ...b, y: b.y + p.shift } : b,
    )
    return readingOrder([...moved, box('new', p.y)]).map((b) => b.id)
  }
  it('puts a box at the end, after a box, or at the start', () => {
    const list = [box('a', 40), box('b', 100), box('c', 160)]
    expect(order(list, 'end')).toEqual(['a', 'b', 'c', 'new'])
    expect(order(list, 'b')).toEqual(['a', 'b', 'new', 'c'])
    expect(order(list, 'start')).toEqual(['new', 'a', 'b', 'c'])
    expect(order([], 'end')).toEqual(['new'])
  })
  it('moves tight neighbours down, but not locked ones', () => {
    const list = [box('a', 40), box('b', 43, 100), box('c', 44, 50, true)]
    const p = placeInOrder(list, 'a')
    expect(p.shift).toBeGreaterThan(0)
    expect(p.shifted).toEqual(['b'])
  })
})

import { clearOfBoxes, dropPlan, sheetSegments, snapMove } from './boxes'

describe('boxes never overlap', () => {
  const a = { x: 15, y: 10, w: 100, h: 40 }
  it('leaves a free spot alone', () => {
    expect(clearOfBoxes({ x: 15, y: 60, w: 100, h: 20 }, [a])).toBe(60)
    expect(clearOfBoxes({ x: 130, y: 10, w: 50, h: 20 }, [a])).toBe(10)
  })
  it('moves a box under the one it overlaps, with a gap', () => {
    expect(clearOfBoxes({ x: 20, y: 30, w: 60, h: 20 }, [a])).toBe(53)
  })
  it('keeps going past several boxes', () => {
    const b = { x: 15, y: 53, w: 100, h: 30 }
    expect(clearOfBoxes({ x: 20, y: 30, w: 60, h: 20 }, [a, b])).toBe(86)
  })
})

describe('dropPlan (boxes below make room)', () => {
  const b = (
    id: string,
    x: number,
    y: number,
    w = 50,
    h = 20,
    fixed = false,
  ) => ({
    id,
    x,
    y,
    w,
    h,
    fixed,
  })
  it('pushes a covered box down under the dropped one, and cascades', () => {
    const plan = dropPlan([b('d', 20, 50)], [b('a', 20, 55), b('c', 20, 80)], 5)
    expect(plan.get('a')).toBe(75)
    // c was 80 and would now meet a (75..95): pushed under it.
    expect(plan.get('c')).toBe(100)
    expect(plan.has('d')).toBe(false)
  })
  it('leaves boxes that are not covered alone', () => {
    const plan = dropPlan(
      [b('d', 20, 50)],
      [b('a', 100, 55), b('c', 20, 200)],
      5,
    )
    expect(plan.size).toBe(0)
  })
  it('a dropped box gives way to a fixed box', () => {
    const plan = dropPlan([b('d', 20, 50)], [b('l', 20, 40, 50, 30, true)], 5)
    expect(plan.get('d')).toBeGreaterThanOrEqual(73)
    expect(plan.get('d')! % 5).toBe(0)
  })
  it('a group dropped together does not push its own members', () => {
    const plan = dropPlan(
      [b('d1', 10, 10), b('d2', 80, 10)],
      [b('x', 80, 15)],
      5,
    )
    expect([...plan.keys()]).toEqual(['x'])
  })
})

describe('snapMove (light guides)', () => {
  it('sticks to another box edge and the margin within the tolerance', () => {
    const s = snapMove(
      { x: 15.8, y: 99, w: 40, h: 10 },
      [{ x: 100, y: 100, w: 30, h: 10 }],
      210,
    )
    expect(s.x).toBe(15)
    expect(s.gx).toBe(15)
    expect(s.y).toBe(100)
    expect(s.gy).toBe(100)
  })
  it('does nothing when far from every edge', () => {
    const s = snapMove(
      { x: 40, y: 60, w: 40, h: 10 },
      [{ x: 150, y: 150, w: 30, h: 10 }],
      210,
    )
    expect(s).toEqual({ x: 40, y: 60, gx: null, gy: null })
  })
})

describe('sheetSegments (frame per sheet)', () => {
  it('splits a span at the gap', () => {
    const s = sheetSegments(900, 300, 1000, 20, 2)
    expect(s).toEqual([
      { top: 0, height: 100 },
      { top: 120, height: 180 },
    ])
  })
  it('one segment when it fits a sheet', () => {
    expect(sheetSegments(100, 200, 1000, 20, 2)).toEqual([
      { top: 0, height: 200 },
    ])
  })
})
