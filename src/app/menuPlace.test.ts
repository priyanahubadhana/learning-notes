import { describe, expect, it } from 'vitest'
import { placeClear } from './menuPlace'

const view = { left: 0, top: 0, right: 820, bottom: 1180 }
describe('placeClear', () => {
  it('stays inside the panel it is limited to', () => {
    const p = placeClear({ w: 208, h: 300 }, { x: 250, y: 200 }, view, {
      left: 0,
      right: 300,
    })
    expect(p.x + 208).toBeLessThanOrEqual(300)
  })
  it('never covers the clear rect (a box and its bar)', () => {
    const clear = { left: 400, top: 300, right: 700, bottom: 500 }
    const p = placeClear(
      { w: 248, h: 300 },
      { x: 450, y: 320 },
      view,
      undefined,
      clear,
    )
    const hit =
      p.x < clear.right &&
      p.x + 248 > clear.left &&
      p.y < clear.bottom &&
      p.y + 300 > clear.top
    expect(hit).toBe(false)
  })
  it('stays inside a frame, going under the clear rect when beside does not fit', () => {
    const clear = { left: 421, top: 300, right: 727, bottom: 500 }
    const frame = { left: 396, right: 753 }
    const p = placeClear(
      { w: 248, h: 300 },
      { x: 450, y: 320 },
      view,
      frame,
      clear,
    )
    expect(p.x).toBeGreaterThanOrEqual(396)
    expect(p.x + 248).toBeLessThanOrEqual(753)
    expect(p.y).toBeGreaterThanOrEqual(500)
  })
})

describe('placeClear and the frame top and bottom (C23 manager review)', () => {
  const crosses = (y: number, h: number, top: number, bottom: number) =>
    !(y + h <= top || y >= bottom || (y >= top && y + h <= bottom))
  it('never straddles the bottom of the frame', () => {
    const frame = { left: 397, right: 753, top: 470, bottom: 972 }
    const box = { left: 690, top: 625, right: 725, bottom: 718 }
    const bar = { left: 530, top: 507, right: 805, bottom: 718 }
    const p = placeClear({ w: 208, h: 360 }, { x: 537, y: 724 }, view, frame, [
      bar,
      box,
    ])
    expect(crosses(p.y, 360, 470, 972)).toBe(false)
    expect(p.x).toBeGreaterThanOrEqual(397)
    expect(p.x + 208).toBeLessThanOrEqual(753)
  })
  it('stays where it opened when that is already inside the frame', () => {
    const frame = { left: 0, right: 820, top: 0, bottom: 1180 }
    const p = placeClear({ w: 208, h: 300 }, { x: 100, y: 200 }, view, frame)
    expect(p).toEqual({ x: 100, y: 200, h: 300 })
  })
})

describe('placeClear in a tight frame (C23 manager review)', () => {
  it('goes inside the frame beside the box, a little shorter, rather than over the bars above the page', () => {
    const frame = {
      left: 397,
      right: 753,
      top: 470,
      bottom: 972,
      clipTop: 157,
      clipBottom: 1168,
    }
    const strip = { left: 530, top: 507, right: 805, bottom: 558 }
    const holder = { left: 651, top: 567, right: 716, bottom: 610 }
    const box = { left: 690, top: 625, right: 725, bottom: 718 }
    const union = { left: 530, top: 507, right: 805, bottom: 718 }
    const p = placeClear(
      { w: 208, h: 360, minH: 220 },
      { x: 537, y: 724 },
      view,
      frame,
      [union, strip, holder, box],
    )
    expect(p.y).toBeGreaterThanOrEqual(470)
    expect(p.y + p.h).toBeLessThanOrEqual(972)
    expect(p.h).toBeGreaterThanOrEqual(220)
    const r = { left: p.x, top: p.y, right: p.x + 208, bottom: p.y + p.h }
    for (const b of [strip, holder, box])
      expect(
        r.left < b.right &&
          r.right > b.left &&
          r.top < b.bottom &&
          r.bottom > b.top,
      ).toBe(false)
  })
})
