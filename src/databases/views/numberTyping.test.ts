import { describe, expect, it } from 'vitest'
import { numberTyping } from './columnFilters'

describe('numberTyping', () => {
  it('drops letters and signs while typing a number', () => {
    expect(numberTyping('12abc.5')).toBe('12.5')
    expect(numberTyping('1,200')).toBe('1,200')
    expect(numberTyping('-3.5')).toBe('-3.5')
    expect(numberTyping('4-5')).toBe('45')
    expect(numberTyping('--7')).toBe('-7')
    expect(numberTyping('e+€ ')).toBe('')
  })
})
