import { describe, expect, it } from 'vitest'
import {
  cardAnchor,
  clampInside,
  defaultPlace,
  dropZones,
  isPillPlace,
  nearestEdge,
  nudgePlace,
  positionOf,
  snapPlace,
  type Box,
} from './pillPlace'

const room: Box = { left: 8, top: 100, width: 800, height: 900 }
const pill = { width: 300, height: 52 }
const tall = { width: 52, height: 300 }

describe('where the options pill sits', () => {
  it('the default is next to the bar (top, or bottom for a bottom bar)', () => {
    expect(defaultPlace(false)).toEqual({ edge: 'top', along: 0.5 })
    expect(defaultPlace(true)).toEqual({ edge: 'bottom', along: 0.5 })
  })

  it('puts a pill on each edge, and along it', () => {
    expect(positionOf({ edge: 'top', along: 0.5 }, pill, room)).toEqual({
      x: 8 + 250,
      y: 100,
    })
    expect(positionOf({ edge: 'bottom', along: 0 }, pill, room)).toEqual({
      x: 8,
      y: 100 + 900 - 52,
    })
    expect(positionOf({ edge: 'left', along: 1 }, tall, room)).toEqual({
      x: 8,
      y: 100 + 600,
    })
    expect(positionOf({ edge: 'right', along: 0.5 }, tall, room)).toEqual({
      x: 8 + 800 - 52,
      y: 100 + 300,
    })
  })

  it('a pill bigger than the room stays at the start of the edge', () => {
    const big = { width: 2000, height: 52 }
    expect(positionOf({ edge: 'top', along: 0.7 }, big, room).x).toBe(8)
  })

  it('snaps to the nearest edge (by the pill own sides)', () => {
    expect(nearestEdge(250, 104, pill, room)).toBe('top')
    expect(nearestEdge(250, 940, pill, room)).toBe('bottom')
    expect(nearestEdge(12, 500, pill, room)).toBe('left')
    expect(nearestEdge(500, 500, pill, room)).toBe('right')
  })

  it('a drop keeps the place along the edge', () => {
    const p = snapPlace(158, 104, pill, room)
    expect(p.edge).toBe('top')
    expect(p.along).toBeCloseTo(0.3, 1)
    const q = snapPlace(750, 100 + 300, tall, room)
    expect(q.edge).toBe('right')
    expect(q.along).toBeCloseTo(0.5, 1)
    // Far outside is held to 0..1.
    expect(snapPlace(-500, 104, pill, room).along).toBe(0)
  })

  it('shows a drop zone on every edge', () => {
    const zones = dropZones(room)
    expect(Object.keys(zones).sort()).toEqual([
      'bottom',
      'left',
      'right',
      'top',
    ])
    expect(zones.top.width).toBe(800)
    expect(zones.left.height).toBe(900)
  })

  it('a dragged pill is held inside the room', () => {
    expect(clampInside(-50, -50, pill, room)).toEqual({ x: 8, y: 100 })
    expect(clampInside(5000, 5000, pill, room)).toEqual({
      x: 8 + 800 - 300,
      y: 100 + 900 - 52,
    })
  })

  it('arrow keys move along the edge, or across to another edge', () => {
    const top = { edge: 'top', along: 0.5 } as const
    expect(nudgePlace(top, 'ArrowRight').along).toBeCloseTo(0.6)
    expect(nudgePlace(top, 'ArrowLeft').along).toBeCloseTo(0.4)
    expect(nudgePlace(top, 'ArrowDown').edge).toBe('bottom')
    expect(nudgePlace(top, 'ArrowLeft', 1).along).toBe(0)
    const left = { edge: 'left', along: 0.5 } as const
    expect(nudgePlace(left, 'ArrowDown').along).toBeCloseTo(0.6)
    expect(nudgePlace(left, 'ArrowRight').edge).toBe('right')
  })

  it('checks a saved place', () => {
    expect(isPillPlace(null)).toBe(true)
    expect(isPillPlace({ edge: 'left', along: 0.3 })).toBe(true)
    expect(isPillPlace({ edge: 'middle', along: 0.3 })).toBe(false)
    expect(isPillPlace({ edge: 'left', along: 2 })).toBe(false)
    expect(isPillPlace('left')).toBe(false)
  })

  it('puts the card beside the pill, always inside the screen', () => {
    const screen = { width: 1000, height: 800 }
    const below = cardAnchor({ x: 600, y: 120 }, pill, 'top', screen)
    expect(below.top).toBe(120 + 52 + 6)
    expect(below.left).toBeLessThanOrEqual(1000 - 340 - 8)
    const above = cardAnchor({ x: 20, y: 700 }, pill, 'bottom', screen)
    expect(above.bottom).toBe(800 - 700 + 6)
    expect(above.left).toBe(20)
    const right = cardAnchor({ x: 940, y: 200 }, tall, 'right', screen)
    expect(right.left).toBeLessThan(940)
    const left = cardAnchor({ x: 8, y: 200 }, tall, 'left', screen)
    expect(left.left).toBe(8 + 52 + 6)
  })
})
