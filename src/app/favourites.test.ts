// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  MAX_FAVOURITES,
  favourites,
  isFavourite,
  isIdList,
  toggleFavourite,
} from './favourites'

beforeEach(() => {
  localStorage.clear()
  favourites.clearCache()
})

describe('favourites', () => {
  it('stars and unstars a page, newest first', () => {
    expect(toggleFavourite('a')).toBe(true)
    expect(toggleFavourite('b')).toBe(true)
    expect(favourites.get()).toEqual(['b', 'a'])
    expect(isFavourite('a')).toBe(true)
    expect(toggleFavourite('a')).toBe(false)
    expect(favourites.get()).toEqual(['b'])
  })

  it('is remembered on this device', () => {
    toggleFavourite('a')
    favourites.clearCache()
    expect(favourites.get()).toEqual(['a'])
  })

  it('checks stored lists', () => {
    expect(isIdList(['a', 'b'])).toBe(true)
    expect(isIdList(['a', 'a'])).toBe(false)
    expect(isIdList([1])).toBe(false)
    expect(isIdList([''])).toBe(false)
    expect(
      isIdList(Array.from({ length: MAX_FAVOURITES + 1 }, (_, i) => `p${i}`)),
    ).toBe(false)
    localStorage.setItem('learning-notes:favourites', '"nope"')
    favourites.clearCache()
    expect(favourites.get()).toEqual([])
  })
})
