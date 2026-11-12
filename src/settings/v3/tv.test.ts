import { afterEach, describe, expect, it } from 'vitest'
import { setMessages } from '../../i18n/t'
import { enSettingsV3 } from '../../i18n/en/settingsV3'
import { esSettingsV3 } from '../../i18n/es/settingsV3'
import { hiSettingsV3 } from '../../i18n/hi/settingsV3'
import { tv } from './tv'

afterEach(() => setMessages('en', {}))

const keys = (o: object) => Object.keys(o).sort()
const holes = (s: string) =>
  [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('settings v3 texts (SET-B48)', () => {
  it('en, es and hi have exactly the same keys', () => {
    expect(keys(esSettingsV3)).toEqual(keys(enSettingsV3))
    expect(keys(hiSettingsV3)).toEqual(keys(enSettingsV3))
  })
  it('every language keeps the {placeholders} of the English text', () => {
    for (const [lang, table] of [
      ['es', esSettingsV3],
      ['hi', hiSettingsV3],
    ] as const)
      for (const [k, v] of Object.entries(enSettingsV3))
        expect(
          holes((table as Record<string, string>)[k]!),
          `${lang} ${k}`,
        ).toEqual(holes(v))
  })
  it('no text is empty', () => {
    for (const table of [enSettingsV3, esSettingsV3, hiSettingsV3])
      for (const v of Object.values(table)) expect(v.trim()).not.toBe('')
  })
  it('follows the app language and picks plurals', () => {
    expect(tv('sv3.title')).toBe('Settings')
    expect(tv('sv3.sectionCount', { count: 1 })).toBe('1 setting')
    expect(tv('sv3.sectionCount', { count: 3 })).toBe('3 settings')
    setMessages('es', {})
    expect(tv('sv3.title')).toBe('Ajustes')
    setMessages('hi', {})
    expect(tv('sv3.title')).toBe('सेटिंग्स')
  })
})
