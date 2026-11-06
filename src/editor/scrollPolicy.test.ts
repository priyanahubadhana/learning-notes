import { describe, expect, it } from 'vitest'
import { revealDelta } from './scrollPolicy'

const view = { top: 100, bottom: 500 }

describe('revealDelta', () => {
  it('does not move when the caret is visible', () => {
    expect(revealDelta({ top: 200, bottom: 220 }, view)).toBe(0)
  })
  it('scrolls down by the smallest amount when the caret is below', () => {
    expect(revealDelta({ top: 520, bottom: 540 }, view)).toBe(540 - (500 - 24))
  })
  it('scrolls up when the caret is above', () => {
    expect(revealDelta({ top: 90, bottom: 110 }, view)).toBe(90 - (100 + 24))
  })
})
