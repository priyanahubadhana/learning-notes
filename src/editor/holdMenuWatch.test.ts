import { describe, expect, it } from 'vitest'
import { HOLD_STILL_PX, movedTooFar } from './holdMenuWatch'

describe('press-and-hold menu', () => {
  it('stays a hold within about 6 px and breaks beyond', () => {
    expect(movedTooFar(0, 0)).toBe(false)
    expect(movedTooFar(HOLD_STILL_PX, 0)).toBe(false)
    expect(movedTooFar(4, 4)).toBe(false)
    expect(movedTooFar(5, 5)).toBe(true)
  })
})
