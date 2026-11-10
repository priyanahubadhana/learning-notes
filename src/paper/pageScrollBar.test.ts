import { describe, expect, it } from 'vitest'
import { barGeometry, dragTop, sheetTarget } from './pageBar'

describe('page scroll bar maths', () => {
  it('has no thumb when nothing scrolls', () => {
    expect(barGeometry(0, 500, 500, 400)).toBeNull()
  })
  it('sizes the thumb to the window and keeps a minimum', () => {
    expect(barGeometry(0, 1000, 500, 400)?.thumbH).toBe(200)
    expect(barGeometry(0, 100000, 500, 400)?.thumbH).toBe(40)
  })
  it('puts the thumb at the end at the bottom', () => {
    const g = barGeometry(500, 1000, 500, 400)!
    expect(g.thumbTop + g.thumbH).toBe(400)
  })
  it('drags 1:1 and clamps', () => {
    // travel 200 px of track moves the whole 500 px range
    expect(dragTop(0, 100, 1000, 500, 400, 200)).toBe(250)
    expect(dragTop(0, 999, 1000, 500, 400, 200)).toBe(500)
    expect(dragTop(100, -999, 1000, 500, 400, 200)).toBe(0)
  })
  it('moves one sheet per arrow tap', () => {
    const tops = [0, 1200, 2400]
    expect(sheetTarget(0, tops, 1, 700, 3000)).toBe(1200)
    expect(sheetTarget(1200, tops, 1, 700, 3000)).toBe(2400)
    expect(sheetTarget(1300, tops, -1, 700, 3000)).toBe(1200)
    expect(sheetTarget(1200, tops, -1, 700, 3000)).toBe(0)
    // after the last sheet: a window's worth, clamped to the end
    expect(sheetTarget(2400, tops, 1, 700, 2500)).toBe(2500)
  })
})
