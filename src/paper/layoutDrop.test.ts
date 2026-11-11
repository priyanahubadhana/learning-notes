import { describe, expect, it } from 'vitest'
import { insertRow, layoutRows, type Geometry, type GridRow } from './grid'
import { lineUpLeft, planDrop, resizeRight, spaceEvenly } from './layoutDrop'

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
const heights = { main: 30, a: 10, b: 10, c: 10 }

describe('Layout pop-up maths', () => {
  const rows = (): GridRow[] => {
    let r = [full('r0', 'main')]
    r = insertRow(r, 1, 'a', 50, { x: 40 })
    r = insertRow(r, 2, 'b', 70, { x: 80 })
    r = insertRow(r, 3, 'c', 140, { x: 30 })
    return r
  }
  it('a drop on another box adds a column; on blank paper it stays free', () => {
    const laid = layoutRows(rows(), heights, {
      ...G,
      autoW: { a: 20, b: 20, c: 20 },
    })
    const a = laid.get('a')!
    const col = planDrop(rows(), laid, 'c', a.x + a.w - 1, a.y + 2, G)
    expect(col.blank).toBe(false)
    expect(col.rows.find((r) => r.cols.length === 2)).toBeTruthy()
    const free = planDrop(rows(), laid, 'c', 120, 200, G)
    expect(free.blank).toBe(true)
    const r = free.rows.find((x) => x.cols[0].boxIds[0] === 'c')!
    expect(r.x).toBeGreaterThan(100)
  })
  it('pulling the right edge gives a free box its own width', () => {
    const laid = layoutRows(rows(), heights, G)
    const out = resizeRight(rows(), laid, 'a', 120, G)
    const r = out.find((x) => x.cols[0].boxIds[0] === 'a')!
    expect(r.wmm).toBe(80)
    expect(r.auto).toBeUndefined()
  })
  it('line up left moves every free box to the left margin', () => {
    const out = lineUpLeft(rows(), G)
    expect(out.filter((r) => r.x !== undefined).every((r) => r.x === 15)).toBe(
      true,
    )
  })
  it('space evenly needs three boxes and gives equal gaps', () => {
    const laid = layoutRows(rows(), heights, G)
    const out = spaceEvenly(rows(), laid)!
    const l2 = layoutRows(out, heights, G)
    const g1 = l2.get('b')!.y - (l2.get('a')!.y + 10)
    const g2 = l2.get('c')!.y - (l2.get('b')!.y + 10)
    expect(Math.abs(g1 - g2)).toBeLessThan(0.2)
    expect(spaceEvenly(rows().slice(0, 3), laid)).toBeNull()
  })
})
