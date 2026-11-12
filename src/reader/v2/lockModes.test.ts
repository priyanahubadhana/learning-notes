import { beforeEach, describe, expect, it } from 'vitest'
import {
  LOCK_MODES,
  activeLock,
  isLockMode,
  isStrong,
  lockAllows,
  lockBlocked,
  lockNudge,
  resolveMode,
  visibleModes,
} from './lockModes'

describe('what each lock mode allows', () => {
  it('Everything works allows all', () => {
    for (const a of [
      'draw',
      'sticky',
      'highlight',
      'editNote',
      'bookmark',
      'listen',
    ] as const)
      expect(lockAllows('all', a)).toBe(true)
  })
  it('Reading mode keeps highlights, notes, bookmarks; no drawing or stickies', () => {
    expect(lockAllows('reading', 'highlight')).toBe(true)
    expect(lockAllows('reading', 'editNote')).toBe(true)
    expect(lockAllows('reading', 'bookmark')).toBe(true)
    expect(lockAllows('reading', 'draw')).toBe(false)
    expect(lockAllows('reading', 'sticky')).toBe(false)
  })
  it('View only and Frozen allow no change at all', () => {
    for (const m of ['view', 'frozen'] as const)
      for (const a of [
        'draw',
        'sticky',
        'highlight',
        'editNote',
        'bookmark',
        'listen',
      ] as const)
        expect(lockAllows(m, a)).toBe(false)
  })
  it('only View only and Frozen need a hold to leave', () => {
    expect(LOCK_MODES.filter(isStrong)).toEqual(['view', 'frozen'])
  })
})

describe('the padlock menu', () => {
  it('lists three modes, and Frozen only with its switch', () => {
    expect(visibleModes(false)).toEqual(['all', 'reading', 'view'])
    expect(visibleModes(true)).toEqual(['all', 'reading', 'view', 'frozen'])
  })
  it('checks a stored value', () => {
    expect(isLockMode('view')).toBe(true)
    expect(isLockMode('nope')).toBe(false)
    expect(isLockMode(undefined)).toBe(false)
  })
})

describe('the mode a book opens in', () => {
  it('uses the book own mode first', () => {
    expect(resolveMode('view', 'reading', true)).toBe('view')
  })
  it('a new book takes the last mode used', () => {
    expect(resolveMode(undefined, 'reading', true)).toBe('reading')
  })
  it('the very first time is Everything works', () => {
    expect(resolveMode(undefined, undefined, true)).toBe('all')
  })
  it('Frozen without its switch acts as View only', () => {
    expect(resolveMode('frozen', undefined, false)).toBe('view')
    expect(resolveMode('frozen', undefined, true)).toBe('frozen')
  })
})

describe('turning a tap away', () => {
  beforeEach(() => {
    activeLock.set('all')
  })
  it('lets it through in Everything works', () => {
    const n = lockNudge.get()
    expect(lockBlocked('draw')).toBe(false)
    expect(lockNudge.get()).toBe(n)
  })
  it('blocks and shakes in View only', () => {
    activeLock.set('view')
    const n = lockNudge.get()
    expect(lockBlocked('listen')).toBe(true)
    expect(lockNudge.get()).toBe(n + 1)
  })
})
