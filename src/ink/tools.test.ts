import { describe, expect, it } from 'vitest'
import { STRIDE, type Stroke } from '../core/inkTypes'
import { eraseStroke } from './eraser'
import {
  advanceTarget,
  nextLine,
  space,
  targetSize,
  toPad,
  toPage,
} from './magnifier'
import {
  angleDegrees,
  nearestEdge,
  newRuler,
  projectOnEdge,
  RULER_H,
  rulerEdges,
  snapAngle,
} from './ruler'
import { shapeFromDrag } from './shapes'
import { tapeStyle } from './style'

const A = { x: 100, y: 100 }

describe('shapeFromDrag (the Shapes tool)', () => {
  it('ignores a tiny drag', () => {
    expect(shapeFromDrag('rect', A, { x: 102, y: 101 }, true)).toBeNull()
  })

  it('draws a line and snaps it to 45 degrees when close', () => {
    const s = shapeFromDrag('line', A, { x: 200, y: 103 }, true)!
    expect(s.kind).toBe('line')
    expect(s.closed).toBe(false)
    expect(s.pts[1].y).toBeCloseTo(100, 5)
    const free = shapeFromDrag('line', A, { x: 200, y: 103 }, false)!
    expect(free.pts[1]).toEqual({ x: 200, y: 103 })
  })

  it('draws an arrow with a head at the end', () => {
    const s = shapeFromDrag('arrow', A, { x: 300, y: 100 }, true)!
    expect(s.kind).toBe('arrow')
    expect(s.pts).toHaveLength(5)
    expect(s.pts[1]).toEqual({ x: 300, y: 100 })
    // Both barbs lie behind the tip, one above and one below the shaft.
    expect(s.pts[2].x).toBeLessThan(300)
    expect(s.pts[2].y).not.toBe(s.pts[4].y)
  })

  it('fills the box between the two corners, in any drag direction', () => {
    const s = shapeFromDrag(
      'rect',
      { x: 200, y: 200 },
      { x: 100, y: 150 },
      false,
    )!
    expect(s.kind).toBe('rect')
    expect(s.closed).toBe(true)
    const xs = s.pts.map((p) => p.x)
    const ys = s.pts.map((p) => p.y)
    expect([Math.min(...xs), Math.max(...xs)]).toEqual([100, 200])
    expect([Math.min(...ys), Math.max(...ys)]).toEqual([150, 200])
    // Closed: the last point repeats the first.
    expect(s.pts[0]).toEqual(s.pts[s.pts.length - 1])
  })

  it('makes a square or circle when nearly square, if asked', () => {
    const sq = shapeFromDrag('rect', A, { x: 200, y: 195 }, true)!
    const w =
      Math.max(...sq.pts.map((p) => p.x)) - Math.min(...sq.pts.map((p) => p.x))
    const h =
      Math.max(...sq.pts.map((p) => p.y)) - Math.min(...sq.pts.map((p) => p.y))
    expect(w).toBeCloseTo(h, 5)
    const oval = shapeFromDrag('ellipse', A, { x: 300, y: 150 }, false)!
    expect(oval.kind).toBe('ellipse')
    expect(oval.pts.length).toBeGreaterThan(40)
  })

  it('makes a triangle with its tip at the top middle', () => {
    const s = shapeFromDrag('triangle', A, { x: 200, y: 200 }, false)!
    expect(s.kind).toBe('triangle')
    expect(s.pts[0]).toEqual({ x: 150, y: 100 })
  })
})

describe('tape', () => {
  const tape = (): Stroke => ({
    id: 't',
    at: 0,
    kind: 'tape',
    style: tapeStyle(),
    pts: [
      0.1, 0.1, 0.5, 0, 0, 0, 0.3, 0.1, 0.5, 0, 0, 0, 0.3, 0.2, 0.5, 0, 0, 0,
      0.1, 0.2, 0.5, 0, 0, 0,
    ].slice(0, 4 * STRIDE),
    bw: 800,
    shape: 'rect',
    fill: true,
  })

  it('is solid, so it hides what is under it', () => {
    expect(tapeStyle().opacity).toBe(1)
  })

  it('is taken off whole by the eraser, even when only the inside is touched', () => {
    // The middle of the box is not near any edge point.
    expect(
      eraseStroke(tape(), [{ x: 0.2, y: 0.15 }], 0.01, 'standard'),
    ).toEqual([])
    expect(
      eraseStroke(tape(), [{ x: 0.9, y: 0.9 }], 0.01, 'precise'),
    ).toHaveLength(1)
  })
})

