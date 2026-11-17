import { describe, expect, it } from 'vitest'
import {
  cleanBarPlace,
  dockStyle,
  placeAfterDrop,
  zoneAt,
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
