import { describe, expect, it } from 'vitest'
import {
  MIN_PICTURE_WIDTH,
  badWidthIds,
  presetWidth,
  resizedWidth,
  startWidth,
  tween,
} from './pictureResize'

describe('resizedWidth', () => {
  it('grows when a corner is pulled away from the centre', () => {
    expect(resizedWidth(300, 'se', 50, 10, 900)).toBe(350)
    expect(resizedWidth(300, 'ne', 40, -10, 900)).toBe(340)
    expect(resizedWidth(300, 'sw', -60, 5, 900)).toBe(360)
    expect(resizedWidth(300, 'nw', -30, -80, 900)).toBe(380) // up wins
  })

  it('shrinks when pulled inwards, never below the smallest size', () => {
    expect(resizedWidth(300, 'se', -100, 0, 900)).toBe(200)
    expect(resizedWidth(300, 'se', -900, 0, 900)).toBe(MIN_PICTURE_WIDTH)
  })

  it('stops at the width of the page', () => {
    expect(resizedWidth(300, 'se', 900, 0, 640)).toBe(640)
    expect(resizedWidth(300, 'se', 10, 0, 20)).toBe(MIN_PICTURE_WIDTH)
  })

  it('a centred picture follows the finger on both sides', () => {
    expect(resizedWidth(300, 'se', 50, 0, 900, true)).toBe(400)
  })
})

describe('width guards (9 Nov picture bug)', () => {
  it('never returns 0, negative or NaN', () => {
    for (const bad of [NaN, 0, -5, Infinity]) {
      const w = resizedWidth(bad, 'se', -500, NaN, 900)
      expect(Number.isFinite(w) && w >= MIN_PICTURE_WIDTH).toBe(true)
    }
    expect(resizedWidth(300, 'se', NaN, NaN, NaN)).toBe(300)
  })
  it('startWidth takes the first measurable size', () => {
    expect(startWidth(0, NaN, null, 240)).toBe(240)
    expect(startWidth(0, NaN)).toBeNull()
  })
  it('presets give a safe width', () => {
    expect(presetWidth('smaller', 500, 900, 800)).toBe(300)
    expect(presetWidth('bigger', 500, 640, 800)).toBe(640)
    expect(presetWidth('fit', 500, 640, 800)).toBe(640)
    expect(presetWidth('natural', 500, 900, 800)).toBe(800)
    expect(presetWidth('smaller', 0, 900, 0)).toBe(MIN_PICTURE_WIDTH)
  })
  it('tween eases from start to end', () => {
    expect(tween(100, 200, 0)).toBe(100)
    expect(tween(100, 200, 1)).toBe(200)
    expect(tween(100, 200, 0.5)).toBeGreaterThan(150)
  })
  it('finds saved widths that are wrong', () => {
    expect(
      badWidthIds([
        { id: 'a', type: 'image', props: { previewWidth: 0 } },
        { id: 'b', type: 'image', props: { previewWidth: 300 } },
        { id: 'c', type: 'image', props: {} },
        { id: 'd', type: 'image', props: { previewWidth: NaN } },
        { id: 'e', type: 'paragraph', props: { previewWidth: 0 } },
      ]),
    ).toEqual(['a', 'd'])
  })
})
