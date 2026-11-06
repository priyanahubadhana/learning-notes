import { describe, expect, it } from 'vitest'
import { moreOf, thumbOf } from './scrollHints'

describe('scroll hints', () => {
  it('says which edges hide more content', () => {
    expect(moreOf(0, 100, 100)).toBeNull()
    expect(moreOf(0, 300, 100)).toBe('bottom')
    expect(moreOf(100, 300, 100)).toBe('both')
    expect(moreOf(200, 300, 100)).toBe('top')
  })

  it('places the indicator and keeps it inside the track', () => {
    expect(thumbOf(0, 100, 100)).toBeNull()
    const start = thumbOf(0, 1000, 200)!
    const end = thumbOf(800, 1000, 200)!
    expect(start.top).toBe(3)
    expect(start.height).toBeGreaterThanOrEqual(28)
    expect(end.top + end.height).toBeCloseTo(197)
    expect(thumbOf(0, 100000, 200)!.height).toBe(28)
  })
})
