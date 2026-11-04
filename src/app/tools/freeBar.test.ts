import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FREE_POS,
  EDGE_MARGIN,
  SNAP_PX,
  isFreePos,
  placeBar,
  posFromPixels,
  room,
  type Box,
  type Insets,
} from './freeBar'

const none: Insets = { top: 0, right: 0, bottom: 0, left: 0 }
const ipad: Box = { left: 0, top: 0, width: 820, height: 1180 }
const bar = { width: 600, height: 56 }

/** The bar stays fully inside the visible screen (minus the margin). */
function inside(
  at: { x: number; y: number },
  b: typeof bar,
  view: Box,
  i: Insets,
) {
  expect(at.x).toBeGreaterThanOrEqual(view.left + i.left + EDGE_MARGIN - 0.001)
  expect(at.y).toBeGreaterThanOrEqual(view.top + i.top + EDGE_MARGIN - 0.001)
  expect(at.x + b.width).toBeLessThanOrEqual(
    view.left + view.width - i.right - EDGE_MARGIN + 0.001,
  )
  expect(at.y + b.height).toBeLessThanOrEqual(
    view.top + view.height - i.bottom - EDGE_MARGIN + 0.001,
  )
}

describe('the floating bar position', () => {
  it('validates the saved place (out of range or damaged reads as the default)', () => {
    expect(isFreePos({ fx: 0.2, fy: 1 })).toBe(true)
    expect(isFreePos({ fx: -0.1, fy: 0.5 })).toBe(false)
    expect(isFreePos({ fx: 2, fy: 0.5 })).toBe(false)
    expect(isFreePos({ fx: 0.5 })).toBe(false)
    expect(isFreePos({ fx: NaN, fy: 0 })).toBe(false)
    expect(isFreePos(null)).toBe(false)
    expect(isFreePos('x')).toBe(false)
    expect(isFreePos(DEFAULT_FREE_POS)).toBe(true)
  })

  it('every saved place lands inside the screen: portrait, landscape, keyboard, safe areas', () => {
    const views: Box[] = [
      ipad,
      { left: 0, top: 0, width: 1180, height: 820 },
      { left: 0, top: 0, width: 820, height: 560 }, // keyboard open
      { left: 12, top: 340, width: 700, height: 420 }, // zoomed and panned
    ]
    const insets: Insets[] = [
      none,
      { top: 24, right: 20, bottom: 34, left: 20 },
    ]
    for (const view of views) {
      for (const i of insets) {
        for (const fx of [0, 0.25, 0.5, 1]) {
          for (const fy of [0, 0.5, 0.97, 1]) {
            inside(placeBar({ fx, fy }, bar, view, i), bar, view, i)
          }
        }
      }
    }
  })

  it('a bar bigger than the screen sticks to the top-left corner (never off-screen)', () => {
    const tiny: Box = { left: 0, top: 0, width: 300, height: 40 }
    const at = placeBar({ fx: 1, fy: 1 }, bar, tiny, none)
    expect(at).toEqual({ x: EDGE_MARGIN, y: EDGE_MARGIN })
    expect(room(bar, tiny, none).width).toBe(0)
  })

  it('the default place is centred just above the bottom edge', () => {
    const at = placeBar(DEFAULT_FREE_POS, bar, ipad, none)
    expect(at.x + bar.width / 2).toBeCloseTo(ipad.width / 2, 0)
    expect(ipad.height - (at.y + bar.height)).toBeLessThan(60)
  })

  it('a dropped bar snaps gently to an edge, and not when it is far from one', () => {
    const r = room(bar, ipad, none)
    const nearLeft = posFromPixels(r.left + SNAP_PX - 2, 400, bar, ipad, none)
    expect(nearLeft.fx).toBe(0)
    const nearBottom = posFromPixels(
      100,
      r.top + r.height - SNAP_PX + 2,
      bar,
      ipad,
      none,
    )
    expect(nearBottom.fy).toBe(1)
    const middle = posFromPixels(r.left + 100, r.top + 300, bar, ipad, none)
    expect(middle.fx).toBeGreaterThan(0)
    expect(middle.fx).toBeLessThan(1)
    // Dropped outside the screen: held at the edge.
    const out = posFromPixels(-500, 5000, bar, ipad, none)
    expect(out).toEqual({ fx: 0, fy: 1 })
    expect(isFreePos(out)).toBe(true)
  })

  it('the same saved place after a rotation is the same relative spot', () => {
    const pos = { fx: 0.5, fy: 0.5 }
    const a = placeBar(pos, bar, ipad, none)
    const b = placeBar(
      pos,
      bar,
      { left: 0, top: 0, width: 1180, height: 820 },
      none,
    )
    expect(a.x + bar.width / 2).toBeCloseTo(ipad.width / 2, 0)
    expect(b.x + bar.width / 2).toBeCloseTo(1180 / 2, 0)
  })
})
