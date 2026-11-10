import { describe, expect, it } from 'vitest'
import { autoScrollStep, MAX_STEP } from './placementDrag'

describe('autoScrollStep', () => {
  it('does not scroll in the middle', () => {
    expect(autoScrollStep(300, 0, 600)).toBe(0)
  })
  it('scrolls up near the top and down near the bottom', () => {
    expect(autoScrollStep(10, 0, 600)).toBeLessThan(0)
    expect(autoScrollStep(590, 0, 600)).toBeGreaterThan(0)
  })
  it('is faster the nearer the edge, and capped', () => {
    expect(Math.abs(autoScrollStep(0, 0, 600))).toBeGreaterThan(
      Math.abs(autoScrollStep(40, 0, 600)),
    )
    expect(autoScrollStep(-500, 0, 600)).toBe(-(MAX_STEP + 1))
  })
  it('does nothing in a degenerate window', () => {
    expect(autoScrollStep(5, 10, 10)).toBe(0)
  })
})
