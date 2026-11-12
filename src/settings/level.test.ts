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
  setUnlocked,
  useLevel,
  useUnlocked,
} from './level'

beforeEach(() => {
  localStorage.clear()
  reloadLevel()
})

describe('pro features list', () => {
  it('has 169 entries with unique ids', () => {
    expect(PRO_FEATURES).toHaveLength(169)
    expect(new Set(PRO_FEATURES.map((f) => f.id)).size).toBe(169)
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
