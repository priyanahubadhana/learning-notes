import { describe, expect, it } from 'vitest'
import { pushes, type SheetGeometry } from './paginate'

const g: SheetGeometry = {
  top: 0,
  height: 1000,
  gap: 16,
  bottomMargin: 100,
  topMargin: 50,
}
const lines = (n: number, h = 30, start = 50) =>
  Array.from({ length: n }, (_, i) => ({ top: start + i * h, height: h }))

describe('pagination across sheets', () => {
  it('pushes nothing while all fits on the first sheet', () => {
    expect(pushes(lines(10), g).every((p) => p === 0)).toBe(true)
  })
  it('no line sits in the gap, the bottom margin or crosses them', () => {
    const blocks = lines(80)
    const p = pushes(blocks, g)
    let acc = 0
    blocks.forEach((b, i) => {
      acc += p[i]
      const top = b.top + acc
      const bottom = top + b.height
      const sheet = Math.floor((top + g.gap) / (g.height + g.gap))
      const start = sheet * (g.height + g.gap)
      expect(top).toBeGreaterThanOrEqual(
        start + (sheet ? g.topMargin : 0) - 0.01,
      )
      expect(bottom).toBeLessThanOrEqual(
        start + g.height - g.bottomMargin + 0.01,
      )
    })
  })
  it('the next sheet starts at its top margin', () => {
    const blocks = lines(40)
    const p = pushes(blocks, g)
    const first = p.findIndex((x) => x > 0)
    const acc = p.slice(0, first + 1).reduce((a, b) => a + b, 0)
    expect(blocks[first].top + acc).toBeCloseTo(1016 + 50)
  })
  it('a block taller than a sheet is left to cross', () => {
    const p = pushes([{ top: 50, height: 2500 }], g)
    expect(p).toEqual([0])
  })
})
