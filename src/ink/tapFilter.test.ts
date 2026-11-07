import { describe, expect, it } from 'vitest'
import {
  DEG,
  DOUBLE_MS,
  isDoubleTap,
  isShort,
  isTap,
  snapTurn,
  TAP_MS,
  TAP_PX,
  travelOf,
} from './tapFilter'

describe('taps are not ink', () => {
  it('a quick touch that barely moved is a tap', () => {
    expect(isTap(30, 0)).toBe(true)
    expect(isTap(TAP_MS - 1, TAP_PX - 1)).toBe(true)
  })
  it('a slower press is a deliberate dot; a longer stroke is ink', () => {
    expect(isTap(TAP_MS, 0)).toBe(false)
    expect(isTap(30, TAP_PX)).toBe(false)
    expect(isTap(400, 2)).toBe(false)
  })
  it('a tiny mark (under 3 px, 150 ms) is short (half of a double tap) but not a tap', () => {
    expect(isTap(120, 2)).toBe(false) // held longer than a tap: a dot
    expect(isShort(120, 2)).toBe(true)
    expect(isShort(200, 2)).toBe(false)
    expect(isShort(120, 7)).toBe(false) // a comma is ink
  })
  it('a second pen-down within 300 ms and 10 px of a short mark is a double tap', () => {
    const first = { at: 1000, x: 100, y: 100 }
    expect(isDoubleTap(first, { at: 1200, x: 106, y: 95 })).toBe(true)
    expect(isDoubleTap(first, { at: 1000 + DOUBLE_MS, x: 100, y: 100 })).toBe(
      false,
    )
    expect(isDoubleTap(first, { at: 1100, x: 112, y: 100 })).toBe(false)
    expect(isDoubleTap(null, { at: 1100, x: 100, y: 100 })).toBe(false)
  })
  it('turns click to a step when within the allowance', () => {
    expect(snapTurn(88 * DEG, Math.PI / 2, 5 * DEG)).toBeCloseTo(Math.PI / 2, 9)
    expect(snapTurn(80 * DEG, Math.PI / 2, 5 * DEG)).toBeCloseTo(80 * DEG, 9)
    expect(snapTurn(-1 * DEG, Math.PI / 2, 5 * DEG)).toBeCloseTo(0, 9)
  })
  it('travel is the farthest any point got from the first', () => {
    expect(travelOf([])).toBe(0)
    expect(
      travelOf([
        { x: 0, y: 0 },
        { x: 3, y: 4 },
        { x: 1, y: 1 },
      ]),
    ).toBe(5)
  })
})
