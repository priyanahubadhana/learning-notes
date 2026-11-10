import { describe, expect, it } from 'vitest'
import { clampBox } from './boxService'
import { RESIZE_HANDLES, HANDLE_AT } from './boxHandles'
import { SAFE_GAP_PX, SAFE_TOP_MM, TOUCH_PX } from './safeGap'
import { TOP } from './boxes'

describe('safe gap (B3-10)', () => {
  it('no box may start above the page text top', () => {
    expect(SAFE_TOP_MM).toBe(TOP)
    expect(clampBox({ id: 'a', x: 10, y: 0, w: 90 }, 210).y).toBe(TOP)
    expect(clampBox({ id: 'a', x: 10, y: -50, w: 90 }, 210).y).toBe(TOP)
    expect(clampBox({ id: 'a', x: 10, y: 60, w: 90 }, 210).y).toBe(60)
  })
  it('the reserved gap holds one 44 pt target', () => {
    expect(TOUCH_PX).toBeGreaterThanOrEqual(44)
    expect(SAFE_GAP_PX).toBeGreaterThanOrEqual(TOUCH_PX)
  })
})

describe('resize handles (B3-9)', () => {
  it('are 8: 4 sides and 4 corners, each at its own place', () => {
    expect(RESIZE_HANDLES).toHaveLength(8)
    const places = RESIZE_HANDLES.map((h) => HANDLE_AT[h].join(','))
    expect(new Set(places).size).toBe(8)
    expect(RESIZE_HANDLES.filter((h) => h.length === 2)).toHaveLength(4)
  })
})
