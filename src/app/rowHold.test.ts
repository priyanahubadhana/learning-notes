// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { holdInfo, holdJustFired, makeHoldClaimant } from './rowHold'

const row = () => {
  const el = document.createElement('div')
  el.setAttribute('data-hold', 'nb:abc:1')
  const inner = document.createElement('button')
  el.append(inner)
  document.body.append(el)
  return { el, inner }
}
const start = (target: EventTarget, pointerType = 'touch'): never =>
  ({
    pointerId: 1,
    pointerType,
    x: 0,
    y: 0,
    target,
    at: 0,
    doubleTap: false,
  }) as never

describe('row hold claimant (NB-B08)', () => {
  it('reads kind and id from the nearest held row', () => {
    const { el, inner } = row()
    expect(holdInfo(inner)).toEqual({ kind: 'nb', id: 'abc:1', el })
    expect(holdInfo(document.body)).toBeNull()
  })

  it('claims a finger or mouse on a row, never the Pencil', () => {
    const { inner } = row()
    const c = makeHoldClaimant(() => {})
    expect(c.claim(start(inner, 'touch'))).toBe('longpress')
    expect(c.claim(start(inner, 'mouse'))).toBe('longpress')
    expect(c.claim(start(inner, 'pen'))).toBeNull()
    expect(c.claim(start(document.body))).toBeNull()
  })

  it('calls the handler on start and swallows the next click', () => {
    const { el, inner } = row()
    const onHold = vi.fn()
    const c = makeHoldClaimant(onHold)
    expect(holdJustFired()).toBe(false)
    c.onStart?.({
      ...(start(inner) as object),
      kind: 'longpress',
      owner: 'x',
      lastAt: 0,
    } as never)
    expect(onHold).toHaveBeenCalledWith({ kind: 'nb', id: 'abc:1', el })
    expect(holdJustFired()).toBe(true)
    // The next press makes a tap a tap again.
    c.claim(start(inner))
    expect(holdJustFired()).toBe(false)
  })
})
