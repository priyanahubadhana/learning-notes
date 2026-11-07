import { describe, expect, it } from 'vitest'
import { NONE, measureOverflow, scrollForPointer } from './overflowMath'

const edges = [0, 1, 2, 3, 4].map((i) => ({
  left: i * 100,
  right: i * 100 + 100,
}))

describe('scrollable bar cues (R7-14, R7-17)', () => {
  it('shows nothing while the bar fits', () => {
    expect(measureOverflow(0, 500, 500, edges)).toEqual(NONE)
  })
  it('counts the tools out of sight at the end and the start', () => {
    const start = measureOverflow(0, 250, 500, edges)
    expect(start.end).toBe(true)
    expect(start.start).toBe(false)
    expect(start.hiddenEnd).toBe(3) // tools 3, 4 and the cut-off one
    expect(start.thumb).toEqual({ left: 0, width: 0.5 })
    const end = measureOverflow(250, 250, 500, edges)
    expect(end.end).toBe(false)
    expect(end.hiddenStart).toBe(3)
    expect(end.thumb?.left).toBeCloseTo(0.5)
  })
  it('maps a pointer on the track to a scroll position (handle centred on it)', () => {
    expect(scrollForPointer(0, 0.5, 250)).toBe(0)
    expect(scrollForPointer(0.5, 0.5, 250)).toBe(125)
    expect(scrollForPointer(1, 0.5, 250)).toBe(250)
    expect(scrollForPointer(0.3, 1, 250)).toBe(0)
  })
})
