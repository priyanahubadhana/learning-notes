import { describe, expect, it } from 'vitest'
import { REPEAT_AFTER_MS, backspaceStep } from './backspaceHold'

describe('⌫ hold', () => {
  it('repeats after 0.4 s', () => expect(REPEAT_AFTER_MS).toBe(400))
  it('goes from characters to faster characters to words', () => {
    expect(backspaceStep(450)).toEqual({ unit: 'char', next: 80 })
    expect(backspaceStep(1200)).toEqual({ unit: 'char', next: 40 })
    expect(backspaceStep(1600)).toEqual({ unit: 'word', next: 120 })
  })
})
