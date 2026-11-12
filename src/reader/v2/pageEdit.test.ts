import { describe, expect, it } from 'vitest'
import { doneText, planFor } from './pageEdit'

describe('planFor', () => {
  it('moves a page to a new place', () => {
    const p = planFor(5, { kind: 'move', from: 4, to: 1 })!
    expect(p.map((x) => x.from)).toEqual([4, 1, 2, 3, 5])
  })
  it('does nothing for a move onto itself or outside the book', () => {
    expect(planFor(5, { kind: 'move', from: 2, to: 2 })).toBeNull()
    expect(planFor(5, { kind: 'move', from: 0, to: 2 })).toBeNull()
    expect(planFor(5, { kind: 'move', from: 2, to: 6 })).toBeNull()
  })
  it('deletes a page but never the last one', () => {
    expect(planFor(3, { kind: 'delete', at: 2 })!.map((x) => x.from)).toEqual([
      1, 3,
    ])
    expect(planFor(1, { kind: 'delete', at: 1 })).toBeNull()
  })
  it('turns one page by 90 either way', () => {
    const p = planFor(3, { kind: 'turn', at: 2, by: -90 })!
    expect(p.map((x) => x.turn)).toEqual([0, 270, 0])
  })
  it('adds a blank page after a page, or first', () => {
    expect(planFor(2, { kind: 'blank', after: 1 })!.map((x) => x.from)).toEqual(
      [1, null, 2],
    )
    expect(planFor(2, { kind: 'blank', after: 0 })!.map((x) => x.from)).toEqual(
      [null, 1, 2],
    )
    expect(planFor(2, { kind: 'blank', after: 3 })).toBeNull()
  })
  it('says what was done in plain words', () => {
    expect(doneText({ kind: 'move', from: 4, to: 1 })).toBe('Moved page 4')
  })
})
