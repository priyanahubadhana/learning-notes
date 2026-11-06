import { describe, expect, it } from 'vitest'
import { clampPos, isFreePos, isNewSelection } from './miniBarPrefs'

const doc = {}
describe('mini bar placement', () => {
  it('a format change (new document, same words) is not a new selection', () => {
    const a = { from: 1, to: 6, doc, text: 'hello' }
    expect(isNewSelection(a, { ...a, doc: {} })).toBe(false)
    expect(isNewSelection(a, { ...a, doc: {}, text: 'other' })).toBe(true)
    expect(isNewSelection(a, { ...a, to: 8 })).toBe(true)
    expect(isNewSelection(null, a)).toBe(true)
  })
  it('keeps a dragged bar on the screen', () => {
    const size = { width: 200, height: 50 }
    const screen = { width: 1000, height: 800 }
    expect(clampPos({ left: -50, top: -5 }, size, screen)).toEqual({
      left: 108,
      top: 8,
    })
    expect(clampPos({ left: 5000, top: 5000 }, size, screen)).toEqual({
      left: 892,
      top: 742,
    })
  })
  it('validates a saved place', () => {
    expect(isFreePos(null)).toBe(true)
    expect(isFreePos({ left: 1, top: 2 })).toBe(true)
    expect(isFreePos({ left: 'x', top: 2 })).toBe(false)
  })
})
