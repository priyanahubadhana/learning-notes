import { describe, expect, it } from 'vitest'
import { STRIDE, type Stroke } from '../core/inkTypes'
import { eraseStroke, shapeToInk } from './eraser'
import { xy } from './geometry'

/** C2: a shape touched by Standard or Precise becomes ordinary ink, then is cut. */

function shape(kind: 'rect' | 'ellipse', pts: [number, number][]): Stroke {
  return {
    id: 'sh',
    at: 1,
    kind: 'ink',
    style: {} as Stroke['style'],
    pts: pts.flatMap(([x, y]) => [x, y, 0.5, 0, 0, 0]),
    bw: 1000,
    shape: kind,
    fill: true,
  }
}

const rect = shape('rect', [
  [0.1, 0.1],
  [0.3, 0.1],
  [0.3, 0.2],
  [0.1, 0.2],
  [0.1, 0.1],
])
const oval = shape(
  'ellipse',
  Array.from({ length: 73 }, (_, i) => {
    const a = (i / 72) * Math.PI * 2
    return [0.2 + Math.cos(a) * 0.1, 0.2 + Math.sin(a) * 0.05] as [
      number,
      number,
    ]
  }),
)

describe('shapeToInk', () => {
  it('drops the shape and fill flags and adds points along the outline', () => {
    const ink = shapeToInk(rect, 0.01)
    expect(ink.shape).toBeUndefined()
    expect(ink.fill).toBeUndefined()
    expect(ink.id).toBe(rect.id)
    expect(ink.pts.length / STRIDE).toBeGreaterThan(30)
    // The outline is the same: every point lies on the rectangle's edge.
    for (const p of xy(ink)) {
      const onX = Math.abs(p.x - 0.1) < 1e-6 || Math.abs(p.x - 0.3) < 1e-6
      const onY = Math.abs(p.y - 0.1) < 1e-6 || Math.abs(p.y - 0.2) < 1e-6
      expect(onX || onY).toBe(true)
    }
  })
})

describe('erasing part of a shape', () => {
  for (const mode of ['standard', 'precise'] as const) {
    it(`${mode}: cuts a gap in an oval's edge and nothing else moves`, () => {
      const out = eraseStroke(oval, [{ x: 0.3, y: 0.2 }], 0.015, mode)
      expect(out.length).toBeGreaterThanOrEqual(1)
      for (const piece of out) expect(piece.shape).toBeUndefined()
      // No remaining point is near the cut; every remaining point is on the oval.
      for (const piece of out) {
        for (const p of xy(piece)) {
          expect(Math.hypot(p.x - 0.3, p.y - 0.2)).toBeGreaterThan(0.014)
          const e = ((p.x - 0.2) / 0.1) ** 2 + ((p.y - 0.2) / 0.05) ** 2
          expect(Math.abs(e - 1)).toBeLessThan(0.02)
        }
      }
      // The opposite side of the oval is still there.
      const all = out.flatMap((s) => xy(s))
      expect(all.some((p) => Math.abs(p.x - 0.1) < 0.005)).toBe(true)
    })

    it(`${mode}: cutting a rectangle's corner keeps both straight sides`, () => {
      const out = eraseStroke(rect, [{ x: 0.3, y: 0.1 }], 0.015, mode)
      expect(out.length).toBeGreaterThanOrEqual(1)
      for (const piece of out) {
        expect(piece.shape).toBeUndefined()
        for (const p of xy(piece)) {
          const onX = Math.abs(p.x - 0.1) < 1e-3 || Math.abs(p.x - 0.3) < 1e-3
          const onY = Math.abs(p.y - 0.1) < 1e-3 || Math.abs(p.y - 0.2) < 1e-3
          // Still on the original outline: nothing was joined by a slanted line.
          expect(onX || onY).toBe(true)
          expect(Math.hypot(p.x - 0.3, p.y - 0.1)).toBeGreaterThan(0.014)
        }
      }
      // The far corner is untouched.
      const all = out.flatMap((s) => xy(s))
      expect(all.some((p) => p.x === 0.1 && p.y === 0.2)).toBe(true)
    })
  }

  it('a shape the eraser does not touch is returned as the same object', () => {
    const out = eraseStroke(rect, [{ x: 0.9, y: 0.9 }], 0.01, 'precise')
    expect(out[0]).toBe(rect)
  })

  it('a plain stroke keeps its own kind of record (no shape added)', () => {
    const out = eraseStroke(rect, [{ x: 0.2, y: 0.1 }], 0.01, 'precise')
    expect(out.every((p) => p.shape === undefined)).toBe(true)
  })
})
