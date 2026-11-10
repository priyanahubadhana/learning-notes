import { describe, expect, it } from 'vitest'
import {
  currentOutline,
  THUMB_ROW,
  visibleFraction,
  visibleRows,
} from './bookPanelMath'

describe('book panel maths', () => {
  it('draws only the rows near the view, also in a 5,000 page book', () => {
    const { from, to } = visibleRows(0, 600, 5000)
    expect(from).toBe(0)
    expect(to - from).toBeLessThan(15)
    const mid = visibleRows(THUMB_ROW * 2500, 600, 5000)
    expect(mid.from).toBeGreaterThan(2400)
    expect(mid.to - mid.from).toBeLessThan(15)
    expect(visibleRows(0, 600, 0)).toEqual({ from: 0, to: 0 })
    expect(visibleRows(99999, 600, 3).to).toBeLessThanOrEqual(3)
  })

  it('finds the chapter being read', () => {
    const items = [
      { title: 'A', page: 1, depth: 0 },
      { title: 'B', page: 5, depth: 0 },
      { title: 'C', page: 9, depth: 0 },
    ]
    expect(currentOutline(items, 1, '')).toBe(0)
    expect(currentOutline(items, 6, '')).toBe(1)
    expect(currentOutline(items, 12, '')).toBe(2)
    const epub = [
      { title: 'One', page: 0, depth: 0 },
      { title: 'Two', page: 0, depth: 0 },
    ]
    expect(currentOutline(epub, 1, 'Two')).toBe(1)
    expect(currentOutline([], 1, '')).toBe(-1)
  })

  it('maps the screen onto the page for the zoom overview', () => {
    const page = { left: 0, top: 0, width: 1000, height: 1400 }
    const f = visibleFraction(page, {
      left: 250,
      top: 0,
      right: 750,
      bottom: 700,
    })
    expect(f.x).toBeCloseTo(0.25)
    expect(f.w).toBeCloseTo(0.5)
    expect(f.h).toBeCloseTo(0.5)
  })
})
