import { describe, expect, it } from 'vitest'
import { db } from '../core/db'
import {
  DB_LEVEL_PIN,
  UPDATE_LEVEL,
  isMustHaveLevel,
  parseLevel,
  parseReason,
} from './updateLevel'

describe('level compare', () => {
  it('equal level is not must-have', () => {
    expect(isMustHaveLevel(1, 1)).toBe(false)
  })
  it('higher by 1 and by 2 is must-have', () => {
    expect(isMustHaveLevel(2, 1)).toBe(true)
    expect(isMustHaveLevel(3, 1)).toBe(true)
  })
  it('lower, missing, text, negative, fractional are not must-have', () => {
    for (const v of [0, undefined, null, '5', '2', -1, 2.5, NaN, true, {}])
      expect(isMustHaveLevel(v, 1)).toBe(false)
  })
  it('uses the built-in level by default', () => {
    expect(isMustHaveLevel(UPDATE_LEVEL + 1)).toBe(true)
    expect(isMustHaveLevel(UPDATE_LEVEL)).toBe(false)
  })
  it('parseLevel accepts only whole numbers from 0', () => {
    expect(parseLevel(0)).toBe(0)
    expect(parseLevel(7)).toBe(7)
    expect(parseLevel('7')).toBeNull()
    expect(parseLevel(-1)).toBeNull()
  })
  it('reason defaults to storage', () => {
    expect(parseReason('datafix')).toBe('datafix')
    expect(parseReason('storage')).toBe('storage')
    expect(parseReason(undefined)).toBe('storage')
    expect(parseReason('x')).toBe('storage')
  })
})

describe('database version -> level pin', () => {
  it('the current Dexie version is pinned to the current level', () => {
    // Changing this.version(n) in db.ts without raising UPDATE_LEVEL (and
    // adding the pair to DB_LEVEL_PIN) fails here.
    expect(DB_LEVEL_PIN[db.verno]).toBe(UPDATE_LEVEL)
  })
  it('levels never go down as versions go up, and end at the current level', () => {
    const levels = Object.entries(DB_LEVEL_PIN)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, l]) => l)
    expect(levels).toEqual([...levels].sort((a, b) => a - b))
    expect(Math.max(...levels)).toBe(UPDATE_LEVEL)
  })
})