describe('ruler', () => {
  const flat = { cx: 300, cy: 200, len: 400, angle: 0 }

  it('has two long edges on either side of its centre line', () => {
    const [top, bottom] = rulerEdges(flat)
    expect(top.a).toEqual({ x: 100, y: 200 - RULER_H / 2 })
    expect(top.b).toEqual({ x: 500, y: 200 - RULER_H / 2 })
    expect(bottom.a.y).toBe(200 + RULER_H / 2)
  })

  it('sticks a pen that starts near an edge, and only that one', () => {
    const near = { x: 250, y: 200 + RULER_H / 2 + 10 }
    const edge = nearestEdge(near, flat)!
    expect(edge.a.y).toBe(200 + RULER_H / 2)
    // Slides along: any later point lands on the edge line, inside its length.
    expect(projectOnEdge({ x: 260, y: 400 }, edge)).toEqual({
      x: 260,
      y: 200 + RULER_H / 2,
    })
    expect(projectOnEdge({ x: 9999, y: 0 }, edge).x).toBe(500)
    expect(nearestEdge({ x: 250, y: 400 }, flat)).toBeNull()
  })

  it('works when turned', () => {
    const turned = { ...flat, angle: Math.PI / 2 }
    const [left, right] = rulerEdges(turned)
    expect(left.a.x).toBeCloseTo(300 + RULER_H / 2, 5)
    expect(right.a.x).toBeCloseTo(300 - RULER_H / 2, 5)
    expect(angleDegrees(turned)).toBe(90)
  })

  it('clicks to 0, 45, 90 and 135 degrees when close', () => {
    expect(snapAngle((44 * Math.PI) / 180)).toBeCloseTo(Math.PI / 4, 9)
    expect(snapAngle((30 * Math.PI) / 180)).toBeCloseTo((30 * Math.PI) / 180, 9)
    expect(angleDegrees({ ...flat, angle: -Math.PI / 4 })).toBe(135)
  })

  it('starts flat, in view', () => {
    const r = newRuler(800, 1000)
    expect(r.angle).toBe(0)
    expect(r.cy).toBeGreaterThan(1000)
    expect(r.len).toBeLessThanOrEqual(560)
  })
})

describe('magnifier', () => {
  const pad = { w: 600, h: 140 }
  const target = { x: 50, y: 400 }

  it('shrinks what is written by the zoom and places it in the box', () => {
    expect(targetSize(pad, 3)).toEqual({ w: 200, h: 140 / 3 })
    expect(toPage({ x: 300, y: 70 }, target, 3)).toEqual({
      x: 150,
      y: 400 + 70 / 3,
    })
    const back = toPad(toPage({ x: 123, y: 45 }, target, 4), target, 4)
    expect(back.x).toBeCloseTo(123, 9)
    expect(back.y).toBeCloseTo(45, 9)
  })

  it('moves on when the writing nears the right edge, never past the page', () => {
    const early = [{ x: 100, y: 50 }]
    expect(advanceTarget(early, pad, target, 3, 800)).toBeNull()
    const late = [{ x: 500, y: 50 }]
    expect(advanceTarget(late, pad, target, 3, 800)).toEqual({
      x: 50 + 200 * 0.6,
      y: 400,
    })
    // Near the end of the page it stops at the last place that fits.
    const end = advanceTarget(late, pad, { x: 590, y: 400 }, 3, 800)
    expect(end).toEqual({ x: 600, y: 400 })
    expect(advanceTarget(late, pad, { x: 600, y: 400 }, 3, 800)).toBeNull()
  })

  it('Space and Next line move the box', () => {
    expect(space(pad, target, 2)).toEqual({ x: 50 + (600 / 2) * 0.25, y: 400 })
    const line = nextLine(pad, target, 2, 24)
    expect(line.x).toBe(24)
    expect(line.y).toBeCloseTo(400 + (140 / 2) * 0.9, 9)
  })
})
