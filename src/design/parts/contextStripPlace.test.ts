import { describe, expect, it } from 'vitest'
import {
  placeStrip,
  splitStripItems,
  unionRect,
  STRIP_GAP,
  STRIP_MARGIN,
} from './contextStripPlace'

const size = { width: 420, height: 48 }
const vp = { width: 1180, height: 820 }
const inside = (
  p: { left: number; top: number },
  s = size,
  v = vp,
  m = STRIP_MARGIN,
) =>
  p.left >= m &&
  p.top >= m &&
  p.left + s.width <= v.width - m &&
  p.top + s.height <= v.height - m

describe('placeStrip', () => {
  it('goes above the selection with an 8 px gap', () => {
    const t = { left: 500, top: 400, width: 200, height: 40 }
    const p = placeStrip(t, size, vp)
    expect(p.side).toBe('above')
    expect(p.top + size.height + STRIP_GAP).toBe(t.top)
  })
  it('goes below when there is no room above', () => {
    const p = placeStrip(
      { left: 500, top: 20, width: 200, height: 40 },
      size,
      vp,
    )
    expect(p.side).toBe('below')
    expect(p.top).toBe(20 + 40 + STRIP_GAP)
  })
  it('goes beside when neither above nor below fits', () => {
    const tall = { left: 100, top: 2, width: 300, height: 816 }
    const p = placeStrip(tall, size, vp)
    expect(p.side).toBe('right')
    expect(p.left).toBeGreaterThanOrEqual(400 + STRIP_GAP)
    const far = { left: 760, top: 2, width: 300, height: 816 }
    expect(placeStrip(far, size, vp).side).toBe('left')
  })
  it('stays 12 px inside at every edge and corner, both iPad ways and a phone', () => {
    for (const v of [
      { width: 1180, height: 820 },
      { width: 820, height: 1180 },
      { width: 390, height: 844 },
      { width: 320, height: 640 },
    ]) {
      const s = { width: Math.min(420, v.width - 24), height: 48 }
      const w = 140
      const h = 40
      const xs = [2, (v.width - w) / 2, v.width - w - 2]
      const ys = [2, (v.height - h) / 2, v.height - h - 2]
      for (const x of xs)
        for (const y of ys) {
          const t = { left: x, top: y, width: w, height: h }
          const p = placeStrip(t, s, v)
          const where = `${v.width}x${v.height} at ${x},${y}`
          expect(inside(p, s, v), where).toBe(true)
          // Never over the selection unless nothing else fits.
          if (p.side !== 'over') {
            const overlap =
              p.left < t.left + t.width &&
              p.left + s.width > t.left &&
              p.top < t.top + t.height &&
              p.top + s.height > t.top
            expect(overlap, where).toBe(false)
          }
        }
    }
  })
  it('keeps clear of extra rects such as the B / I / U bar', () => {
    const t = { left: 500, top: 400, width: 200, height: 40 }
    const bar = { left: 480, top: 340, width: 240, height: 44 }
    const p = placeStrip(t, size, vp, [bar])
    expect(p.side).toBe('above')
    expect(p.top + size.height + STRIP_GAP).toBeLessThanOrEqual(340)
  })
  it('points the arrow at the selection and not beside', () => {
    const t = { left: 500, top: 400, width: 200, height: 40 }
    const p = placeStrip(t, size, vp)
    expect(p.left + (p.arrowX ?? 0)).toBeCloseTo(600, 0)
    const tall = placeStrip(
      { left: 100, top: 2, width: 300, height: 816 },
      size,
      vp,
    )
    expect(tall.arrowX).toBeNull()
  })
  it('unionRect covers all rects', () => {
    expect(
      unionRect({ left: 10, top: 10, width: 10, height: 10 }, [
        { left: 0, top: 30, width: 5, height: 5 },
      ]),
    ).toEqual({ left: 0, top: 10, width: 20, height: 25 })
  })
})

const item = (id: string, label: string, danger = false, menu = false) => ({
  id,
  label,
  danger,
  menu: menu ? [] : undefined,
})
const five = [
  item('paste', 'Paste', false, true),
  item('copy', 'Copy'),
  item('cut', 'Cut'),
  item('dup', 'Duplicate'),
  item('del', 'Delete', true),
]

describe('splitStripItems', () => {
  it('phone shows at most 4 items, Delete last, the rest in the more menu', () => {
    const r = splitStripItems(five, {
      phone: true,
      maxWidth: 366,
      hasExtra: false,
    })
    expect(r.shown.map((i) => i.id)).toEqual(['paste', 'copy', 'cut', 'del'])
    expect(r.overflow.map((i) => i.id)).toEqual(['dup'])
    expect(r.showMore).toBe(true)
  })
  it('phone with 4 or fewer items has no overflow', () => {
    const r = splitStripItems(five.slice(0, 4), {
      phone: true,
      maxWidth: 366,
      hasExtra: false,
    })
    expect(r.overflow).toEqual([])
    expect(r.showMore).toBe(false)
  })
  it('wide shows everything, and the more button only with extra commands', () => {
    expect(
      splitStripItems(five, { phone: false, maxWidth: 1100, hasExtra: false })
        .showMore,
    ).toBe(false)
    const r = splitStripItems(five, {
      phone: false,
      maxWidth: 1100,
      hasExtra: true,
    })
    expect(r.shown).toHaveLength(5)
    expect(r.showMore).toBe(true)
  })
  it('a narrow tablet drops items from the end, never Delete', () => {
    const r = splitStripItems(five, {
      phone: false,
      maxWidth: 330,
      hasExtra: false,
    })
    expect(r.shown.at(-1)?.id).toBe('del')
    expect(r.overflow.length).toBeGreaterThan(0)
    expect(r.shown.length + r.overflow.length).toBe(5)
  })
})
