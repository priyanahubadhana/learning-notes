import { describe, expect, it } from 'vitest'
import { inside, isLoop, rangeInLoop, type Glyph } from './circleSelect'

const ring = (cx: number, cy: number, rx: number, ry: number, n = 26) =>
  Array.from({ length: n }, (_, i) => {
    const a = Math.PI + (i / 24) * 2 * Math.PI
    return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry }
  })

describe('circle select (F5, F6)', () => {
  it('a closed loop is a circle; a line, a tap and a half circle are not', () => {
    expect(isLoop(ring(100, 100, 30, 12))).toBe(true)
    const line = Array.from({ length: 12 }, (_, i) => ({ x: i * 10, y: 5 }))
    expect(isLoop(line)).toBe(false)
    expect(
      isLoop([
        { x: 1, y: 1 },
        { x: 1, y: 1 },
      ]),
    ).toBe(false)
    expect(isLoop(ring(100, 100, 30, 12, 13))).toBe(false)
  })
  it('a scribble-out zigzag over a word is not a circle (C24, 19 Nov)', () => {
    const zig = Array.from({ length: 11 }, (_, k) => ({
      x: k % 2 ? 190 : 100,
      y: 100 + (18 * k) / 10,
    }))
    expect(isLoop(zig)).toBe(false)
  })
  it('a point is inside the loop or not', () => {
    const r = ring(100, 100, 30, 12)
    expect(inside(r, 100, 100)).toBe(true)
    expect(inside(r, 140, 100)).toBe(false)
  })
  // "Service rate-is on 23-11-2000": one glyph per character, 8 px apart.
  const text = 'Service rate-is on 23-11-2000'
  const glyphs: Glyph[] = [...text].map((c, i) => ({
    pos: i + 1,
    x: 10 + i * 8 + 4,
    y: 100,
    space: c === ' ',
  }))
  const around = (from: number, to: number) =>
    ring((10 + from * 8 + 10 + to * 8) / 2, 100, ((to - from) * 8) / 2 + 1, 14)
  const picked = (from: number, to: number) => {
    const r = rangeInLoop(around(from, to), glyphs)
    return r && text.slice(r[0] - 1, r[1] - 1)
  }
  it('selects exactly what is inside: a word, a dash word, a date, letters', () => {
    expect(picked(8, 15)).toBe('rate-is')
    expect(picked(19, 29)).toBe('23-11-2000')
    expect(picked(3, 5)).toBe('vi')
    expect(picked(0, 7)).toBe('Service')
  })
  it('leaves spaces at the ends out, and nothing inside gives null', () => {
    expect(picked(6, 9)).toBe('e r')
    expect(rangeInLoop(ring(500, 500, 30, 12), glyphs)).toBeNull()
  })
})
