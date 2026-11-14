// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  FLAG_IDS,
  PHASE_PRESETS,
  applyPreset,
  isOn,
  matchingPreset,
  presetFlags,
  reloadFlags,
  resetFlags,
  setFlag,
} from './flags'

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState(null, '', '/')
  reloadFlags()
})

describe('phase-to-switch table (task 0.6)', () => {
  it('lists the presets in order, ending with Everything', () => {
    expect(PHASE_PRESETS.map((p) => p.id)).toEqual([
      'phase1',
      'phase2a',
      'phase2b',
      'phase3',
      'phase4',
      'phase5',
      'phase6',
      'phase7',
      'phase8',
      'everything',
    ])
  })

  it('Phase 1 has exactly the five Phase 1 switches', () => {
    expect([...presetFlags('phase1')].sort()).toEqual(
      [
        'foundation.shell',
        'settings.v3',
        'storage.safety',
        'update.v2',
        'security.m1',
      ].sort(),
    )
  })

  it('each row adds to the rows above it', () => {
    const ids = PHASE_PRESETS.map((p) => p.id)
    for (let i = 1; i < ids.length; i++) {
      const before = presetFlags(ids[i - 1])
      const now = presetFlags(ids[i])
      for (const f of before) expect(now.has(f)).toBe(true)
      expect(now.size).toBeGreaterThan(before.size)
    }
    expect(presetFlags('phase2a').has('toolbar.v8')).toBe(true)
    expect(presetFlags('phase2a').has('page.menus')).toBe(true)
    expect(presetFlags('phase2b').has('textbox.v2')).toBe(true)
    expect(presetFlags('phase3').has('notebooks.v2')).toBe(true)
    expect(presetFlags('phase4').has('search.v2')).toBe(true)
    expect(presetFlags('phase5').has('home.v2')).toBe(true)
    expect(presetFlags('phase5').has('library.v2')).toBe(true)
    expect(presetFlags('phase6').has('review.v2')).toBe(true)
    expect(presetFlags('phase6').has('study.v2')).toBe(true)
    expect(presetFlags('phase7').has('reader.v2')).toBe(true)
    expect(presetFlags('phase8').has('ai.framework')).toBe(true)
    expect(presetFlags('phase7').has('ai.framework')).toBe(false)
  })

  it('Everything is every known switch; every preset uses known switches only', () => {
    expect([...presetFlags('everything')].sort()).toEqual([...FLAG_IDS].sort())
    for (const p of PHASE_PRESETS)
      for (const f of presetFlags(p.id)) expect(FLAG_IDS).toContain(f)
  })
})

describe('applying a preset', () => {
  it('turns exactly that set on and the others off', () => {
    setFlag('reader.v2', true)
    applyPreset('phase2a')
    for (const id of FLAG_IDS)
      expect(isOn(id)).toBe(presetFlags('phase2a').has(id))
    expect(matchingPreset()).toBe('phase2a')
  })

  it('stays after a reload (nothing extra stored)', () => {
    applyPreset('phase3')
    reloadFlags()
    expect(matchingPreset()).toBe('phase3')
  })

  it('changing one single switch afterwards ends the match', () => {
    applyPreset('phase1')
    setFlag('home.v2', true)
    expect(matchingPreset()).toBeNull()
    setFlag('home.v2', false)
    expect(matchingPreset()).toBe('phase1')
  })

  it('choosing another phase replaces the set at once', () => {
    applyPreset('phase1')
    applyPreset('phase4')
    expect(matchingPreset()).toBe('phase4')
    expect(isOn('search.v2')).toBe(true)
  })

  it('resetFlags matches no preset', () => {
    applyPreset('everything')
    resetFlags()
    expect(matchingPreset()).toBeNull()
  })

  it('a switch forced by the web address does not break the exact match', () => {
    window.history.replaceState(null, '', '/?flags=reader.v2')
    reloadFlags()
    applyPreset('phase1')
    expect(isOn('reader.v2')).toBe(false)
    expect(matchingPreset()).toBe('phase1')
  })
})
