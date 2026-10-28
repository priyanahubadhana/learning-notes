import { afterEach, describe, expect, it } from 'vitest'
import { es } from './es'
import { hi } from './hi'
import { displayName } from './defaultNames'
import { setMessages } from './t'

afterEach(() => setMessages('en', {}))

describe('displayName', () => {
  it('shows the app’s own names in the chosen language, nothing else', () => {
    setMessages('es', es)
    expect(displayName('Study notes')).toBe('Apuntes de estudio')
    expect(displayName('Daily journal')).toBe('Diario')
    expect(displayName('New notebook')).toBe('Cuaderno nuevo')
    expect(displayName('Lesson')).toBe('Lección')
    expect(displayName('My own page')).toBe('My own page')
    expect(displayName('toString')).toBe('toString')
    setMessages('hi', hi)
    expect(displayName('Daily journal')).toBe('रोज़ की डायरी')
  })

  it('is the English name in English', () => {
    expect(displayName('Study notes')).toBe('Study notes')
  })
})
