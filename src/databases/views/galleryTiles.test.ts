import { describe, expect, it } from 'vitest'
import { dropPlace, stepPlace } from './galleryTiles'

describe('tile places', () => {
  it('drops before the first half of a tile and after the second', () => {
    expect(dropPlace('a', 'b', false)).toEqual({ before: 'b' })
    expect(dropPlace('a', 'b', true)).toEqual({ after: 'b' })
    expect(dropPlace('a', 'a', true)).toBeNull()
  })

  it('moves one step earlier or later, and stops at the ends', () => {
    const ids = ['a', 'b', 'c']
    expect(stepPlace(ids, 'b', -1)).toEqual({ before: 'a' })
    expect(stepPlace(ids, 'b', 1)).toEqual({ after: 'c' })
    expect(stepPlace(ids, 'a', -1)).toBeNull()
    expect(stepPlace(ids, 'c', 1)).toBeNull()
    expect(stepPlace(ids, 'x', 1)).toBeNull()
  })
})
