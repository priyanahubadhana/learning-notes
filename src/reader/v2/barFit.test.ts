import { describe, expect, it } from 'vitest'
import { fitItems } from './barFit'

const items = [
  { id: 'a', w: 46, rank: 3 },
  { id: 'b', w: 46, rank: 1 },
  { id: 'c', w: 92, rank: 2 },
  { id: 'd', w: 46, rank: 4 },
]

describe('fitItems', () => {
  it('keeps everything when there is room', () => {
    expect([...fitItems(items, 500)].sort()).toEqual(['a', 'b', 'c', 'd'])
  })
  it('drops the highest rank first', () => {
    expect([...fitItems(items, 190)].sort()).toEqual(['a', 'b', 'c'])
    expect([...fitItems(items, 150)].sort()).toEqual(['b', 'c'])
  })
  it('stops at the first one that does not fit (order of ranks is kept)', () => {
    expect([...fitItems(items, 100)]).toEqual(['b'])
  })
  it('keeps nothing when there is no room', () => {
    expect(fitItems(items, 10).size).toBe(0)
    expect(fitItems(items, -5).size).toBe(0)
  })
})
