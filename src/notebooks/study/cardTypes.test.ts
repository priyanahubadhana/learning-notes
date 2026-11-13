import { describe, expect, it } from 'vitest'
import { CARD_TYPES, isMakeable, offeredTypes } from './cardTypes'

describe('card types (study v2)', () => {
  it('Beginner is offered Question / answer and Blanks only', () => {
    expect(offeredTypes(false).map((t) => t.id)).toEqual(['qa', 'cloze'])
  })
  it('unlocked, all 8 types are offered', () => {
    expect(offeredTypes(true)).toHaveLength(8)
    expect(new Set(CARD_TYPES.map((t) => t.id)).size).toBe(8)
  })
  it('only the types the app can make today are selectable', () => {
    expect(CARD_TYPES.filter((t) => isMakeable(t.id)).map((t) => t.id)).toEqual(
      ['qa', 'cloze'],
    )
  })
})
