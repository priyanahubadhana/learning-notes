import { describe, expect, it } from 'vitest'
import { placeBeside, type Rect } from './place'

const screens = [
  { width: 1180, height: 820 },
  { width: 820, height: 1180 },
  { width: 390, height: 844 },
]
const widths = [304, 376]
const T = { w: 120, h: 60 }

function overlaps(a: Rect, b: Rect) {
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  )
}

describe('placeBeside', () => {
  it('prefers right, then left, below, above', () => {
    const vp = { width: 1180, height: 820 }
    const size = { width: 304, height: 300 }
    expect(
      placeBeside({ left: 100, top: 100, width: 100, height: 40 }, size, vp)
        .side,
    ).toBe('right')
    expect(
      placeBeside({ left: 1000, top: 100, width: 100, height: 40 }, size, vp)
        .side,
    ).toBe('left')
    const narrow = { width: 390, height: 844 }
    expect(
      placeBeside({ left: 20, top: 100, width: 350, height: 40 }, size, narrow)
        .side,
    ).toBe('below')
    expect(
      placeBeside({ left: 20, top: 700, width: 350, height: 40 }, size, narrow)
        .side,
    ).toBe('above')
  })
  it('aligns top with target when it fits', () => {
    const p = placeBeside(
      { left: 100, top: 200, width: 100, height: 40 },
      { width: 304, height: 300 },
      screens[0],
    )
    expect(p).toEqual({ left: 208, top: 200, side: 'right' })
  })
  for (const vp of screens) {
    for (const width of widths) {
      it(`edges and corners inside ${vp.width}x${vp.height}, width ${width}`, () => {
        const height = 300
        const xs = [0, vp.width / 2 - T.w / 2, vp.width - T.w]
        const ys = [0, vp.height / 2 - T.h / 2, vp.height - T.h]
        for (const left of xs) {
          for (const top of ys) {
            const target = { left, top, width: T.w, height: T.h }
            const p = placeBeside(target, { width, height }, vp)
            const card = { left: p.left, top: p.top, width, height }
            if (width + 16 <= vp.width) {
              expect(card.left).toBeGreaterThanOrEqual(8)
              expect(card.left + width).toBeLessThanOrEqual(vp.width - 8)
            }
            expect(card.top).toBeGreaterThanOrEqual(8)
            expect(card.top + height).toBeLessThanOrEqual(vp.height - 8)
            // Does any side have room? Then no overlap.
            const fits =
              vp.width - 16 - (left + T.w) - 8 >= width ||
              left - 16 >= width ||
              vp.height - 16 - (top + T.h) - 8 >= height + 0 ||
              top - 16 >= height
            if (fits) expect(overlaps(card, target)).toBe(false)
          }
        }
      })
    }
  }
  it('screen smaller than the card: clamped, may overlap', () => {
    const p = placeBeside(
      { left: 5, top: 5, width: 100, height: 40 },
      { width: 376, height: 300 },
      { width: 300, height: 250 },
    )
    expect(p.left).toBe(8)
    expect(p.top).toBe(8)
  })
})
