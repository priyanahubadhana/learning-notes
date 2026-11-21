// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { reloadLevel, setLevel, setUnlocked } from '../../../settings/level'
import {
  BAR_PREF_IDS,
  BAR_PREF_STARTERS,
  getBarPref,
  resetBarPref,
  setBarPref,
} from './barPrefs'

beforeEach(() => {
  localStorage.clear()
  reloadLevel()
  for (const id of BAR_PREF_IDS) resetBarPref(id)
})

describe('tool bar v9 settings (auto follows the level)', () => {
  it('Beginner: every difference is off; Professional: every one is on', () => {
    setLevel('beginner')
    for (const id of BAR_PREF_IDS) expect(getBarPref(id), id).toBe(false)
    setLevel('professional')
    for (const id of BAR_PREF_IDS) expect(getBarPref(id), id).toBe(true)
  })

  it('a setting set by hand wins over the level, one by one', () => {
    setLevel('beginner')
    setBarPref('toolNames', true)
    expect(getBarPref('toolNames')).toBe(true)
    expect(getBarPref('backToPen')).toBe(false)
    setLevel('professional')
    setBarPref('toolNames', false)
    expect(getBarPref('toolNames')).toBe(false)
    expect(getBarPref('backToPen')).toBe(true)
  })

  it('a Beginner who unlocks the Professional switch gets that part alone', () => {
    setLevel('beginner')
    setUnlocked('tb.eraserOptions', true)
    expect(getBarPref('eraserMenus')).toBe(true)
    expect(getBarPref('biggerLasso')).toBe(false)
  })

  it('the starters: Simple is the Beginner values, Everything on the Professional ones', () => {
    for (const id of BAR_PREF_IDS) {
      expect(BAR_PREF_STARTERS.simple[id]).toBe(false)
      expect(BAR_PREF_STARTERS.everything[id]).toBe(true)
    }
  })
})
