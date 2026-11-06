import { describe, expect, it } from 'vitest'
import { parseHash } from '../app/router'
import {
  SPACES,
  isSpace,
  spaceForRoute,
  usableSpace,
  visibleSpaces,
} from './spaces'

describe('spaces', () => {
  it('knows the four spaces', () => {
    expect([...SPACES]).toEqual(['home', 'library', 'notebooks', 'review'])
    expect(isSpace('review')).toBe(true)
    expect(isSpace('finance')).toBe(false)
    expect(isSpace(3)).toBe(false)
  })

  it('maps addresses to spaces', () => {
    const at = (hash: string) => spaceForRoute(parseHash(hash))
    expect(at('#/review')).toBe('review')
    expect(at('#/cards')).toBe('review')
    expect(at('#/search/saved/abc')).toBe('review')
    expect(at('#/page/abc')).toBe('notebooks')
    expect(at('#/notebook/abc')).toBe('notebooks')
    expect(at('#/databases')).toBe('notebooks')
    expect(at('#/calendar')).toBe('notebooks')
    expect(at('#/settings')).toBeNull()
    expect(at('#/data')).toBeNull()
    expect(at('')).toBeNull()
    expect(at('#/nonsense')).toBeNull()
  })

  it('hides spaces but never Notebooks', () => {
    expect(visibleSpaces([])).toEqual([...SPACES])
    expect(visibleSpaces(['home', 'library'])).toEqual(['notebooks', 'review'])
    expect(visibleSpaces(['home', 'library', 'review', 'notebooks'])).toEqual([
      'notebooks',
    ])
  })

  it('falls back to Notebooks when the wanted space is hidden', () => {
    expect(usableSpace('library', ['library'])).toBe('notebooks')
    expect(usableSpace('review', ['library'])).toBe('review')
  })
})
