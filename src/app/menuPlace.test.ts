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
