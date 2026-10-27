import { afterEach, describe, expect, it } from 'vitest'
import { shortDayLabel } from '../journal/dates'
import { dateLocale, setDateStyle } from './t'

afterEach(() => setDateStyle('auto'))

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
})
