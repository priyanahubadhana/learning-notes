import { describe, expect, it } from 'vitest'
import {
  circledNumber,
  cleanShape,
  digitInCircle,
  digitRuns,
  type DigitView,
} from './textPencil'

const circle = (cx: number, cy: number, r: number, n = 40) =>
  Array.from({ length: n + 1 }, (_, i) => ({
    x: cx + Math.cos((i / n) * Math.PI * 2) * r,
    y: cy + Math.sin((i / n) * Math.PI * 2) * r,
  }))

describe('Text tool + Pencil', () => {
  it('a drawn circle becomes a clean ellipse', () => {
    expect(cleanShape(circle(100, 100, 40))?.kind).toBe('ellipse')
  })
  it('a straight stroke becomes a line', () => {
    const line = Array.from({ length: 20 }, (_, i) => ({
      x: 10 + i * 8,
      y: 50 + (i % 2) * 0.5,
    }))
    expect(cleanShape(line)?.kind).toBe('line')
  })
  it('a rectangle stays a rectangle', () => {
    const pts = [
      ...Array.from({ length: 10 }, (_, i) => ({ x: 10 + i * 10, y: 10 })),
      ...Array.from({ length: 10 }, (_, i) => ({ x: 100, y: 10 + i * 6 })),
      ...Array.from({ length: 10 }, (_, i) => ({ x: 100 - i * 10, y: 64 })),
      ...Array.from({ length: 10 }, (_, i) => ({ x: 10, y: 64 - i * 6 })),
    ]
    expect(cleanShape(pts)?.kind).toBe('rect')
  })
  it('a tap or a tiny dot is nothing', () => {
    expect(cleanShape(circle(5, 5, 3))).toBeNull()
  })
  it('numbers 0 to 20 have a circled form, others do not', () => {
    expect(circledNumber(2)).toBe('②')
    expect(circledNumber(20)).toBe('⑳')
    expect(circledNumber(21)).toBeNull()
  })
  it('finds digit runs', () => {
    expect(digitRuns('a 12 b 3')).toEqual([
      { start: 2, end: 4, n: 12 },
      { start: 7, end: 8, n: 3 },
    ])
  })
  it('the digit inside a small ring is picked, a far one is not', () => {
    const view: DigitView = {
      state: {
        doc: {
          descendants: (fn) => fn({ isText: true, text: 'item 7 here' }, 1),
        },
        tr: { insertText: () => ({}) },
      },
      // 10 px per letter from x = 0 (pos 1 is the first letter)
      coordsAtPos: (pos) => ({
        left: (pos - 1) * 10,
        right: (pos - 1) * 10 + 10,
        top: 100,
        bottom: 120,
      }),
      dispatch: () => {},
    }
    // "7" is the 6th letter: x 50..60
    expect(digitInCircle(view, { x: 40, y: 90, w: 40, h: 40 })).toMatchObject({
      from: 6,
      to: 7,
      text: '⑦',
    })
    expect(digitInCircle(view, { x: 200, y: 90, w: 40, h: 40 })).toBeNull()
    expect(digitInCircle(view, { x: 0, y: 0, w: 400, h: 400 })).toBeNull()
  })
})
