import { describe, expect, it } from 'vitest'
import { placeOneBar, type Rect } from './oneBarPlace'

const r = (x: number, y: number, w: number, h: number): Rect => ({
  left: x,
  top: y,
  right: x + w,
  bottom: y + h,
})
const bar = { w: 600, h: 52 }
const frame = r(40, 0, 740, 1100)
const view = r(0, 0, 820, 900)
const hit = (a: Rect, b: Rect) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
const at = (p: { x: number; y: number }) => r(p.x, p.y, bar.w, bar.h)

describe('placeOneBar (the one bar of a selected box)', () => {
  it('goes above the box when there is room', () => {
    const box = r(80, 400, 500, 200)
    const p = placeOneBar({ bar, box, frame, view, others: [] })
    expect(p.where).toBe('above')
    expect(at(p).bottom).toBeLessThanOrEqual(box.top - 16)
  })

  it('goes below the box when there is no room above', () => {
    const box = r(80, 60, 500, 200)
    const p = placeOneBar({ bar, box, frame, view, others: [] })
    expect(p.where).toBe('below')
    expect(at(p).top).toBeGreaterThanOrEqual(box.bottom + 16)
  })

  it('goes to free space only when the box leaves no room around it', () => {
    // The box fills the page: no room above or below. A gap sits at the top.
    const box = r(48, 120, 724, 770)
    const p = placeOneBar({ bar, box, frame, view, others: [] })
    expect(p.where).toBe('free')
    expect(hit(at(p), box)).toBe(false)
  })

  it('never covers words of another box', () => {
    const box = r(80, 400, 500, 200)
    const words = r(60, 300, 600, 60)
    const p = placeOneBar({ bar, box, frame, view, others: [words] })
    expect(hit(at(p), words)).toBe(false)
  })

  it('never goes past the page frame, left or right', () => {
    const wide = r(500, 400, 270, 200)
    const p = placeOneBar({ bar, box: wide, frame, view, others: [] })
    expect(p.x).toBeGreaterThanOrEqual(frame.left + 8)
    expect(p.x + bar.w).toBeLessThanOrEqual(frame.right - 8)
    const left = r(20, 400, 270, 200)
    const q = placeOneBar({ bar, box: left, frame, view, others: [] })
    expect(q.x).toBeGreaterThanOrEqual(frame.left + 8)
  })

  it('stays out of the top 12 px of the screen and inside the view', () => {
    const box = r(80, 20, 500, 200)
    const p = placeOneBar({ bar, box, frame, view, others: [] })
    expect(p.y).toBeGreaterThanOrEqual(12)
    expect(p.y + bar.h).toBeLessThanOrEqual(view.bottom - 12)
  })

  it('a bar nearly as wide as the frame stays inside it (phone)', () => {
    const narrow = r(0, 0, 390, 844)
    const p = placeOneBar({
      bar: { w: 372, h: 52 },
      box: r(16, 300, 358, 200),
      frame: narrow,
      view: narrow,
      others: [],
    })
    expect(p.x).toBeGreaterThanOrEqual(8)
    expect(p.x + 372).toBeLessThanOrEqual(390 - 8)
  })
})
