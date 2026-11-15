import { describe, expect, it } from 'vitest'
import type { Favourite } from '../main/penFavourites'
import { SIZE_DOT_PX, favTypeId, penFavItems, sizeDotPx } from './penRow'

const pen = (type: 'ball' | 'brush', size: 0 | 1 | 2 = 1): Favourite => ({
  tool: 'pen',
  type,
  colour: '#0b6e99',
  size,
  exact: null,
})
const hl: Favourite = {
  tool: 'highlighter',
  type: null,
  colour: '#ffe58a',
  size: 2,
  exact: null,
}

describe('pen row (TB-21a)', () => {
  it('draws the size dot at 6, 9 and 13 px as in the v9 picture', () => {
    expect(SIZE_DOT_PX).toEqual([6, 9, 13])
    expect(sizeDotPx(0)).toBe(6)
    expect(sizeDotPx(1)).toBe(9)
    expect(sizeDotPx(2)).toBe(13)
  })
})

describe('pen favourites on the row (TB-21c)', () => {
  it('lists pens and highlighters in saved order with stable ids', () => {
    const items = penFavItems([pen('ball'), hl, pen('brush', 2)])
    expect(items.map((i) => i.id)).toEqual(['fav0', 'fav1', 'fav2'])
    expect(items.map((i) => i.typeId)).toEqual(['ball', 'highlighter', 'brush'])
  })
  it('names a highlighter favourite "highlighter" and a pen by its type', () => {
    expect(favTypeId(hl)).toBe('highlighter')
    expect(favTypeId(pen('brush'))).toBe('brush')
  })
  it('is empty without favourites', () => {
    expect(penFavItems([])).toEqual([])
  })
})
