import { describe, expect, it } from 'vitest'
import { placeAround } from './useAnchoredCard'

const SIZE = { width: 376, height: 420 }
const hits = (
  p: { left: number; top: number },
  b: { left: number; top: number; width: number; height: number },
) =>
  p.left < b.left + b.width &&
  p.left + SIZE.width > b.left &&
  p.top < b.top + b.height &&
  p.top + SIZE.height > b.top

describe('placeAround (TB-42, M1): right, else left, else under, else above', () => {
  const VP = { width: 1180, height: 820 }
  it('goes right of a box that leaves room on the right', () => {
    const box = { left: 100, top: 200, width: 300, height: 120 }
    const p = placeAround(box, SIZE, VP)
    expect(p?.side).toBe('right')
    expect(p!.left).toBeGreaterThanOrEqual(box.left + box.width)
    expect(hits(p!, box)).toBe(false)
  })
  it('goes left when the right has no room', () => {
    const box = { left: 760, top: 200, width: 340, height: 120 }
    const p = placeAround(box, SIZE, VP)
    expect(p?.side).toBe('left')
    expect(hits(p!, box)).toBe(false)
  })
  it('goes under a wide box (portrait), else above it', () => {
    const portrait = { width: 820, height: 1180 }
    const wide = { left: 40, top: 100, width: 740, height: 200 }
    const under = placeAround(wide, SIZE, portrait)
    expect(under?.side).toBe('below')
    expect(under!.top).toBeGreaterThanOrEqual(wide.top + wide.height)
    const low = { left: 40, top: 800, width: 740, height: 300 }
    const above = placeAround(low, SIZE, portrait)
    expect(above?.side).toBe('above')
    expect(hits(above!, low)).toBe(false)
  })
  it('stays 12 px inside the screen, also on a phone', () => {
    const phone = { width: 390, height: 844 }
    const box = { left: 16, top: 300, width: 358, height: 100 }
    const p = placeAround(box, { width: 304, height: 300 }, phone)
    expect(p).not.toBeNull()
    expect(p!.left).toBeGreaterThanOrEqual(12)
    expect(p!.left + p!.width).toBeLessThanOrEqual(phone.width - 12)
    expect(p!.top).toBeGreaterThanOrEqual(12)
  })
  it('never starts above clearTop: a tall card is shortened above the box and scrolls', () => {
    const phone = { width: 390, height: 844 }
    // The box sits low, so only "above" is left; the bar ends at y 168.
    const box = { left: 16, top: 560, width: 358, height: 300 }
    const p = placeAround(box, { width: 304, height: 520 }, phone, 168)
    expect(p).not.toBeNull()
    expect(p!.top).toBeGreaterThanOrEqual(168)
    expect(p!.maxHeight).toBe(560 - 8 - 168)
    expect(p!.top + p!.maxHeight!).toBeLessThanOrEqual(box.top - 8)
  })
  it('returns null when nothing fits without covering the box', () => {
    const huge = { left: 12, top: 12, width: 1150, height: 790 }
    expect(placeAround(huge, SIZE, VP)).toBeNull()
  })
})
