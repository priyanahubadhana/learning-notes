import { describe, expect, it } from 'vitest'
import { insertAt, moveTo, moveToSlot, removeId, slotAt } from './listEdit'

describe('list editing moves (R7-11)', () => {
  it('moves a row to an index', () => {
    expect(moveTo(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'b'])
    expect(moveTo(['a', 'b', 'c'], 'a', 9)).toEqual(['b', 'c', 'a'])
    expect(moveTo(['a', 'b'], 'zz', 0)).toEqual(['a', 'b'])
  })
  it('moves by drop slot (slots count the rows as they are now)', () => {
    expect(moveToSlot(['a', 'b', 'c'], 'a', 3)).toEqual(['b', 'c', 'a'])
    expect(moveToSlot(['a', 'b', 'c'], 'b', 2)).toEqual(['a', 'b', 'c'])
    expect(moveToSlot(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'b'])
  })
  it('inserts where dropped, removes, never duplicates', () => {
    expect(insertAt(['a', 'b'], 'x', 0)).toEqual(['x', 'a', 'b'])
    expect(insertAt(['a', 'b'], 'x', 1)).toEqual(['a', 'x', 'b'])
    expect(insertAt(['a', 'b'], 'a', 2)).toEqual(['b', 'a'])
    expect(removeId(['a', 'b'], 'a')).toEqual(['b'])
  })
  it('finds the slot under a pointer', () => {
    const rows = [
      { top: 0, bottom: 40 },
      { top: 40, bottom: 80 },
    ]
    expect(slotAt(rows, 5)).toBe(0)
    expect(slotAt(rows, 30)).toBe(1)
    expect(slotAt(rows, 70)).toBe(2)
  })
})
