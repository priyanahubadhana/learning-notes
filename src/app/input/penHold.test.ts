import { describe, expect, it } from 'vitest'
import {
  PEN_HOLD_MS,
  PEN_HOLD_SLOP_PX,
  holdMsFor,
  holdSlopFor,
} from './penHold'

describe('the Pencil hold (owner, 25 Nov 2026)', () => {
  it('is 0.8 s and about 3 mm (18 px)', () => {
    expect(PEN_HOLD_MS).toBe(800)
    expect(PEN_HOLD_SLOP_PX).toBe(18)
  })
  it('changes the Pencil only: finger and mouse keep their numbers', () => {
    expect(holdMsFor('pen', 500)).toBe(800)
    expect(holdMsFor('touch', 500)).toBe(500)
    expect(holdMsFor('mouse', 600)).toBe(600)
    expect(holdSlopFor('pen', 12)).toBe(18)
    expect(holdSlopFor('touch', 12)).toBe(12)
    expect(holdSlopFor('mouse', 10)).toBe(10)
  })
})
