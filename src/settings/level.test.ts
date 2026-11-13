// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { parseProFeatures } from '../../scripts/gen-pro-features.mjs'
import { PRO_FEATURES } from './proFeatures.gen'
import {
  getLevel,
  isUnlocked,
  LEVEL_STORAGE_KEY,
  reloadLevel,
  setLevel,
  setProOff,
  proOffIds,
  isProOff,
  DEFAULT_OFF,
  setUnlocked,
  useLevel,
  useUnlocked,
} from './level'

beforeEach(() => {
  localStorage.clear()
  reloadLevel()
})

describe('pro features list', () => {
  it('has 219 entries with unique ids', () => {
    expect(PRO_FEATURES).toHaveLength(219)
    expect(new Set(PRO_FEATURES.map((f) => f.id)).size).toBe(219)
  })

  it('matches docs/mockups/pro-features.md', () => {
    const md = readFileSync('docs/mockups/pro-features.md', 'utf8')
    expect(PRO_FEATURES.map((f) => ({ ...f }))).toEqual(parseProFeatures(md))
  })
})

describe('level', () => {
  it('defaults to Professional with everything unlocked', () => {
    expect(getLevel()).toBe('professional')
    expect(isUnlocked('nb.move')).toBe(true)
  })

  it('Beginner unlocks only the features switched on', () => {
    setLevel('beginner')
    expect(getLevel()).toBe('beginner')
    expect(isUnlocked('nb.move')).toBe(false)
    setUnlocked('nb.move', true)
    expect(isUnlocked('nb.move')).toBe(true)
    expect(isUnlocked('nb.find')).toBe(false)
    setUnlocked('nb.move', false)
    expect(isUnlocked('nb.move')).toBe(false)
  })

  it('is remembered after a reload', () => {
    setLevel('beginner')
    setUnlocked('nb.find', true)
    reloadLevel()
    expect(getLevel()).toBe('beginner')
    expect(isUnlocked('nb.find')).toBe(true)
    expect(isUnlocked('nb.move')).toBe(false)
  })

  it('ignores broken or unknown stored data', () => {
    localStorage.setItem(LEVEL_STORAGE_KEY, '{nope')
    reloadLevel()
    expect(getLevel()).toBe('professional')
    localStorage.setItem(
      LEVEL_STORAGE_KEY,
      '{"level":"beginner","unlocked":["nb.find","gone.x",3]}',
    )
    reloadLevel()
    expect(getLevel()).toBe('beginner')
    expect(isUnlocked('nb.find')).toBe(true)
    localStorage.setItem(LEVEL_STORAGE_KEY, '{"level":"wizard"}')
    reloadLevel()
    expect(getLevel()).toBe('professional')
  })

  it('hooks follow changes', () => {
    ;(
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    const host = document.createElement('div')
    const Probe = () =>
      createElement('span', null, `${useLevel()} ${useUnlocked('nb.move')}`)
    const root = createRoot(host)
    act(() => root.render(createElement(Probe)))
    expect(host.textContent).toBe('professional true')
    act(() => setLevel('beginner'))
    expect(host.textContent).toBe('beginner false')
    act(() => setUnlocked('nb.move', true))
    expect(host.textContent).toBe('beginner true')
    act(() => root.unmount())
  })
})

describe('Professional: each switch can be turned off by itself (SET-B20)', () => {
  it('the level is the default, a switch is a stored override', () => {
    expect(isUnlocked('nb.move')).toBe(true)
    setProOff('nb.move', true)
    expect(isUnlocked('nb.move')).toBe(false)
    expect(isUnlocked('nb.find')).toBe(true)
    expect(proOffIds()).toEqual(['nb.move'])
    setProOff('nb.move', false)
    expect(isUnlocked('nb.move')).toBe(true)
  })

  it('is remembered after a reload and does not touch the Beginner choices', () => {
    setUnlocked('nb.find', true)
    setProOff('nb.move', true)
    reloadLevel()
    expect(isUnlocked('nb.move')).toBe(false)
    expect(isUnlocked('nb.find')).toBe(true)
    setLevel('beginner')
    expect(isUnlocked('nb.move')).toBe(false)
    expect(isUnlocked('nb.find')).toBe(true)
    setLevel('professional')
    expect(isUnlocked('nb.move')).toBe(false)
  })

  it('every one of the 219 switches can be turned off alone', () => {
    // Switches that start off (DEFAULT_OFF, PM-44) are off before and after.
    const startOff = PRO_FEATURES.filter((g) => !isUnlocked(g.id)).length
    expect(startOff).toBe(DEFAULT_OFF.size)
    for (const f of PRO_FEATURES) {
      setProOff(f.id, true)
      expect(isUnlocked(f.id)).toBe(false)
      expect(PRO_FEATURES.filter((g) => !isUnlocked(g.id))).toHaveLength(
        DEFAULT_OFF.has(f.id) ? startOff : startOff + 1,
      )
      setProOff(f.id, DEFAULT_OFF.has(f.id))
    }
    expect(
      PRO_FEATURES.every((f) => isUnlocked(f.id) !== DEFAULT_OFF.has(f.id)),
    ).toBe(true)
  })

  it('a default-off switch starts off; the Professional switch turns it on and off again (PM-44)', () => {
    expect(isUnlocked('page.pastedChip')).toBe(false)
    expect(isProOff('page.pastedChip')).toBe(true)
    setProOff('page.pastedChip', false)
    expect(isUnlocked('page.pastedChip')).toBe(true)
    expect(isProOff('page.pastedChip')).toBe(false)
    reloadLevel()
    expect(isUnlocked('page.pastedChip')).toBe(true)
    setProOff('page.pastedChip', true)
    expect(isUnlocked('page.pastedChip')).toBe(false)
    expect(isProOff('page.pastedChip')).toBe(true)
  })

  it('ignores unknown stored overrides', () => {
    localStorage.setItem(
      LEVEL_STORAGE_KEY,
      '{"level":"professional","unlocked":[],"off":["nb.move","gone.x",3]}',
    )
    reloadLevel()
    expect(proOffIds()).toEqual(['nb.move'])
  })
})
