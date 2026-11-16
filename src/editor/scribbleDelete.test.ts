import { describe, expect, it } from 'vitest'
import { strokeBox, within } from './scribbleDelete'

describe('scribble delete (C4)', () => {
  it('the stroke area is the box round its points', () => {
    expect(
      strokeBox([
        { x: 10, y: 5 },
        { x: 30, y: 9 },
        { x: 12, y: 20 },
      ]),
    ).toEqual({ x: 10, y: 5, w: 20, h: 15 })
    expect(strokeBox([{ x: 10, y: 5 }], 2)).toEqual({ x: 8, y: 3, w: 4, h: 4 })
  })
  it('a delete aimed inside the scribbled words is left alone; elsewhere not', () => {
    expect(within(10, 11, [10, 11])).toBe(true)
    expect(within(9, 12, [10, 11])).toBe(true) // a space either side
    expect(within(1, 5, [10, 11])).toBe(false) // the old selection "Text"
  })
})
