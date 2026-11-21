import { describe, expect, it } from 'vitest'
import {
  FONT_QUICK,
  LIST_CHOICES,
  MORE_FONTS,
  SIZE_MAX,
  SIZE_MIN,
  clampSize,
  scaleSizes,
  stepSize,
} from './oneBarModel'
import { BUILT_IN_FONTS } from '../../app/reading/readingPrefs'

describe('size (any number)', () => {
  it('keeps any whole number between the limits', () => {
    expect(clampSize(37)).toBe(37)
    expect(clampSize(16.4)).toBe(16)
    expect(clampSize(1)).toBe(SIZE_MIN)
    expect(clampSize(5000)).toBe(SIZE_MAX)
    expect(clampSize(Number.NaN)).toBe(16)
  })
  it('minus and plus move one step', () => {
    expect(stepSize(16, 1)).toBe(17)
    expect(stepSize(16, -1)).toBe(15)
    expect(stepSize(SIZE_MIN, -1)).toBe(SIZE_MIN)
  })
})

describe('fonts', () => {
  it('the three quick fonts are Easy to read, Classic, Handwritten', () => {
    expect(FONT_QUICK.map((f) => [f.name, f.id])).toEqual([
      ['Easy to read', 'atkinson'],
      ['Classic', 'literata'],
      ['Handwritten', 'patrick'],
    ])
  })
  it('More fonts keeps every other existing font: none is dropped', () => {
    const all = new Set([...FONT_QUICK.map((f) => f.id), ...MORE_FONTS])
    for (const f of BUILT_IN_FONTS) expect(all.has(f)).toBe(true)
  })
})

describe('lists', () => {
  it('Bullets, Numbers, Checklist, Star, Toggle in that order', () => {
    expect(LIST_CHOICES.map((l) => l.id)).toEqual([
      'bullets',
      'numbers',
      'checklist',
      'star',
      'toggle',
    ])
  })
})

describe('a size for the whole box', () => {
  it('scales every block by the same ratio: headings stay bigger', () => {
    expect(scaleSizes([16, 32, 24], 32)).toEqual([32, 64, 48])
    expect(scaleSizes([16, 32], 8)).toEqual([8, 16])
  })
  it('keeps a lone block exactly at the number', () => {
    expect(scaleSizes([19], 37)).toEqual([37])
    expect(scaleSizes([], 20)).toEqual([])
  })
})
