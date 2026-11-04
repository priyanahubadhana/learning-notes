import { describe, expect, it } from 'vitest'
import {
  MAX_PATH_PARTS,
  PATH_STYLES,
  collapsePath,
  isPathStyle,
  resolvePathStyle,
} from './pathStyle'

describe('path style', () => {
  it('knows the three styles and rejects anything else', () => {
    expect(PATH_STYLES).toEqual(['simple', 'full', 'page'])
    expect(isPathStyle('full')).toBe(true)
    expect(isPathStyle('Full')).toBe(false)
    expect(isPathStyle(undefined)).toBe(false)
    expect(isPathStyle(3)).toBe(false)
  })

  it('the page wins over the notebook, which wins over the default', () => {
    expect(resolvePathStyle('page', 'full', 'simple')).toBe('page')
    expect(resolvePathStyle(undefined, 'full', 'simple')).toBe('full')
    expect(resolvePathStyle(undefined, undefined, 'page')).toBe('page')
    expect(resolvePathStyle('simple', 'full', 'page')).toBe('simple')
    // A damaged value is ignored, like no choice.
    expect(resolvePathStyle('bogus', 'full', 'simple')).toBe('full')
    expect(resolvePathStyle('bogus', null, 'page')).toBe('page')
  })

  it('every combination of the three scopes follows the order page, notebook, default', () => {
    const opts = [undefined, ...PATH_STYLES]
    for (const page of opts) {
      for (const notebook of opts) {
        for (const fallback of PATH_STYLES) {
          expect(resolvePathStyle(page, notebook, fallback)).toBe(
            page ?? notebook ?? fallback,
          )
        }
      }
    }
  })

  it('collapses the middle of a long path into "…"', () => {
    const short = ['nb', 'a', 'b', 'c']
    expect(collapsePath(short)).toEqual({ head: short, hidden: [], tail: [] })
    const long = ['nb', 'a', 'b', 'c', 'd', 'page']
    expect(long.length).toBeGreaterThan(MAX_PATH_PARTS)
    expect(collapsePath(long)).toEqual({
      head: ['nb'],
      hidden: ['a', 'b', 'c'],
      tail: ['d', 'page'],
    })
    expect(collapsePath(['nb', 'a', 'b', 'c', 'page'])).toEqual({
      head: ['nb'],
      hidden: ['a', 'b'],
      tail: ['c', 'page'],
    })
  })
})
