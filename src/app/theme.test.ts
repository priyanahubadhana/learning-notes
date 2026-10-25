import { describe, expect, it } from 'vitest'
import { THEMES, editorColorScheme, isTheme } from './theme'
import { readPref, writePref, type PrefStorage } from './uiPrefs'

describe('themes', () => {
  it('recognises only the three themes', () => {
    for (const theme of THEMES) expect(isTheme(theme)).toBe(true)
    for (const bad of ['dark', '', null, 1, undefined]) {
      expect(isTheme(bad)).toBe(false)
    }
  })

  it('uses a dark editor only for Night', () => {
    expect(editorColorScheme('day')).toBe('light')
    expect(editorColorScheme('sepia')).toBe('light')
    expect(editorColorScheme('night')).toBe('dark')
  })

  it('is remembered, and an unknown saved value falls back to Day', () => {
    const data = new Map<string, string>()
    const storage: PrefStorage = {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
    }
    writePref('theme', 'sepia', storage)
    // Same key + JSON format that the index.html startup script reads.
    expect(data.get('learning-notes:theme')).toBe('"sepia"')
    expect(readPref('theme', isTheme, 'day', storage)).toBe('sepia')

    data.set('learning-notes:theme', '"neon"')
    expect(readPref('theme', isTheme, 'day', storage)).toBe('day')
  })
})
