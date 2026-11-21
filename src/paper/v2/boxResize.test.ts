import { describe, expect, it } from 'vitest'
import {
  DEAD_PX,
  HOLD_MS,
  ZONE,
  longestWordPx,
  nearestHandle,
  zoneOf,
} from './boxResize'
import { RESIZE_HANDLES } from '../boxHandles'

describe('nearestHandle (TB-20)', () => {
  it('names the side or corner whose dot is closest', () => {
    expect(nearestHandle(300 + 5, 100, 300, 200)).toBe('e')
    expect(nearestHandle(-5, 100, 300, 200)).toBe('w')
    expect(nearestHandle(150, -5, 300, 200)).toBe('n')
    expect(nearestHandle(150, 205, 300, 200)).toBe('s')
    expect(nearestHandle(305, -5, 300, 200)).toBe('ne')
    expect(nearestHandle(-5, 205, 300, 200)).toBe('sw')
  })
  it('lets the text win: a point inside the box is no handle', () => {
    expect(nearestHandle(150, 100, 300, 200)).toBeNull()
    expect(nearestHandle(2, 2, 300, 200)).toBeNull()
    expect(nearestHandle(150, 1, 300, 200)).toBeNull()
    expect(nearestHandle(298, 100, 300, 200)).toBeNull()
  })
  it('gives every point to exactly one handle, even on a tiny box', () => {
    for (const [w, h] of [
      [300, 200],
      [60, 30],
    ]) {
      for (let x = -60; x <= w + 60; x += 3)
        for (let y = -60; y <= h + 60; y += 3) {
          const how = nearestHandle(x, y, w, h)
          const inside = RESIZE_HANDLES.filter((k) => {
            const z = zoneOf(k, w, h)
            return x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1
          })
          if (inside.length === 0) expect(how).toBeNull()
          else expect(inside).toContain(how)
        }
    }
  })
  it('keeps every zone 44 pt and outside the text', () => {
    for (const k of RESIZE_HANDLES) {
      const z = zoneOf(k, 300, 200)
      expect(z.x1 - z.x0).toBe(ZONE)
      expect(z.y1 - z.y0).toBe(ZONE)
      // Not one pixel of the zone lies inside the box.
      expect(z.x0 >= 300 || z.x1 <= 0 || z.y0 >= 200 || z.y1 <= 0).toBe(true)
      // The zone starts exactly at the edge of its own side.
      if (k.includes('e')) expect(z.x0).toBe(300)
      if (k.includes('w')) expect(z.x1).toBe(0)
      if (k.includes('s')) expect(z.y0).toBe(200)
      if (k.includes('n')) expect(z.y1).toBe(0)
    }
  })
})

describe('longestWordPx (minimum width, TB-10 / TB-21)', () => {
  const measure = (text: string) => text.length * 10
  it('is the width of the longest word', () => {
    const w = longestWordPx(
      [{ text: 'a few short words and extraordinary', font: 'x' }],
      measure,
    )
    expect(w).toBe('extraordinary'.length * 10)
  })
  it('measures each text with its own font', () => {
    const w = longestWordPx(
      [
        { text: 'plain longer', font: 'small' },
        { text: 'Big', font: 'large' },
      ],
      (text, font) => text.length * (font === 'large' ? 100 : 1),
    )
    expect(w).toBe(300)
  })
  it('is 0 for an empty box', () => {
    expect(longestWordPx([{ text: '  ', font: 'x' }], measure)).toBe(0)
  })
})

describe('the hold and the dead zone', () => {
  it('uses the spec numbers', () => {
    expect(HOLD_MS).toBe(120)
    expect(DEAD_PX).toBe(4)
  })
})
