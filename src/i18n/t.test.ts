import { afterEach, describe, expect, it } from 'vitest'
import { en } from './en'
import { setMessages, t, type MessageKey } from './t'

afterEach(() => setMessages('en', en))

describe('t()', () => {
  it('returns English text by key', () => {
    expect(t('settings.title')).toBe('Settings')
  })

  it('fills placeholders and formats numbers', () => {
    expect(t('settings.error.number', { min: 0, max: 9999 })).toBe(
      'Enter a whole number from 0 to 9,999.',
    )
  })

  it('picks the plural form for the language', () => {
    expect(t('settings.count', { count: 1 })).toBe('1 setting')
    expect(t('settings.count', { count: 5 })).toBe('5 settings')
  })

  it('uses another language and falls back to English for gaps', () => {
    setMessages('de', { 'settings.title': 'Einstellungen' })
    expect(t('settings.title')).toBe('Einstellungen')
    expect(t('settings.reset')).toBe('Reset to default')
    expect(t('settings.error.number', { min: 0, max: 9999 })).toContain('9.999')
  })

  it('shows the key instead of crashing when text is missing', () => {
    expect(t('missing.key' as MessageKey)).toBe('missing.key')
  })
})
