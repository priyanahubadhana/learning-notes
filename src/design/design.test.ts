import { describe, expect, it } from 'vitest'
import { isDesignTokensRoute } from './designRoute'
import { isAppleDevice } from './loadInter'

describe('design tokens route', () => {
  it('matches only its own address', () => {
    expect(isDesignTokensRoute('#/design-tokens')).toBe(true)
    expect(isDesignTokensRoute('#/design-tokens?x=1')).toBe(true)
    expect(isDesignTokensRoute('#/')).toBe(false)
    expect(isDesignTokensRoute('#/design-tokens-x')).toBe(false)
  })
})

describe('Inter loading', () => {
  it('skips Apple devices (they keep SF) and loads elsewhere', () => {
    expect(isAppleDevice('Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)')).toBe(
      true,
    )
    expect(isAppleDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)')).toBe(
      true,
    )
    expect(isAppleDevice('Mozilla/5.0 (Windows NT 10.0)', 'Win32')).toBe(false)
    expect(isAppleDevice('Mozilla/5.0 (Linux; Android 14)', 'Linux')).toBe(
      false,
    )
  })
})
