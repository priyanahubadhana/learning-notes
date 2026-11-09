import { describe, expect, it } from 'vitest'
import { dragScrollTop, moreOf, thumbOf } from './scrollHints'
import { edgeOf, MAX_STRETCH, rubberBand } from './edgeStretch'

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

  it('drags 1:1: thumb travel = track - thumb, ends meet, never jumps', () => {
    const sh = 3000
    const ch = 600
    const g = thumbOf(0, sh, ch)!
    const travel = ch - 6 - g.height
    // A drag of the whole travel scrolls the whole range, no more.
    expect(dragScrollTop(0, travel, sh, ch, g.height)).toBeCloseTo(sh - ch)
    expect(dragScrollTop(0, travel * 5, sh, ch, g.height)).toBe(sh - ch)
    expect(dragScrollTop(500, -9999, sh, ch, g.height)).toBe(0)
    // A short drag moves the content proportionally (here about 6.5 px per px).
    const small = dragScrollTop(0, 10, sh, ch, g.height)
    expect(small).toBeCloseTo((10 * (sh - ch)) / travel)
    expect(small).toBeLessThan(100)
    // The thumb ends up exactly where the drag left it.
    const after = thumbOf(small, sh, ch)!
    expect(after.top - g.top).toBeCloseTo(10)
    expect(dragScrollTop(7, 50, 100, 100, 28)).toBe(7)
  })

  it('gives a soft, limited stretch at an edge', () => {
    expect(rubberBand(0)).toBe(0)
    expect(rubberBand(30)).toBeGreaterThan(rubberBand(10))
    expect(rubberBand(100000)).toBeLessThanOrEqual(MAX_STRETCH)
    expect(rubberBand(8)).toBeGreaterThan(0)
    expect(edgeOf(0, 1000, 500, 5)).toBe('top')
    expect(edgeOf(0, 1000, 500, -5)).toBeNull()
    expect(edgeOf(500, 1000, 500, -5)).toBe('bottom')
    expect(edgeOf(200, 1000, 500, 5)).toBeNull()
  })
})
