import { describe, expect, it } from 'vitest'
import {
  canKeepOriginal,
  ORIGINAL_CAP_BYTES,
  originalCapNotice,
} from './originalCopy'

describe('original copy cap (200 MB)', () => {
  it('keeps the first copy up to exactly 200 MB', () => {
    expect(ORIGINAL_CAP_BYTES).toBe(200_000_000)
    expect(canKeepOriginal(0)).toBe(true)
    expect(canKeepOriginal(ORIGINAL_CAP_BYTES)).toBe(true)
    expect(originalCapNotice(5_000_000)).toBeNull()
  })

  it('does not keep it above the cap and says so in plain words', () => {
    expect(canKeepOriginal(ORIGINAL_CAP_BYTES + 1)).toBe(false)
    const text = originalCapNotice(250_000_000)
    expect(text).toContain('250')
    expect(text).toContain('200 MB')
    expect(text).toMatch(/Undo/)
  })

  it('treats a bad size as too big to keep', () => {
    expect(canKeepOriginal(NaN)).toBe(false)
    expect(canKeepOriginal(-1)).toBe(false)
  })
})
