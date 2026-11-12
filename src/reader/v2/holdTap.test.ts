import { describe, expect, it } from 'vitest'
import { createHoldTap } from './holdTap'

describe('Listen hold vs tap (RD-B11, RD-B12)', () => {
  it('a plain tap is not swallowed', () => {
    const h = createHoldTap(() => 0)
    expect(h.swallowClick()).toBe(false)
  })

  it('the click after a hold is swallowed once, so it never starts playback', () => {
    let now = 1000
    const h = createHoldTap(() => now)
    h.hold()
    now += 2000 // finger stays down a long while
    h.end()
    now += 20
    expect(h.swallowClick()).toBe(true)
    expect(h.swallowClick()).toBe(false) // the next real tap works
  })

  it('a click that never comes does not eat a later tap', () => {
    let now = 0
    const h = createHoldTap(() => now)
    h.hold()
    h.end()
    now += 5000
    expect(h.swallowClick()).toBe(false)
  })

  it('a gesture that never held changes nothing', () => {
    const h = createHoldTap(() => 0)
    h.end()
    expect(h.swallowClick()).toBe(false)
  })
})
