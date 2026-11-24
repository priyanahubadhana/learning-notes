import { describe, expect, it } from 'vitest'
import {
  cleanBarPlace,
  dockStyle,
  placeAfterDrop,
  zoneAt,
  zoneForBar,
  cutByPanels,
  barFits,
  clampFree,
  ZONE_SIDE,
  isTap,
  TAP_SLOP,
  HOLD_AFTER_MS,
  type BarPlace,
} from './oneBarDockModel'

const area = { left: 100, top: 60, right: 900, bottom: 700 }

describe('dock zones (the bar can land on any of the four sides)', () => {
  it('finds the side the pointer is near, none in the middle', () => {
    expect(zoneAt({ x: 500, y: 70 }, area)).toBe('top')
    expect(zoneAt({ x: 500, y: 690 }, area)).toBe('bottom')
    expect(zoneAt({ x: 110, y: 380 }, area)).toBe('left')
    expect(zoneAt({ x: 890, y: 380 }, area)).toBe('right')
    expect(zoneAt({ x: 500, y: 380 }, area)).toBeNull()
  })
  it('a corner goes to the nearer side', () => {
    expect(zoneAt({ x: 108, y: 66 }, area)).toBe('top')
    expect(zoneAt({ x: 104, y: 120 }, area)).toBe('left')
  })
})

describe('docked bars lie flat on top and bottom, upright on left and right', () => {
  it('top and bottom are horizontal, centred, inside the area', () => {
    const t = dockStyle('top', area)
    expect(t.vertical).toBe(false)
    expect(t.css.top).toBe(68)
    const b = dockStyle('bottom', area)
    expect(typeof b.css.bottom).toBe('number')
    expect(b.vertical).toBe(false)
  })
  it('left and right are vertical (like the mic bar)', () => {
    expect(dockStyle('left', area).vertical).toBe(true)
    expect(dockStyle('right', area).vertical).toBe(true)
    expect(dockStyle('left', area).css.left).toBe(108)
  })
})

describe('where a drop ends up', () => {
  it('a drop in a zone docks (and pins) the bar', () => {
    expect(
      placeAfterDrop({ x: 500, y: 690 }, { left: 1, top: 2 }, area),
    ).toEqual({ side: 'bottom', left: 1, top: 2 })
  })
  it('a drop elsewhere is a free place', () => {
    expect(
      placeAfterDrop({ x: 500, y: 380 }, { left: 300, top: 200 }, area),
    ).toEqual({ side: 'free', left: 300, top: 200 })
  })
})

describe('what is kept on the device', () => {
  it('keeps a good place, drops anything else', () => {
    expect(
      cleanBarPlace({ side: 'left', left: 1, top: 2, pinned: true }),
    ).toEqual({
      side: 'left',
      left: 1,
      top: 2,
      pinned: true,
    })
    expect(cleanBarPlace({ side: 'middle' })).toBeNull()
    expect(cleanBarPlace(null)).toBeNull()
    expect(cleanBarPlace('x')).toBeNull()
  })
})

describe('issue #61: the sides dock from a finger on an iPad', () => {
  it('a finger 90 px from the left or right edge still docks there', () => {
    expect(zoneAt({ x: 100 + 90, y: 380 }, area)).toBe('left')
    expect(zoneAt({ x: 900 - 90, y: 380 }, area)).toBe('right')
    expect(ZONE_SIDE).toBeGreaterThanOrEqual(90)
  })
  it('a finger past the edge (cancelled touch, dragged off) docks too', () => {
    expect(zoneAt({ x: 915, y: 380 }, area)).toBe('right')
    expect(zoneAt({ x: 90, y: 380 }, area)).toBe('left')
  })
  it('top and bottom keep their narrower zone', () => {
    expect(zoneAt({ x: 500, y: 60 + 90 }, area)).toBeNull()
  })
})

describe('issue #60: a panel over the page takes its room', () => {
  const sidebar = { left: 0, top: 0, right: 300, bottom: 900 }
  it('the area shrinks to the page column beside a left panel', () => {
    expect(
      cutByPanels({ left: 12, top: 60, right: 800, bottom: 700 }, [sidebar]),
    ).toEqual({ left: 300, top: 60, right: 800, bottom: 700 })
  })
  it('a right panel takes the right; a panel off the page changes nothing', () => {
    const a = { left: 12, top: 60, right: 800, bottom: 700 }
    expect(
      cutByPanels(a, [{ left: 560, top: 0, right: 900, bottom: 900 }]).right,
    ).toBe(560)
    expect(
      cutByPanels(a, [{ left: 0, top: 0, right: 8, bottom: 900 }]),
    ).toEqual(a)
  })
  it('a sheet over most of the width is left alone', () => {
    const a = { left: 0, top: 60, right: 400, bottom: 700 }
    expect(
      cutByPanels(a, [{ left: 0, top: 0, right: 400, bottom: 900 }]),
    ).toEqual(a)
  })
  it('a docked bar re-docks to the new column edges', () => {
    const cut = cutByPanels({ left: 12, top: 60, right: 800, bottom: 700 }, [
      sidebar,
    ])
    expect(dockStyle('left', cut).css.left).toBe(308)
    expect(dockStyle('top', cut).css.left).toBe((300 + 800) / 2)
  })
  it('a pinned bar folds when its place is gone, and comes back with the room', () => {
    const bar = { w: 640, h: 56 }
    const wide = { left: 12, top: 60, right: 800, bottom: 700 }
    expect(barFits(wide, bar)).toBe(true)
    expect(
      barFits(
        cutByPanels(wide, [{ left: 0, top: 0, right: 300, bottom: 900 }]),
        bar,
      ),
    ).toBe(false)
  })
  it('a free bar is kept inside the column, never over the panel', () => {
    const col = { left: 300, top: 60, right: 800, bottom: 700 }
    expect(clampFree({ left: 40, top: 100 }, col, { w: 200, h: 56 })).toEqual({
      left: 308,
      top: 100,
    })
  })
})

