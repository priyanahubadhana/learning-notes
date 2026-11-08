import { describe, expect, it } from 'vitest'
import { ICON_EMOJI, iconName, iconSymbol } from './iconNames'
import { ICON_SHAPES } from './iconShapes'
import { answerRules, safeIcon } from './skillFormat'

describe('open icon set', () => {
  it('has shapes and an emoji fallback for every name, and no brand icons', () => {
    const names = Object.keys(ICON_EMOJI)
    expect(names.length).toBeGreaterThan(40)
    expect(Object.keys(ICON_SHAPES).sort()).toEqual([...names].sort())
    for (const n of names) {
      expect(ICON_EMOJI[n]).not.toBe('')
      expect(ICON_SHAPES[n].length).toBeGreaterThan(0)
    }
    expect(
      names.some((n) => /adobe|google|apple|facebook|github/.test(n)),
    ).toBe(false)
  })

  it('accepts emoji and known lucide names only', () => {
    expect(safeIcon('lucide:brain')).toBe('lucide:brain')
    expect(safeIcon('lucide:nope')).toBe('')
    expect(safeIcon('lucide:constructor')).toBe('')
    expect(safeIcon('🔋')).toBe('🔋')
    expect(safeIcon('<b>x</b>')).toBe('')
  })

  it('turns a drawn icon into its emoji for saved text', () => {
    expect(iconName('lucide:brain')).toBe('brain')
    expect(iconSymbol('lucide:brain')).toBe('🧠')
    expect(iconSymbol('lucide:bad')).toBe('')
    expect(iconSymbol('🔋')).toBe('🔋')
  })

  it('tells the AI the names', () => {
    expect(answerRules(['summary'])).toContain('lucide:name')
  })
})
