import { describe, expect, it } from 'vitest'
import { snapBox, SNAP_MM, type GRect } from './guides'

const other: GRect = { id: 'a', x: 40, y: 50, w: 60, h: 20 }

describe('smart guides', () => {
  it('pulls a near left edge onto the other box and draws one line between them', () => {
    const r = snapBox({ x: 40.8, y: 100, w: 30, h: 10 }, [other], 210)
    expect(r.dx).toBeCloseTo(-0.8)
    const g = r.guides.find((x) => x.axis === 'x' && x.at === 40)!
    expect(g.kind).toBe('edge')
    // It runs from the top of the upper box to the bottom of the lower one only.
    expect(g.from).toBe(50)
    expect(g.to).toBe(110)
  })
  it('does nothing beyond the gentle distance', () => {
    const r = snapBox(
      { x: 40 + SNAP_MM + 1, y: 100, w: 30, h: 10 },
      [other],
      210,
    )
    expect(r.dx).toBe(0)
    expect(r.guides.filter((g) => g.axis === 'x' && g.at === 40)).toHaveLength(
      0,
    )
  })
  it('aligns centres', () => {
    const r = snapBox({ x: 55, y: 49.5, w: 30, h: 21 }, [other], 210)
    expect(r.guides.some((g) => g.axis === 'x' && g.kind === 'centre')).toBe(
      true,
    )
    expect(r.guides.some((g) => g.axis === 'y' && g.kind === 'centre')).toBe(
      true,
    )
  })
  it('shows the page-centre line', () => {
    const r = snapBox({ x: 90.4, y: 200, w: 30, h: 10 }, [], 210)
    expect(r.dx).toBeCloseTo(-0.4)
    expect(r.guides.map((g) => g.kind)).toEqual(['page'])
  })
  it('equal spacing: the same gap as between two boxes, with marks', () => {
    const a: GRect = { x: 10, y: 10, w: 20, h: 10 }
    const b: GRect = { x: 40, y: 10, w: 20, h: 10 } // gap 10
    const r = snapBox({ x: 70.7, y: 10, w: 20, h: 10 }, [a, b], 210)
    expect(r.dx).toBeCloseTo(-0.7)
    expect(r.marks.length).toBeGreaterThanOrEqual(2)
  })
  it('half way between two boxes', () => {
    const a: GRect = { x: 10, y: 10, w: 20, h: 10 }
    const b: GRect = { x: 90, y: 10, w: 20, h: 10 }
    const r = snapBox({ x: 49.2, y: 10, w: 20, h: 10 }, [a, b], 210)
    expect(r.dx).toBeCloseTo(0.8)
  })
})
