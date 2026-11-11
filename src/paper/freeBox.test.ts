import { describe, expect, it } from 'vitest'
import {
  FREE_MIN_W,
  freeMaxW,
  insertAt,
  insertRow,
  isGridRows,
  layoutRows,
  placesOf,
  reconcile,
  type Geometry,
  type GridRow,
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
const full = (id: string, box: string): GridRow => ({
  id,
  cols: [{ w: 1, boxIds: [box] }],
})

describe('free text boxes (text box v2)', () => {
  it('a new free box is a small box at the tapped left edge, under the rows above', () => {
    const rows = insertRow([full('r1', 'main')], 1, 'a', 40, { x: 60 })
    const m = layoutRows(rows, { main: 20, a: 6 }, G)
    expect(m.get('a')!.x).toBe(60)
    expect(m.get('a')!.y).toBe(40)
    expect(m.get('a')!.w).toBe(FREE_MIN_W)
  })
  it('grows with the measured text width, never past the right margin gap', () => {
    const rows = insertRow([], 0, 'a', 10, { x: 150 })
    const grown = layoutRows(rows, { a: 6 }, { ...G, autoW: { a: 20 } })
    expect(grown.get('a')!.w).toBe(20)
    expect(freeMaxW(G, 150)).toBe(210 - 15 - 5 - 150)
  })
  it('a width the user set is kept, even if the text is shorter', () => {
    const rows = insertRow([], 0, 'a', 10, { x: 30, wmm: 80 })
    const m = layoutRows(rows, { a: 6 }, { ...G, autoW: { a: 20 } })
    expect(m.get('a')!.w).toBe(80)
  })
  it('never overlaps: a box that grows taller pushes the rows below it down', () => {
    const rows = insertRow([full('r2', 'b')], 0, 'a', 10, { x: 30 })
    const short = layoutRows(rows, { a: 10, b: 10 }, G)
    const tall = layoutRows(rows, { a: 50, b: 10 }, G)
    expect(short.get('b')!.y).toBeGreaterThanOrEqual(10 + 10)
    expect(tall.get('b')!.y).toBeGreaterThanOrEqual(10 + 50)
  })
  it('stores the widest it may grow for exports, not the measured width', () => {
    const rows = insertRow([], 0, 'a', 10, { x: 30 })
    const p = placesOf(rows, { a: 6 }, { ...G, autoW: { a: 12 } })
    expect(p[0].patch.w).toBe(freeMaxW(G, 30))
    const set = placesOf(
      insertRow([], 0, 'a', 10, { x: 30, wmm: 70 }),
      { a: 6 },
      G,
    )
    expect(set[0].patch.w).toBe(70)
  })
  it('a drop beside it turns the row into columns of the page grid', () => {
    const rows = insertRow([full('r1', 'b')], 0, 'a', 10, { x: 40 })
    const d = insertAt(rows, 'b', 'right', 'a')
    const row = d.rows.find((r) => r.cols.some((c) => c.boxIds.includes('a')))!
    expect(row.cols).toHaveLength(2)
    expect(row.x).toBeUndefined()
    expect(row.auto).toBeUndefined()
  })
  it('free rows survive reconcile and pass the stored-shape check', () => {
    const rows = insertRow([full('r1', 'main')], 1, 'a', 30, { x: 20 })
    expect(isGridRows(reconcile(rows, ['main', 'a']))).toBe(true)
    expect(isGridRows([{ ...rows[1], x: 'no' }])).toBe(false)
    expect(isGridRows([{ ...rows[1], auto: false }])).toBe(false)
  })
  it('an empty free box removed leaves no row behind', () => {
    const rows = insertRow([full('r1', 'main')], 1, 'a', 30, { x: 20 })
    expect(reconcile(rows, ['main'])).toHaveLength(1)
  })
})
