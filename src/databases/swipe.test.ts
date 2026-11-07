import { describe, expect, it } from 'vitest'
import { swipeDirection } from './swipe'

describe('swipeDirection', () => {
  it('swipe left goes to the next day, right to the previous', () => {
    expect(swipeDirection(-120, 10, 200)).toBe(1)
    expect(swipeDirection(120, -10, 200)).toBe(-1)
  })
  it('ignores short, slow and mostly vertical moves', () => {
    expect(swipeDirection(30, 0, 100)).toBe(0)
    expect(swipeDirection(-200, 0, 1500)).toBe(0)
    expect(swipeDirection(-100, 90, 200)).toBe(0)
  })
})
