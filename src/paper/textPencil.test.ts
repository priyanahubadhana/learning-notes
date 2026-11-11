import { describe, expect, it } from 'vitest'
import {
  bigEnough,
  circledNumber,
  cleanShape,
  digitInCircle,
  digitRuns,
  overlapsWriting,
  WRITING_GAP_MS,
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

describe('Text tool + Pencil: handwriting is not misread', () => {
  const pts = (f: (t: number) => { x: number; y: number }, n = 40) =>
    Array.from({ length: n + 1 }, (_, i) => f(i / n))
  it('a clean circle scores high, a rough ring lower but still passes', () => {
    const c = cleanShape(circle(100, 100, 40))
    expect(c?.score).toBeGreaterThan(0.9)
    const rough = cleanShape(
      pts((t) => ({
        x: 100 + Math.cos(t * 6.28) * (40 + Math.sin(t * 25) * 3),
        y: 100 + Math.sin(t * 6.28) * (40 + Math.cos(t * 19) * 3),
      })),
    )
    expect(rough?.kind).toBe('ellipse')
    expect(rough!.score).toBeGreaterThan(0.55)
  })
  it('a wavy line, a letter S and a zigzag are not shapes', () => {
    const wavy = pts((t) => ({ x: t * 200, y: Math.sin(t * 12) * 14 }))
    const s = pts((t) => ({
      x: 50 + Math.sin(t * 6.28) * 25,
      y: t * 80,
    }))
    const zig = pts((t) => ({ x: t * 150, y: (Math.floor(t * 8) % 2) * 40 }))
    expect(cleanShape(wavy)).toBeNull()
    expect(cleanShape(s)).toBeNull()
    expect(cleanShape(zig)).toBeNull()
  })
  it('a small ring (the letter o) is too small for blank paper, a big one is not', () => {
    const o = cleanShape(circle(50, 50, 16))! // 32 px across
    expect(o.kind).toBe('ellipse')
    expect(bigEnough(o, 32)).toBe(false)
    expect(bigEnough(cleanShape(circle(50, 50, 40))!, 80)).toBe(true)
  })
  it('a short dash is not a line on paper', () => {
    const dash = Array.from({ length: 12 }, (_, i) => ({ x: i * 4, y: 0 }))
    const l = cleanShape(dash)!
    expect(l.kind).toBe('line')
    expect(bigEnough(l, 44)).toBe(false)
  })
  it('a stroke next to a pen stroke made a moment ago is handwriting', () => {
    const b = { x: 100, y: 100, w: 60, h: 60 }
    const recent = [{ at: 1000, x: 170, y: 100, w: 20, h: 40 }]
    expect(overlapsWriting(b, recent, 1500)).toBe(true)
    expect(overlapsWriting(b, recent, 1000 + WRITING_GAP_MS + 1)).toBe(false)
    expect(
      overlapsWriting(b, [{ at: 1000, x: 600, y: 600, w: 20, h: 20 }], 1100),
    ).toBe(false)
  })
  it('circled numbers: 0 to 20 map, others and long numbers do not', () => {
    const all = Array.from({ length: 21 }, (_, n) => circledNumber(n))
    expect(all.every(Boolean)).toBe(true)
    expect(new Set(all).size).toBe(21)
    expect(circledNumber(-1)).toBeNull()
    expect(circledNumber(1.5)).toBeNull()
    expect(digitRuns('page 2024 and 123')).toEqual([])
    expect(digitRuns('a 7,8')).toHaveLength(2)
  })
})
