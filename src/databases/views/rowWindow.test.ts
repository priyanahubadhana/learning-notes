import { describe, expect, it } from 'vitest'
import { OVERSCAN, WINDOW_THRESHOLD, rowRange } from './rowWindow'

describe('rowRange', () => {
  it('draws everything for a short list', () => {
    expect(rowRange(WINDOW_THRESHOLD, 40, 5000, 800)).toEqual({
      start: 0,
      end: WINDOW_THRESHOLD,
    })
  })

  it('draws only the rows near the screen for a long list', () => {
    const r = rowRange(10_000, 40, 40_000, 800)
    expect(r.start).toBe(1000 - OVERSCAN)
    expect(r.end).toBe(1020 + OVERSCAN)
  })

  it('starts at the top when the list is still below the screen', () => {
    const r = rowRange(10_000, 40, -300, 800)
    expect(r.start).toBe(0)
    expect(r.end).toBe(20 + OVERSCAN)
  })

  it('never goes past the end and always draws a row', () => {
    const r = rowRange(10_000, 40, 10_000_000, 800)
    expect(r.end).toBe(10_000)
    expect(r.start).toBeLessThan(r.end)
    expect(r.start).toBeGreaterThanOrEqual(0)
  })
})
