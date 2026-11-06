import { describe, expect, it } from 'vitest'
import { settingsRegistry } from './builtinSettings'
import { spaceSettings } from './spaceSettings'

describe('space settings', () => {
  it('has one setting for each hideable space, shown by default', () => {
    expect(Object.keys(spaceSettings).sort()).toEqual([
      'home',
      'library',
      'review',
    ])
    for (const definition of Object.values(spaceSettings)) {
      expect(definition.defaultValue).toBe('show')
      expect(definition.scope).toBe('device')
      expect(definition.isValid('hide')).toBe(true)
      expect(definition.isValid('gone')).toBe(false)
    }
  })

  it('cannot hide Notebooks', () => {
    expect(spaceSettings.notebooks).toBeUndefined()
  })

  it('is listed in Settings, and found by the word "space"', () => {
    const ids = settingsRegistry.list().map((s) => s.id)
    expect(ids).toContain('general.space.home')
    expect(ids).toContain('general.space.review')
  })
})
