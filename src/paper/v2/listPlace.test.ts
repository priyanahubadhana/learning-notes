import { describe, expect, it } from 'vitest'
import { LIST_H, placeList } from './listPlace'

const view = { width: 820, height: 1180 }
const box = (l: number, t: number, w: number, h: number) => ({
  left: l,
  top: t,
  right: l + w,
  bottom: t + h,
})

describe('placeList (the ⋯ list never covers its box)', () => {
  it('goes to the right of a narrow box', () => {
    const p = placeList(box(100, 300, 120, 60), 248, view)!
    expect(p.right - 248).toBeGreaterThanOrEqual(120 + 100)
  })
  it('goes to the left when the right has no room', () => {
    const p = placeList(box(560, 300, 200, 60), 248, view)!
    expect(p.right).toBeLessThanOrEqual(560)
  })
  it('goes under a wide box', () => {
    const p = placeList(box(40, 200, 740, 60), 248, view)!
    expect(p.bottom + 4).toBeGreaterThanOrEqual(260)
  })
  it('stays inside the screen, and gives up when nothing fits', () => {
    const p = placeList(box(100, 1100, 120, 60), 248, view)!
    expect(p.bottom + 4 + LIST_H).toBeLessThanOrEqual(1180)
    // A phone: under the box, shorter, it scrolls inside.
    const q = placeList(box(56, 330, 278, 44), 248, {
      width: 390,
      height: 844,
    })!
    expect(q.bottom + 4).toBeGreaterThanOrEqual(374)
    expect(placeList(box(40, 100, 740, 1000), 248, view)).toBeNull()
  })
})
