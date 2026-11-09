import { describe, expect, it } from 'vitest'
import { SAMPLE_FRAMES, framesAreSlow } from './glass'

describe('framesAreSlow', () => {
  it('needs a full sample first', () => {
    expect(framesAreSlow([50, 50, 50])).toBe(false)
  })
  it('is calm at 60 fps and trips at 25 fps', () => {
    expect(framesAreSlow(Array(SAMPLE_FRAMES).fill(16.7))).toBe(false)
    expect(framesAreSlow(Array(SAMPLE_FRAMES).fill(40))).toBe(true)
  })
  it('ignores a few hiccups', () => {
    const gaps = Array(SAMPLE_FRAMES).fill(16.7)
    gaps[3] = 120
    gaps[9] = 90
    expect(framesAreSlow(gaps)).toBe(false)
  })
})
