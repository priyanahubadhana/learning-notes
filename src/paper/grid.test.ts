import { describe, expect, it } from 'vitest'
import {
  applyPreset,
  equalRow,
  find,
  freshNeeded,
  insertAt,
  isGridRows,
  layoutRows,
  migrateToRows,
  normaliseFracs,
  PRESETS,
  readingIds,
  reconcile,
  removeBox,
  resizeCols,
  zoneOf,
  type GridRow,
  type Geometry,
} from './grid'

const G: Geometry = {
  sheetW: 210,
  sheetH: 297,
  gapMm: 10,
  left: 15,
  right: 15,
  top: 8,
  bottom: 15,
}
const row = (id: string, ...cols: [number, string[]][]): GridRow => ({
  id,
  cols: cols.map(([w, boxIds]) => ({ w, boxIds })),
})
const one = (...ids: string[]): GridRow[] =>
  ids.map((id) => row('r' + id, [1, [id]]))
const rowIds = (r: GridRow) => r.cols.flatMap((c) => c.boxIds)

describe('fractions', () => {
  it('sum to 1 and keep the minimum', () => {
    const f = normaliseFracs([0.05, 0.95])
    expect(f.reduce((a, b) => a + b)).toBeCloseTo(1)
    expect(Math.min(...f)).toBeGreaterThanOrEqual(0.25 - 1e-9)
  })
})

describe('insertAt', () => {
  it('right of a box makes two columns', () => {
    const { rows, full } = insertAt(one('a', 'b'), 'a', 'right', 'b')
    expect(full).toBe(false)
    expect(rows).toHaveLength(1)
    expect(rows[0].cols.map((c) => c.boxIds)).toEqual([['a'], ['b']])
    expect(rows[0].cols[0].w + rows[0].cols[1].w).toBeCloseTo(1)
  })
  it('a third makes three columns; a fourth does not fit: new row', () => {
    let r = insertAt(one('a', 'b', 'c', 'd'), 'a', 'right', 'b').rows
    r = insertAt(r, 'a', 'right', 'c').rows
    expect(r[0].cols).toHaveLength(3)
    const full = insertAt(r, 'a', 'right', 'd')
    expect(full.full).toBe(true)
    expect(full.rows.map((x) => x.cols.length)).toEqual([3, 1])
    expect(readingIds(full.rows).sort()).toEqual(['a', 'b', 'c', 'd'])
  })
  it('below a box stacks it; a third in the column goes to a new row', () => {
    let r = insertAt(one('a', 'b', 'c'), 'a', 'bottom', 'b').rows
    expect(r[0].cols[0].boxIds).toEqual(['a', 'b'])
    r = insertAt(r, 'a', 'top', 'c').rows
    expect(r.map(rowIds)).toEqual([['c'], ['a', 'b']])
  })
  it('2x2 can be built', () => {
    let r = insertAt(one('a', 'b', 'c', 'd'), 'a', 'right', 'b').rows
    r = insertAt(r, 'a', 'bottom', 'c').rows
    r = insertAt(r, 'b', 'bottom', 'd').rows
    expect(r).toHaveLength(1)
    expect(r[0].cols.map((c) => c.boxIds)).toEqual([
      ['a', 'c'],
      ['b', 'd'],
    ])
  })
  it('dropping on itself changes nothing; nothing is lost', () => {
    const r = insertAt(one('a', 'b'), 'a', 'left', 'a').rows
    expect(readingIds(r)).toEqual(['a', 'b'])
  })
})

describe('removeBox and reconcile', () => {
  it('removing the last box of a column closes it up', () => {
    const r = removeBox([row('r', [0.5, ['a']], [0.5, ['b']])], 'a')
    expect(r[0].cols).toEqual([{ w: 1, boxIds: ['b'] }])
  })
  it('reconcile drops unknown ids, keeps a box once and adds new boxes', () => {
    const r = reconcile(
      [row('r', [0.5, ['a', 'ghost']], [0.5, ['a']])],
      ['a', 'n'],
    )
    expect(readingIds(r)).toEqual(['a', 'n'])
  })
})

describe('migrateToRows', () => {
  const box = (id: string, x: number, y: number, w: number) => ({
    id,
    x,
    y,
    w,
  })
  it('side by side boxes share a row; stacked ones do not', () => {
    const r = migrateToRows(
      [box('a', 15, 10, 80), box('b', 110, 12, 80), box('c', 15, 100, 180)],
      { a: 40, b: 40, c: 20 },
    )
    expect(r.map(rowIds)).toEqual([['a', 'b'], ['c']])
    expect(r[0].cols[0].w).toBeCloseTo(0.5, 1)
  })
  it('five side by side: three in the first row, two in the next', () => {
    const boxes = [0, 1, 2, 3, 4].map((i) => box('b' + i, 15 + i * 30, 10, 28))
    const r = migrateToRows(boxes, {})
    expect(r.map((x) => x.cols.length)).toEqual([3, 2])
    expect(readingIds(r)).toHaveLength(5)
  })
  it('overlapping boxes end up in rows, none lost', () => {
    const r = migrateToRows(
      [box('a', 15, 10, 100), box('b', 40, 20, 100), box('s', 150, 12, 10)],
      { a: 50, b: 50, s: 3 },
    )
    expect(readingIds(r).sort()).toEqual(['a', 'b', 's'])
    expect(isGridRows(r)).toBe(true)
  })
  it('keeps a row y so a deliberate gap stays', () => {
    const r = migrateToRows([box('a', 15, 10, 180), box('b', 15, 200, 180)])
    expect(r[1].y).toBe(200)
  })
})

