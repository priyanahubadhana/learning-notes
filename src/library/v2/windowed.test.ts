import { describe, expect, it } from 'vitest'
import { WINDOW_STEP, nextWindow } from './windowed'

describe('windowed list', () => {
  it('adds one step at a time and stops at the total', () => {
    expect(nextWindow(WINDOW_STEP, 1000)).toBe(WINDOW_STEP * 2)
    expect(nextWindow(960, 1000)).toBe(1000)
    expect(nextWindow(1000, 1000)).toBe(1000)
    expect(nextWindow(WINDOW_STEP, 10)).toBe(10)
  })
})
