import { describe, expect, it } from 'vitest'
import { MIN_PICTURE_WIDTH, resizedWidth } from './pictureResize'

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
