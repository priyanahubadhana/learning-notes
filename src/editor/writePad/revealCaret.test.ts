import { describe, expect, it } from 'vitest'
import { scrollDelta } from './revealCaret'

describe('scrollDelta', () => {
  it('is 0 when the line is clear of the pad', () => {
    expect(scrollDelta(100, 120, 400)).toBe(0)
  })
  it('scrolls down by how far the line hides behind the pad', () => {
    expect(scrollDelta(420, 440, 400)).toBe(40)
  })
  it('scrolls up when the line is above the window', () => {
    expect(scrollDelta(-30, -10, 400)).toBe(-30)
  })
})
