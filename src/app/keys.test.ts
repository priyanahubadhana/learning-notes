import { afterEach, describe, expect, it, vi } from 'vitest'
import { altShortcutLabel, shortcutLabel } from './keys'

afterEach(() => vi.unstubAllGlobals())

describe('shortcut labels', () => {
  it('uses Ctrl and Alt on other devices', () => {
    vi.stubGlobal('navigator', { platform: 'Win32' })
    expect(shortcutLabel('K')).toBe('Ctrl+K')
    expect(altShortcutLabel('R')).toBe('Alt+R')
  })

  it('uses ⌘ and ⌥ on an iPad, which calls itself a Mac', () => {
    vi.stubGlobal('navigator', { platform: 'MacIntel' })
    expect(shortcutLabel('K')).toBe('⌘K')
    expect(altShortcutLabel('R')).toBe('⌥R')
  })
})