describe('layoutRows', () => {
  it('puts boxes beside and under each other, never overlapping', () => {
    const rows = [
      row('r1', [0.5, ['a']], [0.5, ['b', 'c']]),
      row('r2', [1, ['d']]),
    ]
    const m = layoutRows(rows, { a: 30, b: 20, c: 20, d: 10 }, G)
    expect(m.get('a')!.x).toBe(15)
    expect(m.get('b')!.x).toBeGreaterThan(m.get('a')!.x + m.get('a')!.w)
    expect(m.get('c')!.y).toBeGreaterThanOrEqual(m.get('b')!.y + 20)
    // row 2 under the taller column (b + c = 43 mm)
    expect(m.get('d')!.y).toBeGreaterThanOrEqual(m.get('b')!.y + 43)
  })
  it('a row that does not fit what is left of the sheet starts on the next one', () => {
    const rows = [row('r1', [1, ['a']]), row('r2', [1, ['b']])]
    const m = layoutRows(rows, { a: 250, b: 40 }, G)
    // b would end at 8+250+3+40 = 301 > 282 (297 - 15): next sheet
    expect(m.get('b')!.y).toBeCloseTo(297 + 10 + 8)
  })
  it('a row taller than a sheet runs on', () => {
    const m = layoutRows([row('r', [1, ['a']])], { a: 400 }, G)
    expect(m.get('a')!.y).toBe(8)
  })
  it('widths follow the fractions and the column gap', () => {
    const m = layoutRows(
      [row('r', [1 / 3, ['a']], [2 / 3, ['b']])],
      { a: 10, b: 10 },
      G,
    )
    expect(m.get('a')!.w + m.get('b')!.w).toBeCloseTo(180 - 4)
    expect(m.get('b')!.w / m.get('a')!.w).toBeCloseTo(2)
  })
})

describe('resizeCols', () => {
  const r = row('r', [0.5, ['a']], [0.5, ['b']])
  it('snaps to a third and keeps the minimum', () => {
    expect(resizeCols(r, 0, 0.34).cols[0].w).toBeCloseTo(1 / 3, 1)
    expect(resizeCols(r, 0, 0.05).cols[0].w).toBe(0.25)
    expect(resizeCols(r, 0, 0.99).cols[1].w).toBe(0.25)
  })
  it('only the two neighbours change', () => {
    const three = row('r', [0.3, ['a']], [0.3, ['b']], [0.4, ['c']])
    const out = resizeCols(three, 0, 0.45, false)
    expect(out.cols[2].w).toBe(0.4)
    expect(out.cols[0].w + out.cols[1].w).toBeCloseTo(0.6)
  })
  it('equal widths reset', () => {
    expect(equalRow(row('r', [0.25, ['a']], [0.75, ['b']])).cols[0].w).toBe(0.5)
  })
})

describe('presets', () => {
  it('re-arranges a row, fills new cells and loses nothing', () => {
    const rows = [row('r', [0.5, ['a']], [0.5, ['b']])]
    const six = PRESETS.find((p) => p.id === 'six')!
    expect(freshNeeded(rows, 'a', six)).toBe(4)
    const out = applyPreset(rows, 'a', six, ['n1', 'n2', 'n3', 'n4'])
    expect(out).toHaveLength(1)
    expect(out[0].cols.map((c) => c.boxIds)).toEqual([
      ['a', 'b'],
      ['n1', 'n2'],
      ['n3', 'n4'],
    ])
  })
  it('boxes that do not fit the layout go to a new row below', () => {
    const rows = [row('r', [1 / 3, ['a']], [1 / 3, ['b']], [1 / 3, ['c']])]
    const single = PRESETS.find((p) => p.id === 'one')!
    const out = applyPreset(rows, 'a', single, [])
    expect(out.map(rowIds)).toEqual([['a'], ['b', 'c']])
    expect(find(out, 'c')).not.toBeNull()
  })
})

describe('zoneOf and the stored shape', () => {
  it('picks the nearest edge', () => {
    expect(zoneOf(0.1, 0.5)).toBe('left')
    expect(zoneOf(0.9, 0.5)).toBe('right')
    expect(zoneOf(0.5, 0.05)).toBe('top')
    expect(zoneOf(0.5, 0.97)).toBe('bottom')
  })
  it('rejects bad rows', () => {
    expect(isGridRows([row('r', [1, ['a']])])).toBe(true)
    expect(isGridRows([row('r', [0.5, ['a']])])).toBe(false)
    expect(isGridRows([row('r', [1, ['a', 'b', 'c']])])).toBe(false)
    expect(isGridRows([row('r', [1, ['a']]), row('s', [1, ['a']])])).toBe(false)
    expect(isGridRows('x')).toBe(false)
  })
})
