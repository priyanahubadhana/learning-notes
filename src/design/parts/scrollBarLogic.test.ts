import { describe, expect, it } from 'vitest'
import { ARROW, BAR_W, barGeometry, sheetTarget } from './scrollBarLogic'

describe('the shared scroll bar sizes (F6)', () => {
  it('is a little smaller than the old page bar (24 wide, 40 arrows)', () => {
    expect(BAR_W).toBeLessThan(24)
    expect(BAR_W).toBeGreaterThanOrEqual(16)
    expect(ARROW).toBeLessThan(40)
  })
  it('has no thumb when nothing scrolls, and a thumb that reaches both ends', () => {
    expect(barGeometry(0, 500, 500, 400)).toBeNull()
    const top = barGeometry(0, 2000, 500, 400)!
    const end = barGeometry(1500, 2000, 500, 400)!
    expect(top.thumbTop).toBe(0)
    expect(end.thumbTop + end.thumbH).toBeCloseTo(400)
  })
  it('an arrow without stops moves nearly one window and never past the ends', () => {
    expect(sheetTarget(0, [], 1, 500, 1500)).toBe(450)
    expect(sheetTarget(1400, [], 1, 500, 1500)).toBe(1500)
    expect(sheetTarget(100, [], -1, 500, 1500)).toBe(0)
  })
})
