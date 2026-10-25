import { describe, expect, it } from 'vitest'
import {
  isStringArray,
  isStringOrNull,
  readPref,
  writePref,
  type PrefStorage,
} from './uiPrefs'

function fakeStorage(): PrefStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  }
}

const throwing: PrefStorage = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('blocked')
  },
}

describe('uiPrefs', () => {
  it('saves and reads back a value', () => {
    const storage = fakeStorage()
    writePref('expanded', ['a', 'b'], storage)
    expect(readPref('expanded', isStringArray, [], storage)).toEqual(['a', 'b'])
  })

  it('falls back when missing, invalid JSON or wrong type', () => {
    const storage = fakeStorage()
    expect(readPref('page', isStringOrNull, null, storage)).toBeNull()

    storage.data.set('learning-notes:page', '{not json')
    expect(readPref('page', isStringOrNull, null, storage)).toBeNull()

    storage.data.set('learning-notes:expanded', '[1, 2]')
    expect(readPref('expanded', isStringArray, [], storage)).toEqual([])
  })

  it('works without storage or when storage throws', () => {
    expect(readPref('x', isStringOrNull, 'fallback', null)).toBe('fallback')
    expect(readPref('x', isStringOrNull, 'fallback', throwing)).toBe('fallback')
    expect(() => writePref('x', 'value', throwing)).not.toThrow()
  })
})
