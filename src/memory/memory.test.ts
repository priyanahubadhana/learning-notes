import { describe, expect, it } from 'vitest'
import { acronymOf, chunkAcronym, listItems } from './acronym'
import { splitNumber, wordDigits, wordsFor } from './majorSystem'

describe('major system', () => {
  it('encodes words by their consonant sounds', () => {
    expect(wordDigits('sea')).toBe('0')
    expect(wordDigits('tie')).toBe('1')
    expect(wordDigits('moon')).toBe('32')
    expect(wordDigits('rain')).toBe('42')
    expect(wordDigits('knife')).toBe('28')
    expect(wordDigits('bottle')).toBe('915')
    expect(wordDigits('church')).toBe('646')
    expect(wordDigits('cake')).toBe('77')
    expect(wordDigits('lamb')).toBe('53')
    expect(wordDigits('fox')).toBe('870')
  })
  it('finds words for a number, picks first', () => {
    expect(wordsFor('32')).toContain('moon')
    expect(wordsFor('32', { '32': ['mine'] })[0]).toBe('mine')
  })
  it('splits a long number into pieces with ideas', () => {
    const pieces = splitNumber('3 2-1')
    expect(pieces.map((p) => p.digits).join('')).toBe('321')
    expect(splitNumber('abc')).toEqual([])
  })
})

describe('acronym builder', () => {
  it('strips bullets and numbers', () => {
    expect(listItems('1. Red\n- Orange\n\n• Yellow')).toEqual([
      'Red',
      'Orange',
      'Yellow',
    ])
  })
  it('takes first letters', () => {
    expect(acronymOf(['Red', 'orange', ' Yellow'])).toBe('ROY')
  })
  it('chunks long acronyms without a lone letter', () => {
    expect(chunkAcronym('ROY')).toEqual(['ROY'])
    expect(chunkAcronym('ROYGBIV')).toEqual(['ROY', 'GBIV'])
    expect(chunkAcronym('ROYGBIVX')).toEqual(['ROY', 'GBI', 'VX'])
  })
})
