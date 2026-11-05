import { describe, expect, it } from 'vitest'
import { DEFAULT_HOLD_MS, DOUBLE_TAP_MS, TOOL_HOLD_MS } from './mainTools'
import { holdOpensExtras, tapAction } from './newLineGesture'

describe('↵ New line: tap, hold and double-tap', () => {
  it('the default hold is 0.6 s and a tool hold is about 350 ms', () => {
    expect(DEFAULT_HOLD_MS).toBe(600)
    expect(TOOL_HOLD_MS).toBe(350)
  })

  it('a tap always adds a line, unless it is the 2nd tap of a double-tap', () => {
    expect(tapAction('hold', 0, 1000)).toBe('add')
    expect(tapAction('hold', 900, 1000)).toBe('add')
    expect(tapAction('off', 900, 1000)).toBe('add')
    expect(tapAction('doubleTap', 0, 1000)).toBe('add')
    expect(tapAction('doubleTap', 1000 - DOUBLE_TAP_MS + 1, 1000)).toBe(
      'extras',
    )
    expect(tapAction('doubleTap', 1000 - DOUBLE_TAP_MS - 1, 1000)).toBe('add')
  })

  it('only the hold setting opens the extras by holding', () => {
    expect(holdOpensExtras('hold')).toBe(true)
    expect(holdOpensExtras('doubleTap')).toBe(false)
    expect(holdOpensExtras('off')).toBe(false)
  })
})
