// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { reloadLevel, setLevel } from './level'
import { settingsRegistry } from './builtinSettings'
import { readDeviceSetting, writeDeviceSetting } from './settingsService'
import { resetBarPref } from '../app/tools/v8/barPrefs'
import { BAR_PREF_IDS } from '../app/tools/v8/barPrefs'
import { t, type MessageKey } from '../i18n/t'

const IDS = [
  'advanced.toolNames',
  'advanced.formatTabs',
  'advanced.backToPen',
  'advanced.eraserMenus',
  'advanced.biggerLasso',
]

beforeEach(() => {
  localStorage.clear()
  reloadLevel()
  for (const id of BAR_PREF_IDS) resetBarPref(id)
})

describe('Tool bar v9 settings (owner answer 2A)', () => {
  it('each difference is its own setting, in Advanced and found under Tool bar', () => {
    for (const id of IDS) {
      const s = settingsRegistry.get(id)
      expect(s, id).toBeDefined()
      expect(s!.category).toBe('advanced')
      expect(s!.alsoIn).toContain('toolbar')
      expect(t(s!.labelKey).length, id).toBeGreaterThan(2)
      expect(t(s!.descriptionKey).length, id).toBeGreaterThan(2)
    }
  })

  it('reads the Beginner values for a Beginner and the Professional ones for a Professional', () => {
    setLevel('beginner')
    expect(
      readDeviceSetting(settingsRegistry.get('advanced.toolNames') as never),
    ).toBe('off')
    expect(
      readDeviceSetting(settingsRegistry.get('advanced.formatTabs') as never),
    ).toBe('3')
    setLevel('professional')
    expect(
      readDeviceSetting(settingsRegistry.get('advanced.toolNames') as never),
    ).toBe('on')
    expect(
      readDeviceSetting(settingsRegistry.get('advanced.formatTabs') as never),
    ).toBe('4')
  })

  it('a change writes only that one part', () => {
    setLevel('beginner')
    writeDeviceSetting(
      settingsRegistry.get('advanced.toolNames') as never,
      'on' as never,
    )
    expect(
      readDeviceSetting(settingsRegistry.get('advanced.toolNames') as never),
    ).toBe('on')
    expect(
      readDeviceSetting(settingsRegistry.get('advanced.backToPen') as never),
    ).toBe('off')
  })

  it('the texts exist in English, Spanish and Hindi', async () => {
    const { esSettings: es } = await import('../i18n/es/settings')
    const { hiSettings: hi } = await import('../i18n/hi/settings')
    for (const id of IDS) {
      const s = settingsRegistry.get(id)!
      for (const key of [s.labelKey, s.descriptionKey] as MessageKey[]) {
        expect((es as Record<string, string>)[key], key).toBeTruthy()
        expect((hi as Record<string, string>)[key], key).toBeTruthy()
      }
    }
  })

  describe('Layout shortcut (owner, 15 Nov)', () => {
    const shortcut = () => settingsRegistry.get('advanced.layoutShortcut')!
    const read = (id: string) =>
      readDeviceSetting(settingsRegistry.get(id) as never)

    it('one tap sets all five rows, single rows can change after', () => {
      setLevel('professional')
      writeDeviceSetting(shortcut() as never, 'beginner' as never)
      expect(IDS.map(read)).toEqual(['off', '3', 'off', 'off', 'off'])
      expect(read('advanced.layoutShortcut')).toBe('beginner')
      writeDeviceSetting(shortcut() as never, 'professional' as never)
      expect(IDS.map(read)).toEqual(['on', '4', 'on', 'on', 'on'])
      expect(read('advanced.layoutShortcut')).toBe('professional')
      writeDeviceSetting(
        settingsRegistry.get('advanced.backToPen') as never,
        'off' as never,
      )
      expect(read('advanced.layoutShortcut')).toBe('custom')
      expect(read('advanced.toolNames')).toBe('on')
    })

    it('sits above the five rows and is in the three languages', async () => {
      const ids = settingsRegistry.inCategory('advanced').map((d) => d.id)
      expect(ids.indexOf('advanced.layoutShortcut')).toBeLessThan(
        ids.indexOf('advanced.toolNames'),
      )
      const { esSettings: es } = await import('../i18n/es/settings')
      const { hiSettings: hi } = await import('../i18n/hi/settings')
      for (const k of [
        'settings.layoutShortcut.label',
        'settings.layoutShortcut.description',
        'settings.layoutShortcut.beginner',
        'settings.layoutShortcut.professional',
      ]) {
        expect((es as Record<string, string>)[k], k).toBeTruthy()
        expect((hi as Record<string, string>)[k], k).toBeTruthy()
      }
    })
  })
})
