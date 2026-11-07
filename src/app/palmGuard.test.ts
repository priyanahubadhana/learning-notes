// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { ignoreTouch, penIsDown, resetPalmGuard } from './palmGuard'

function fire(type: string, pointerType: string, pointerId: number) {
  const e = new Event(type, { bubbles: true }) as Event & {
    pointerType: string
    pointerId: number
  }
  e.pointerType = pointerType
  e.pointerId = pointerId
  document.body.dispatchEvent(e)
}

beforeEach(resetPalmGuard)

describe('palm guard', () => {
  it('ignores touches only while the Pencil is down', () => {
    expect(ignoreTouch({ pointerType: 'touch' })).toBe(false)
    fire('pointerdown', 'pen', 1)
    expect(penIsDown()).toBe(true)
    expect(ignoreTouch({ pointerType: 'touch' })).toBe(true)
    // A mouse or the Pencil itself is never ignored.
    expect(ignoreTouch({ pointerType: 'mouse' })).toBe(false)
    expect(ignoreTouch({ pointerType: 'pen' })).toBe(false)
    fire('pointerup', 'pen', 1)
    expect(ignoreTouch({ pointerType: 'touch' })).toBe(false)
  })

  it('a touch pointer cannot end the Pencil, and a lost Pencil is forgotten', () => {
    fire('pointerdown', 'pen', 1)
    fire('pointerup', 'touch', 1)
    expect(penIsDown()).toBe(true)
    expect(penIsDown(Date.now() + 5000)).toBe(false)
  })
})
