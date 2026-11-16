import { describe, expect, it } from 'vitest'
import { covers, strokeBox, within } from './scribbleDelete'

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

describe('scribble delete cover check (C24)', () => {
  it('ranges beside the caret do not cover the word; the whole word does', () => {
    expect(covers([[8, 10]], [5, 14])).toBe(false) // 2 letters left of caret
    expect(
      covers(
        [
          [8, 10],
          [10, 12],
        ],
        [5, 14],
      ),
    ).toBe(false)
    expect(covers([[5, 14]], [5, 14])).toBe(true)
    expect(covers([[4, 15]], [5, 14])).toBe(true)
    expect(
      covers(
        [
          [5, 9],
          [9, 14],
        ],
        [5, 14],
      ),
    ).toBe(true)
    expect(covers([], [5, 14])).toBe(false)
  })
})