describe('issue #63: a first show at a pinned place', () => {
  const pin: BarPlace = { side: 'bottom', left: 0, top: 0, pinned: true }
  it('a docked pin always has a place to stand, whatever left and top hold', () => {
    const s = dockStyle(pin.side as 'bottom', area)
    expect(s.css.bottom).toBeDefined()
    expect(s.css.left).toBe(500)
  })
  it('a free pin saved before the page had room is brought inside the area', () => {
    expect(
      clampFree({ left: 5000, top: -40 }, area, { w: 300, h: 56 }),
    ).toEqual({ left: 592, top: 68 })
  })
})

describe('issue #62: a tap on the grip is a tap, not a drop', () => {
  it('a touch that stays within the slop is a tap', () => {
    expect(isTap({ x: 100, y: 100 }, { x: 100, y: 100 })).toBe(true)
    expect(isTap({ x: 100, y: 100 }, { x: 104, y: 103 })).toBe(true)
  })
  it('a touch that travels past the slop is a drag', () => {
    expect(isTap({ x: 100, y: 100 }, { x: 100 + TAP_SLOP, y: 100 })).toBe(false)
    expect(isTap({ x: 100, y: 100 }, { x: 80, y: 130 })).toBe(false)
  })
  it('the page stays shielded for a moment after the grip is let go', () => {
    expect(HOLD_AFTER_MS).toBeGreaterThanOrEqual(400)
  })
})

describe('zoneForBar (#61: a page-wide bar pushed against a side docks there)', () => {
  // A bar almost as wide as the page, held at the right edge (free() stops it at 8 px).
  const wide = { left: 108, top: 300, right: 892, bottom: 360 }
  it('docks right: held against the right edge, pushed right, the finger still in the left zone', () => {
    expect(zoneAt({ x: 130, y: 330 }, area)).toBe('left')
    expect(zoneForBar(wide, { x: 40, y: 0 }, area, { x: 130, y: 330 })).toBe(
      'right',
    )
  })
  it('docks left: held against the left edge, pushed left, the finger in the right zone', () => {
    expect(zoneForBar(wide, { x: -40, y: 0 }, area, { x: 870, y: 330 })).toBe(
      'left',
    )
  })
  it('docks top and bottom the same way', () => {
    const tall = { left: 400, top: 68, right: 460, bottom: 692 }
    expect(zoneForBar(tall, { x: 0, y: 40 }, area, { x: 430, y: 70 })).toBe(
      'bottom',
    )
    expect(zoneForBar(tall, { x: 0, y: -40 }, area, { x: 430, y: 690 })).toBe(
      'top',
    )
  })
  it('a held, pushed bar with the finger in the middle of the page is a free drop (B2)', () => {
    expect(
      zoneForBar(wide, { x: 287, y: 0 }, area, { x: 500, y: 330 }),
    ).toBeNull()
  })
  it('a push of 10 px, or a bar not held against the edge, stays on the pointer', () => {
    expect(
      zoneForBar(wide, { x: 10, y: 0 }, area, { x: 500, y: 330 }),
    ).toBeNull()
    const mid = { left: 300, top: 300, right: 500, bottom: 360 }
    expect(
      zoneForBar(mid, { x: 300, y: 0 }, area, { x: 320, y: 330 }),
    ).toBeNull()
  })
  it('falls back to the pointer zone as before', () => {
    const bar = { left: 110, top: 300, right: 300, bottom: 360 }
    expect(zoneForBar(bar, { x: 0, y: 0 }, area, { x: 120, y: 330 })).toBe(
      'left',
    )
    expect(
      zoneForBar(bar, { x: 30, y: 0 }, area, { x: 500, y: 330 }),
    ).toBeNull()
  })
  it('works without a pointer', () => {
    expect(zoneForBar(wide, { x: 40, y: 0 }, area)).toBe('right')
    expect(zoneForBar(wide, { x: 5, y: 0 }, area)).toBeNull()
  })
})
