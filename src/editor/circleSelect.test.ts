import { describe, expect, it } from 'vitest'
import {
  glyphInLoop,
  inside,
  isLoop,
  rangeInLoop,
  type Glyph,
} from './circleSelect'

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
  describe('generous: a letter counts when about half its box is inside', () => {
    // Letters 10 wide, 16 tall, centred on (100, 100); a square loop whose
    // right edge cuts the letter box at x = edge.
    const g: Glyph = { pos: 1, x: 100, y: 100, w: 10, h: 16, space: false }
    const square = (right: number) => [
      { x: 0, y: 80 },
      { x: right, y: 80 },
      { x: right, y: 120 },
      { x: 0, y: 120 },
    ]
    it('counts with half or more inside, even if the centre is just outside', () => {
      expect(glyphInLoop(square(103), g)).toBe(true) // 8 of 10 wide in
      expect(glyphInLoop(square(101), g)).toBe(true) // 2 of 3 columns in
    })
    it('does not count with only a sliver inside', () => {
      expect(glyphInLoop(square(97), g)).toBe(false)
      expect(glyphInLoop(square(90), g)).toBe(false)
    })
    it('a letter whose centre is inside but half is not still follows the box', () => {
      // Loop covers only the top 4 px of the letter box: the centre is out.
      const top = [
        { x: 90, y: 90 },
        { x: 110, y: 90 },
        { x: 110, y: 96 },
        { x: 90, y: 96 },
      ]
      expect(glyphInLoop(top, g)).toBe(false)
    })
    it('without a box only the centre counts (older callers)', () => {
      expect(
        glyphInLoop(square(103), { pos: 1, x: 100, y: 100, space: false }),
      ).toBe(true)
      expect(
        glyphInLoop(square(97), { pos: 1, x: 100, y: 100, space: false }),
      ).toBe(false)
    })
    it('rangeInLoop picks the half-covered word to its end', () => {
      const text = 'one two three'
      const gl: Glyph[] = [...text].map((c, i) => ({
        pos: i + 1,
        x: 10 * i + 5,
        y: 100,
        w: 10,
        h: 16,
        space: c === ' ',
      }))
      // Loop edge cuts through the middle of "three" (starts at x = 80).
      const loop = [
        { x: 40, y: 80 },
        { x: 105, y: 80 },
        { x: 105, y: 120 },
        { x: 40, y: 120 },
      ]
      expect(rangeInLoop(loop, gl)).toEqual([5, 11]) // "two th"
    })
  })
})
