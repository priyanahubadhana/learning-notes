import { describe, expect, it } from 'vitest'
import {
  GLOW_DEFAULT,
  GLOW_MS,
  GLOW_REDUCED_MS,
  glowMs,
  glowTarget,
  isGlowPref,
} from './glowPref'

describe('glowPref', () => {
  it('starts on', () => expect(GLOW_DEFAULT).toBe(true))
  it('glows 2 s, or a 1.6 s still outline with reduced motion', () => {
    expect(glowMs(false)).toBe(GLOW_MS)
    expect(GLOW_MS).toBe(2000)
    expect(glowMs(true)).toBe(GLOW_REDUCED_MS)
    expect(GLOW_REDUCED_MS).toBe(1600)
  })
  it('names the annotation only when on', () => {
    expect(glowTarget('a1', true)).toBe('a1')
    expect(glowTarget('a1', false)).toBeUndefined()
  })
  it('accepts only booleans', () => {
    expect(isGlowPref(true)).toBe(true)
    expect(isGlowPref('on')).toBe(false)
  })
})
