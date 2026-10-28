import { afterEach, describe, expect, it } from 'vitest'
import { shortDayLabel } from '../journal/dates'
import { en } from './en'
import { dateLocale, setDateStyle, setMessages } from './t'

afterEach(() => {
  setDateStyle('auto')
  setMessages('en', en)
})

describe('date style', () => {
  it('follows the chosen style everywhere dates are written', () => {
    setDateStyle('dayFirst')
    expect(dateLocale()).toBe('en-GB')
    expect(shortDayLabel('2026-10-27')).toBe('Tue 27 Oct')
    setDateStyle('monthFirst')
    expect(dateLocale()).toBe('en-US')
    expect(shortDayLabel('2026-10-27')).toBe('Tue, Oct 27')
    setDateStyle('auto')
    expect(dateLocale()).toMatch(/^en/)
  })

  it('keeps the app language for dates, whatever the style', () => {
    setMessages('es', {})
    setDateStyle('dayFirst')
    expect(shortDayLabel('2026-10-28')).toMatch(/oct/i)
    expect(shortDayLabel('2026-10-28')).not.toMatch(/Wed/)
  })
})
