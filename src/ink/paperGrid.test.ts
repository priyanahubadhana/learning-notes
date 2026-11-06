import { describe, expect, it } from 'vitest'
import { lineStepOf } from './paperGrid'

describe('lineStepOf', () => {
  it('uses the computed line height in px', () => {
    expect(lineStepOf('24.8px', '16px')).toBe(24.8)
  })
  it('treats "normal" as 1.5 x the font size', () => {
    expect(lineStepOf('normal', '16px')).toBe(24)
  })
  it('stays within a sane range', () => {
    expect(lineStepOf('2px', '16px')).toBe(12)
    expect(lineStepOf('400px', '16px')).toBe(80)
  })
})
